package com.claimgrid.websocket;

import com.claimgrid.entity.Player;
import com.claimgrid.repository.PlayerRepository;
import com.claimgrid.websocket.event.PlayerJoinedEvent;
import com.claimgrid.websocket.event.PlayerLeftEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;

/**
 * Native Spring WebSocket handler for /ws/game.
 *
 * Handles session lifecycle, presence tracking (PLAYER_JOINED / PLAYER_LEFT),
 * ping/pong keepalives, and safely isolates malformed messages without terminating connections.
 */
@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocketHandler.class);

    private final GameSessionManager sessionManager;
    private final PlayerRepository playerRepository;
    private final ObjectMapper objectMapper;

    public GameWebSocketHandler(GameSessionManager sessionManager,
                                PlayerRepository playerRepository,
                                ObjectMapper objectMapper) {
        this.sessionManager = sessionManager;
        this.playerRepository = playerRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        UUID playerId = extractPlayerId(session.getUri());

        if (playerId != null) {
            Optional<Player> playerOpt = playerRepository.findById(playerId);
            if (playerOpt.isPresent()) {
                Player player = playerOpt.get();
                boolean alreadyConnected = sessionManager.isPlayerConnected(playerId);
                sessionManager.registerSession(session, playerId);

                // Broadcast PLAYER_JOINED only if this is the player's first active connection
                if (!alreadyConnected) {
                    sessionManager.broadcast(PlayerJoinedEvent.builder()
                            .playerId(player.getId())
                            .playerName(player.getUsername())
                            .color(player.getColor())
                            .build());
                    log.info("Broadcasted PLAYER_JOINED for player '{}' ({})", player.getUsername(), playerId);
                }
                return;
            } else {
                log.warn("WebSocket connected with non-existent playerId: {}", playerId);
            }
        }

        // Register as spectator if anonymous or player not found
        sessionManager.registerSession(session, null);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        try {
            JsonNode jsonNode = objectMapper.readTree(payload);
            String type = jsonNode.path("type").asText("");

            if ("PING".equalsIgnoreCase(type)) {
                session.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
            } else {
                log.debug("Received WebSocket message type '{}' from session {}", type, session.getId());
            }
        } catch (Exception e) {
            log.warn("Received malformed WebSocket message from session {}: {}", session.getId(), e.getMessage());
            // Malformed messages are logged and safely ignored without crashing or closing other sessions
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID leftPlayerId = sessionManager.removeSession(session);
        if (leftPlayerId != null) {
            sessionManager.broadcast(PlayerLeftEvent.builder()
                    .playerId(leftPlayerId)
                    .build());
            log.info("Broadcasted PLAYER_LEFT for player {}", leftPlayerId);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.warn("Transport error for session {}: {}", session.getId(), exception.getMessage());
        try {
            session.close();
        } catch (Exception ignored) {
        }
        afterConnectionClosed(session, CloseStatus.SERVER_ERROR);
    }

    private UUID extractPlayerId(URI uri) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }

        String query = uri.getQuery();
        for (String param : query.split("&")) {
            String[] pair = param.split("=");
            if (pair.length == 2 && "playerId".equalsIgnoreCase(pair[0])) {
                try {
                    return UUID.fromString(pair[1]);
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid playerId in WebSocket query string: {}", pair[1]);
                    return null;
                }
            }
        }
        return null;
    }
}

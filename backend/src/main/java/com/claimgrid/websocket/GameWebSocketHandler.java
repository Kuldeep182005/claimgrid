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
 * Scopes connections to game sessions using the query parameter ?playerId=...&gameId=...
 * to enforce event isolation between battles.
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
        UUID playerId = extractUuidParam(session.getUri(), "playerId");
        UUID gameId = extractUuidParam(session.getUri(), "gameId");

        if (playerId != null) {
            Optional<Player> playerOpt = playerRepository.findById(playerId);
            if (playerOpt.isPresent()) {
                Player player = playerOpt.get();
                boolean alreadyConnected = sessionManager.isPlayerConnected(playerId);
                sessionManager.registerSession(session, playerId, gameId);

                // Broadcast PLAYER_JOINED scoped to the game session if gameId is present
                if (!alreadyConnected) {
                    PlayerJoinedEvent event = PlayerJoinedEvent.builder()
                            .gameId(gameId)
                            .playerId(player.getId())
                            .playerName(player.getUsername())
                            .color(player.getColor())
                            .build();

                    if (gameId != null) {
                        sessionManager.broadcastToGame(gameId, event);
                    } else {
                        sessionManager.broadcast(event);
                    }
                    log.info("Broadcasted PLAYER_JOINED for player '{}' ({}) in game {}", player.getUsername(), playerId, gameId);
                }
                return;
            } else {
                log.warn("WebSocket connected with non-existent playerId: {}", playerId);
            }
        }

        // Register as spectator
        sessionManager.registerSession(session, null, gameId);
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
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        GameSessionManager.SessionRemovalResult result = sessionManager.removeSession(session);
        if (result.lastSessionForPlayer()) {
            PlayerLeftEvent event = PlayerLeftEvent.builder()
                    .gameId(result.gameId())
                    .playerId(result.playerId())
                    .build();

            if (result.gameId() != null) {
                sessionManager.broadcastToGame(result.gameId(), event);
            } else {
                sessionManager.broadcast(event);
            }
            log.info("Broadcasted PLAYER_LEFT for player {} in game {}", result.playerId(), result.gameId());
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

    private UUID extractUuidParam(URI uri, String paramName) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }

        String query = uri.getQuery();
        for (String param : query.split("&")) {
            String[] pair = param.split("=");
            if (pair.length == 2 && paramName.equalsIgnoreCase(pair[0])) {
                try {
                    return UUID.fromString(pair[1]);
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid {} in WebSocket query string: {}", paramName, pair[1]);
                    return null;
                }
            }
        }
        return null;
    }
}

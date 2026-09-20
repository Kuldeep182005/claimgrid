package com.claimgrid.websocket;

import com.claimgrid.entity.Player;
import com.claimgrid.config.GameProperties;
import com.claimgrid.entity.GameSession;
import com.claimgrid.entity.GameStatus;
import com.claimgrid.dto.ReactionType;
import com.claimgrid.repository.GameSessionRepository;
import com.claimgrid.repository.PlayerRepository;
import com.claimgrid.websocket.event.ChatMessageEvent;
import com.claimgrid.websocket.event.CommsErrorEvent;
import com.claimgrid.websocket.event.PlayerReactionEvent;
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
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

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
    private final GameSessionRepository gameSessionRepository;
    private final GameProperties gameProperties;
    private final ConcurrentHashMap<UUID, Long> lastChatAt = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, Long> lastReactionAt = new ConcurrentHashMap<>();

    public GameWebSocketHandler(GameSessionManager sessionManager,
                                PlayerRepository playerRepository,
                                ObjectMapper objectMapper,
                                GameSessionRepository gameSessionRepository,
                                GameProperties gameProperties) {
        this.sessionManager = sessionManager;
        this.playerRepository = playerRepository;
        this.objectMapper = objectMapper;
        this.gameSessionRepository = gameSessionRepository;
        this.gameProperties = gameProperties;
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
                            .onlineCount(sessionManager.getOnlinePlayerCount())
                            .build();

                    if (gameId != null) {
                        sessionManager.broadcastToGame(gameId, event);
                    } else {
                        sessionManager.broadcast(event);
                    }
                    log.info("Broadcasted PLAYER_JOINED for player '{}' ({}) in game {} (online: {})",
                            player.getUsername(), playerId, gameId, event.getOnlineCount());
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
            } else if ("SEND_CHAT_MESSAGE".equalsIgnoreCase(type)) {
                handleChat(session, jsonNode);
            } else if ("SEND_REACTION".equalsIgnoreCase(type)) {
                handleReaction(session, jsonNode);
            } else {
                log.debug("Received WebSocket message type '{}' from session {}", type, session.getId());
            }
        } catch (Exception e) {
            log.warn("Received malformed WebSocket message from session {}: {}", session.getId(), e.getMessage());
        }
    }

    private void handleChat(WebSocketSession socket, JsonNode command) throws Exception {
        GameContext context = context(socket, command);
        if (context == null) return;
        String text = command.path("message").asText("").trim();
        if (text.isEmpty() || text.length() > 120) {
            error(socket, "INVALID_MESSAGE", "Message must contain 1-120 non-whitespace characters");
            return;
        }
        if (!allowed(lastChatAt, context.playerId(), gameProperties.getChatRateLimitMs())) {
            error(socket, "RATE_LIMITED", "Chat messages are limited to once per second");
            return;
        }
        sessionManager.broadcastToGame(context.gameId(), ChatMessageEvent.builder()
                .gameId(context.gameId()).playerId(context.playerId()).playerName(context.player().getUsername())
                .message(text).timestamp(Instant.now()).build());
    }

    private void handleReaction(WebSocketSession socket, JsonNode command) throws Exception {
        GameContext context = context(socket, command);
        if (context == null) return;
        String reaction = command.path("reaction").asText("");
        ReactionType reactionType;
        try {
            reactionType = ReactionType.valueOf(reaction);
        } catch (IllegalArgumentException e) {
            error(socket, "INVALID_REACTION", "Reaction must be one of THUMBS_UP, THUMBS_DOWN, LAUGH, CRY");
            return;
        }
        if (!allowed(lastReactionAt, context.playerId(), gameProperties.getReactionRateLimitMs())) {
            error(socket, "RATE_LIMITED", "Reactions are limited to once per 500ms");
            return;
        }
        sessionManager.broadcastToGame(context.gameId(), PlayerReactionEvent.builder()
                .gameId(context.gameId()).playerId(context.playerId()).playerName(context.player().getUsername())
                .reaction(reactionType).timestamp(Instant.now()).build());
    }

    private GameContext context(WebSocketSession socket, JsonNode command) throws Exception {
        UUID playerId = sessionManager.getPlayerId(socket);
        UUID gameId = sessionManager.getGameId(socket);
        if (playerId == null || gameId == null) {
            error(socket, "NOT_IN_GAME", "A player in a game session is required");
            return null;
        }
        String requestedGame = command.path("gameId").asText(null);
        UUID requestedGameId = extractUuid(requestedGame);
        if (requestedGame != null && requestedGameId == null) {
            error(socket, "INVALID_GAME", "Command game must be a valid game ID");
            return null;
        }
        if (requestedGameId != null && !gameId.equals(requestedGameId)) {
            error(socket, "INVALID_GAME", "Command game does not match the connected game");
            return null;
        }
        Optional<GameSession> session = gameSessionRepository.findById(gameId);
        if (session.isEmpty() || session.get().isPractice()
                || session.get().getStatus() != GameStatus.ACTIVE
                || !session.get().hasPlayer(playerId)) {
            error(socket, "COMMS_UNAVAILABLE", "Chat and reactions are unavailable in this game");
            return null;
        }
        Player player = playerRepository.findById(playerId).orElse(null);
        if (player == null) {
            error(socket, "UNAUTHENTICATED", "A valid player is required");
            return null;
        }
        return new GameContext(gameId, playerId, player);
    }

    private void error(WebSocketSession socket, String code, String message) throws Exception {
        socket.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                CommsErrorEvent.builder().code(code).message(message).build())));
    }

    private boolean allowed(ConcurrentHashMap<UUID, Long> timestamps, UUID playerId, long interval) {
        long now = System.currentTimeMillis();
        long limit = Math.max(0, interval);
        final boolean[] accepted = {false};
        timestamps.compute(playerId, (key, previous) -> {
            if (previous == null || now - previous >= limit) {
                accepted[0] = true;
                return now;
            }
            return previous;
        });
        return accepted[0];
    }

    private UUID extractUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try { return UUID.fromString(value); } catch (IllegalArgumentException ignored) { return null; }
    }

    private record GameContext(UUID gameId, UUID playerId, Player player) {}

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        GameSessionManager.SessionRemovalResult result = sessionManager.removeSession(session);
        if (result.lastSessionForPlayer()) {
            PlayerLeftEvent event = PlayerLeftEvent.builder()
                    .gameId(result.gameId())
                    .playerId(result.playerId())
                    .onlineCount(sessionManager.getOnlinePlayerCount())
                    .build();

            if (result.gameId() != null) {
                sessionManager.broadcastToGame(result.gameId(), event);
            } else {
                sessionManager.broadcast(event);
            }
            log.info("Broadcasted PLAYER_LEFT for player {} in game {} (online: {})",
                    result.playerId(), result.gameId(), event.getOnlineCount());
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

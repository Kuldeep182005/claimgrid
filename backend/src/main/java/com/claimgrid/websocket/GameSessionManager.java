package com.claimgrid.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Thread-safe WebSocket connection and session registry for ClaimGrid.
 *
 * Scopes WebSocket sessions to specific GameSessions to guarantee full
 * event isolation between different battles (Part 10).
 */
@Component
public class GameSessionManager {

    private static final Logger log = LoggerFactory.getLogger(GameSessionManager.class);

    private static final int SEND_TIME_LIMIT_MS = 5000;
    private static final int BUFFER_SIZE_LIMIT_BYTES = 64 * 1024; // 64 KB

    private final ConcurrentMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, UUID> sessionPlayerMap = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, Set<String>> playerSessionsMap = new ConcurrentHashMap<>();

    // Scoped game sessions: gameId -> set of webSocket session IDs
    private final ConcurrentMap<String, UUID> sessionGameMap = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, Set<String>> gameSessionsMap = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    public GameSessionManager(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Registers a new connected session with player and game session scoping.
     */
    public WebSocketSession registerSession(WebSocketSession session, UUID playerId, UUID gameId) {
        WebSocketSession decorated = new ConcurrentWebSocketSessionDecorator(
                session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT_BYTES);

        String sessionId = session.getId();
        sessions.put(sessionId, decorated);

        if (playerId != null) {
            sessionPlayerMap.put(sessionId, playerId);
            playerSessionsMap.computeIfAbsent(playerId, k -> ConcurrentHashMap.newKeySet()).add(sessionId);
        }

        if (gameId != null) {
            sessionGameMap.put(sessionId, gameId);
            gameSessionsMap.computeIfAbsent(gameId, k -> ConcurrentHashMap.newKeySet()).add(sessionId);
            log.info("Registered WebSocket session {} for player {} in game {}", sessionId, playerId, gameId);
        } else {
            log.info("Registered WebSocket session {} for player {} (unscoped)", sessionId, playerId);
        }

        return decorated;
    }

    public WebSocketSession registerSession(WebSocketSession session, UUID playerId) {
        return registerSession(session, playerId, null);
    }

    /**
     * Removes a disconnected session and cleans up player and game associations.
     */
    public SessionRemovalResult removeSession(WebSocketSession session) {
        String sessionId = session.getId();
        sessions.remove(sessionId);

        UUID gameId = sessionGameMap.remove(sessionId);
        if (gameId != null) {
            Set<String> gameSessions = gameSessionsMap.get(gameId);
            if (gameSessions != null) {
                gameSessions.remove(sessionId);
                if (gameSessions.isEmpty()) {
                    gameSessionsMap.remove(gameId);
                }
            }
        }

        UUID playerId = sessionPlayerMap.remove(sessionId);
        boolean lastSessionForPlayer = false;
        if (playerId != null) {
            Set<String> playerSessions = playerSessionsMap.get(playerId);
            if (playerSessions != null) {
                playerSessions.remove(sessionId);
                if (playerSessions.isEmpty()) {
                    playerSessionsMap.remove(playerId);
                    lastSessionForPlayer = true;
                    log.info("Session {} closed; player {} has no remaining sessions in game {}", sessionId, playerId, gameId);
                }
            }
        }

        return new SessionRemovalResult(playerId, gameId, lastSessionForPlayer);
    }

    public record SessionRemovalResult(UUID playerId, UUID gameId, boolean lastSessionForPlayer) {}

    /**
     * Broadcasts a message ONLY to participants in a specific GameSession (Game Isolation).
     */
    public void broadcastToGame(UUID gameId, Object payload) {
        if (gameId == null) {
            broadcast(payload);
            return;
        }

        Set<String> sessionIds = gameSessionsMap.get(gameId);
        if (sessionIds == null || sessionIds.isEmpty()) {
            log.debug("No active WebSocket sessions found for game {}", gameId);
            return;
        }

        TextMessage message = serializePayload(payload);
        if (message == null) return;

        for (String sessionId : sessionIds) {
            WebSocketSession session = sessions.get(sessionId);
            if (session == null || !session.isOpen()) {
                continue;
            }

            try {
                session.sendMessage(message);
            } catch (IOException e) {
                log.warn("Failed to send WebSocket message to session {} in game {}: {}", sessionId, gameId, e.getMessage());
                try {
                    session.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    /**
     * Broadcasts a message globally to all active sessions.
     */
    public void broadcast(Object payload) {
        if (sessions.isEmpty()) {
            return;
        }

        TextMessage message = serializePayload(payload);
        if (message == null) return;

        for (WebSocketSession session : sessions.values()) {
            if (!session.isOpen()) {
                continue;
            }

            try {
                session.sendMessage(message);
            } catch (IOException e) {
                log.warn("Failed to send WebSocket message to session {}: {}", session.getId(), e.getMessage());
                try {
                    session.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    private TextMessage serializePayload(Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            return new TextMessage(json);
        } catch (Exception e) {
            log.error("Failed to serialize WebSocket event payload: {}", payload, e);
            return null;
        }
    }

    public int getActiveSessionCount() {
        return sessions.size();
    }

    public int getActiveGameSessionCount(UUID gameId) {
        Set<String> set = gameSessionsMap.get(gameId);
        return set != null ? set.size() : 0;
    }

    public boolean isPlayerConnected(UUID playerId) {
        Set<String> set = playerSessionsMap.get(playerId);
        return set != null && !set.isEmpty();
    }
}

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
 * Manages active sessions, associates sessions with players, isolates send failures,
 * and prunes disconnected sessions without memory leaks.
 */
@Component
public class GameSessionManager {

    private static final Logger log = LoggerFactory.getLogger(GameSessionManager.class);

    private static final int SEND_TIME_LIMIT_MS = 5000;
    private static final int BUFFER_SIZE_LIMIT_BYTES = 64 * 1024; // 64 KB

    private final ConcurrentMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, UUID> sessionPlayerMap = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, Set<String>> playerSessionsMap = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    public GameSessionManager(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Registers a new connected session, optionally associating it with a player.
     * The session is wrapped in a ConcurrentWebSocketSessionDecorator to guarantee thread-safe writes.
     */
    public WebSocketSession registerSession(WebSocketSession session, UUID playerId) {
        WebSocketSession decorated = new ConcurrentWebSocketSessionDecorator(
                session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT_BYTES);

        sessions.put(session.getId(), decorated);

        if (playerId != null) {
            sessionPlayerMap.put(session.getId(), playerId);
            playerSessionsMap.computeIfAbsent(playerId, k -> ConcurrentHashMap.newKeySet()).add(session.getId());
            log.info("Registered WebSocket session {} for player {}", session.getId(), playerId);
        } else {
            log.info("Registered anonymous spectator WebSocket session {}", session.getId());
        }

        return decorated;
    }

    /**
     * Removes a disconnected session.
     * Returns the player's UUID if this was their last active session (triggering PLAYER_LEFT),
     * or null if the session was anonymous or the player still has other active sessions.
     */
    public UUID removeSession(WebSocketSession session) {
        String sessionId = session.getId();
        sessions.remove(sessionId);

        UUID playerId = sessionPlayerMap.remove(sessionId);
        if (playerId != null) {
            Set<String> playerSessions = playerSessionsMap.get(playerId);
            if (playerSessions != null) {
                playerSessions.remove(sessionId);
                if (playerSessions.isEmpty()) {
                    playerSessionsMap.remove(playerId);
                    log.info("Session {} closed; player {} has no remaining sessions (will trigger PLAYER_LEFT)", sessionId, playerId);
                    return playerId;
                }
            }
            log.info("Session {} closed for player {} (player still has other active sessions)", sessionId, playerId);
        } else {
            log.info("Anonymous spectator WebSocket session {} closed", sessionId);
        }

        return null;
    }

    /**
     * Broadcasts a message to all active WebSocket sessions.
     * Send errors to individual broken sessions are isolated and will not terminate the broadcast
     * to other clients.
     */
    public void broadcast(Object payload) {
        if (sessions.isEmpty()) {
            return;
        }

        TextMessage message;
        try {
            String json = objectMapper.writeValueAsString(payload);
            message = new TextMessage(json);
        } catch (Exception e) {
            log.error("Failed to serialize WebSocket event payload: {}", payload, e);
            return;
        }

        for (WebSocketSession session : sessions.values()) {
            if (!session.isOpen()) {
                removeSession(session);
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
                removeSession(session);
            }
        }
    }

    public int getActiveSessionCount() {
        return sessions.size();
    }

    public boolean isPlayerConnected(UUID playerId) {
        Set<String> set = playerSessionsMap.get(playerId);
        return set != null && !set.isEmpty();
    }
}

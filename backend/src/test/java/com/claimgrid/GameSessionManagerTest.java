package com.claimgrid;

import com.claimgrid.websocket.GameSessionManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("GameSessionManager — Unique Active Commander Presence Unit Tests")
class GameSessionManagerTest {

    private GameSessionManager sessionManager;

    @BeforeEach
    void setUp() {
        sessionManager = new GameSessionManager(new ObjectMapper());
    }

    private WebSocketSession mockSession(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        return session;
    }

    @Test
    @DisplayName("1. One player connected = 1 online commander")
    void testOnePlayer_ReturnsOneOnline() {
        UUID playerA = UUID.randomUUID();
        WebSocketSession s1 = mockSession("s1");

        sessionManager.registerSession(s1, playerA);

        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(1);
        assertThat(sessionManager.isPlayerConnected(playerA)).isTrue();
    }

    @Test
    @DisplayName("2. Two players connected = 2 online commanders")
    void testTwoPlayers_ReturnsTwoOnline() {
        UUID playerA = UUID.randomUUID();
        UUID playerB = UUID.randomUUID();
        WebSocketSession s1 = mockSession("s1");
        WebSocketSession s2 = mockSession("s2");

        sessionManager.registerSession(s1, playerA);
        sessionManager.registerSession(s2, playerB);

        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(2);
        assertThat(sessionManager.isPlayerConnected(playerA)).isTrue();
        assertThat(sessionManager.isPlayerConnected(playerB)).isTrue();
    }

    @Test
    @DisplayName("3. Same player with two WebSocket connections = 1 online commander")
    void testSamePlayerWithTwoConnections_ReturnsOneOnline() {
        UUID playerA = UUID.randomUUID();
        WebSocketSession s1 = mockSession("s1");
        WebSocketSession s2 = mockSession("s2");

        sessionManager.registerSession(s1, playerA);
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(1);

        // Second connection for same player (e.g. second browser tab)
        sessionManager.registerSession(s2, playerA);

        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(1);
        assertThat(sessionManager.getActiveSessionCount()).isEqualTo(2); // 2 total raw connections, 1 commander
    }

    @Test
    @DisplayName("4. Closing one of two sessions = still 1 online commander")
    void testClosingOneOfTwoSessions_StillOneOnline() {
        UUID playerA = UUID.randomUUID();
        WebSocketSession s1 = mockSession("s1");
        WebSocketSession s2 = mockSession("s2");

        sessionManager.registerSession(s1, playerA);
        sessionManager.registerSession(s2, playerA);

        // Close first tab
        GameSessionManager.SessionRemovalResult result1 = sessionManager.removeSession(s1);

        assertThat(result1.lastSessionForPlayer()).isFalse();
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(1);
        assertThat(sessionManager.isPlayerConnected(playerA)).isTrue();
    }

    @Test
    @DisplayName("5. Closing final session = 0 online commanders for that player")
    void testClosingFinalSession_RemovesCommander() {
        UUID playerA = UUID.randomUUID();
        WebSocketSession s1 = mockSession("s1");
        WebSocketSession s2 = mockSession("s2");

        sessionManager.registerSession(s1, playerA);
        sessionManager.registerSession(s2, playerA);

        // Close first tab
        sessionManager.removeSession(s1);

        // Close second (final) tab
        GameSessionManager.SessionRemovalResult result2 = sessionManager.removeSession(s2);

        assertThat(result2.lastSessionForPlayer()).isTrue();
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(0);
        assertThat(sessionManager.isPlayerConnected(playerA)).isFalse();
    }

    @Test
    @DisplayName("6. Invalid/unknown/anonymous WebSocket connection does not increase commander count")
    void testAnonymousConnection_DoesNotIncreaseCount() {
        WebSocketSession anonSession = mockSession("anon-1");

        // Anonymous connection (playerId = null)
        sessionManager.registerSession(anonSession, null);

        assertThat(sessionManager.getActiveSessionCount()).isEqualTo(1);
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("7. Reconnect does not permanently increase commander count")
    void testReconnect_DoesNotIncreaseCount() {
        UUID playerA = UUID.randomUUID();
        WebSocketSession s1 = mockSession("s1");

        sessionManager.registerSession(s1, playerA);
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(1);

        // Disconnect old session
        sessionManager.removeSession(s1);
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(0);

        // Reconnect with new session
        WebSocketSession s2 = mockSession("s2");
        sessionManager.registerSession(s2, playerA);
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(1);
    }
}

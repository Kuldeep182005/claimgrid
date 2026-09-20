package com.claimgrid;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellRequest;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.Player;
import com.claimgrid.websocket.GameSessionManager;
import com.claimgrid.websocket.event.CellClaimedDomainEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class WebSocketIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private GameProperties gameProperties;

    @Autowired
    private GameSessionManager sessionManager;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private TransactionTemplate txTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StandardWebSocketClient wsClient = new StandardWebSocketClient();
    private final List<WebSocketSession> openSessions = new ArrayList<>();

    @BeforeEach
    void setUp() {
        cleanDatabase();
        gameProperties.setCooldownMs(3000);
    }

    @AfterEach
    void tearDown() {
        for (WebSocketSession session : openSessions) {
            try {
                if (session.isOpen()) {
                    session.close(CloseStatus.NORMAL);
                }
            } catch (Exception ignored) {
            }
        }
        openSessions.clear();
    }

    private WebSocketSession connect(String path, BlockingQueue<String> messageQueue) throws Exception {
        String url = "ws://localhost:" + port + path;
        WebSocketSession session = wsClient.execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                messageQueue.add(message.getPayload());
            }
        }, url).get(5, TimeUnit.SECONDS);
        openSessions.add(session);
        return session;
    }

    @Test
    @DisplayName("Section 19-A: Client can successfully establish WebSocket connection to /ws/game")
    void testWebSocketConnection_ConnectsSuccessfully() throws Exception {
        BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        WebSocketSession session = connect("/ws/game", messages);

        assertThat(session.isOpen()).isTrue();
        long deadline = System.currentTimeMillis() + 3000;
        while (sessionManager.getActiveSessionCount() == 0 && System.currentTimeMillis() < deadline) {
            Thread.sleep(50);
        }
        assertThat(sessionManager.getActiveSessionCount()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Section 19-B: Successful REST claim broadcasts CELL_CLAIMED and LEADERBOARD_UPDATED over WebSocket")
    void testCellClaimedBroadcast_AfterSuccessfulRestClaim() throws Exception {
        // 1. Connect WebSocket client
        BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        connect("/ws/game", messages);

        // 2. Create player
        Player player = playerRepository.save(Player.builder()
                .username("WS_Player")
                .color("#6366F1")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell = cellRepository.findByXAndY(15, 20).orElseThrow();

        // 3. Claim cell through REST
        ClaimCellRequest request = ClaimCellRequest.builder().playerId(player.getId()).build();
        restTemplate.postForEntity("/api/game/cells/" + cell.getId() + "/claim", request, ClaimCellResponse.class);

        // 4. Verify CELL_CLAIMED event received
        String cellClaimedRaw = messages.poll(5, TimeUnit.SECONDS);
        assertThat(cellClaimedRaw).isNotNull();

        JsonNode cellClaimedJson = objectMapper.readTree(cellClaimedRaw);
        assertThat(cellClaimedJson.path("type").asText()).isEqualTo("CELL_CLAIMED");
        assertThat(cellClaimedJson.path("cellId").asLong()).isEqualTo(cell.getId());
        assertThat(cellClaimedJson.path("x").asInt()).isEqualTo(15);
        assertThat(cellClaimedJson.path("y").asInt()).isEqualTo(20);
        assertThat(cellClaimedJson.path("playerId").asText()).isEqualTo(player.getId().toString());
        assertThat(cellClaimedJson.path("playerName").asText()).isEqualTo("WS_Player");
        assertThat(cellClaimedJson.path("color").asText()).isEqualTo("#6366F1");
        assertThat(cellClaimedJson.path("claimedAt").asText()).isNotEmpty();

        // 5. Verify LEADERBOARD_UPDATED event received
        String leaderboardRaw = messages.poll(5, TimeUnit.SECONDS);
        assertThat(leaderboardRaw).isNotNull();

        JsonNode leaderboardJson = objectMapper.readTree(leaderboardRaw);
        assertThat(leaderboardJson.path("type").asText()).isEqualTo("LEADERBOARD_UPDATED");
        assertThat(leaderboardJson.path("playerId").asText()).isEqualTo(player.getId().toString());
        assertThat(leaderboardJson.path("cellsClaimed").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("Section 19-C: Attempting to claim an already-claimed cell emits NO WebSocket events")
    void testFailedClaim_DoesNotBroadcastCellClaimed() throws Exception {
        Player playerA = playerRepository.save(Player.builder()
                .username("Player_A")
                .color("#EF4444")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Player playerB = playerRepository.save(Player.builder()
                .username("Player_B")
                .color("#3B82F6")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell = cellRepository.findByXAndY(8, 8).orElseThrow();

        // Player A claims cell
        restTemplate.postForEntity("/api/game/cells/" + cell.getId() + "/claim",
                ClaimCellRequest.builder().playerId(playerA.getId()).build(), ClaimCellResponse.class);

        // Connect WebSocket listener after initial claim
        BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        connect("/ws/game", messages);

        // Player B attempts to claim the already claimed cell
        restTemplate.postForEntity("/api/game/cells/" + cell.getId() + "/claim",
                ClaimCellRequest.builder().playerId(playerB.getId()).build(), ClaimCellResponse.class);

        // Verify no WebSocket events are emitted for the failed claim
        String message = messages.poll(1, TimeUnit.SECONDS);
        assertThat(message).isNull();
    }

    @Test
    @DisplayName("Section 19-D: Claim rejected due to cooldown emits NO WebSocket events")
    void testCooldownRejection_DoesNotBroadcastCellClaimed() throws Exception {
        Player player = playerRepository.save(Player.builder()
                .username("Cooldown_Player")
                .color("#10B981")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell1 = cellRepository.findByXAndY(3, 3).orElseThrow();
        Cell cell2 = cellRepository.findByXAndY(3, 4).orElseThrow();

        // First claim
        restTemplate.postForEntity("/api/game/cells/" + cell1.getId() + "/claim",
                ClaimCellRequest.builder().playerId(player.getId()).build(), ClaimCellResponse.class);

        // Connect listener and clear queue
        BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        connect("/ws/game", messages);

        // Immediate second claim during cooldown (3000ms)
        restTemplate.postForEntity("/api/game/cells/" + cell2.getId() + "/claim",
                ClaimCellRequest.builder().playerId(player.getId()).build(), ClaimCellResponse.class);

        // Verify no message was broadcast for the rejected claim
        String message = messages.poll(1, TimeUnit.SECONDS);
        assertThat(message).isNull();
    }

    @Test
    @DisplayName("Section 19-E: Multiple connected clients all receive the same CELL_CLAIMED broadcast")
    void testMultipleConnectedClients_AllReceiveCellClaimed() throws Exception {
        BlockingQueue<String> client1Messages = new LinkedBlockingQueue<>();
        BlockingQueue<String> client2Messages = new LinkedBlockingQueue<>();

        connect("/ws/game", client1Messages);
        connect("/ws/game", client2Messages);

        Player player = playerRepository.save(Player.builder()
                .username("Multi_Player")
                .color("#EC4899")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell = cellRepository.findByXAndY(25, 25).orElseThrow();

        restTemplate.postForEntity("/api/game/cells/" + cell.getId() + "/claim",
                ClaimCellRequest.builder().playerId(player.getId()).build(), ClaimCellResponse.class);

        // Verify Client 1 received CELL_CLAIMED
        String msg1 = client1Messages.poll(5, TimeUnit.SECONDS);
        assertThat(msg1).isNotNull();
        assertThat(objectMapper.readTree(msg1).path("type").asText()).isEqualTo("CELL_CLAIMED");

        // Verify Client 2 received CELL_CLAIMED
        String msg2 = client2Messages.poll(5, TimeUnit.SECONDS);
        assertThat(msg2).isNotNull();
        assertThat(objectMapper.readTree(msg2).path("type").asText()).isEqualTo("CELL_CLAIMED");
    }

    @Test
    @DisplayName("Section 19-F: Disconnecting one client isolates errors and remaining clients still receive broadcasts")
    void testDisconnectIsolation_OneClientDisconnects_RemainingClientsStillReceive() throws Exception {
        BlockingQueue<String> client1Messages = new LinkedBlockingQueue<>();
        BlockingQueue<String> client2Messages = new LinkedBlockingQueue<>();

        WebSocketSession session1 = connect("/ws/game", client1Messages);
        WebSocketSession session2 = connect("/ws/game", client2Messages);

        // Disconnect client 1
        session1.close(CloseStatus.NORMAL);
        Thread.sleep(100);

        Player player = playerRepository.save(Player.builder()
                .username("Resilient_Player")
                .color("#F59E0B")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell = cellRepository.findByXAndY(40, 40).orElseThrow();

        // Claim cell
        restTemplate.postForEntity("/api/game/cells/" + cell.getId() + "/claim",
                ClaimCellRequest.builder().playerId(player.getId()).build(), ClaimCellResponse.class);

        // Client 2 must still receive CELL_CLAIMED
        String msg2 = client2Messages.poll(5, TimeUnit.SECONDS);
        assertThat(msg2).isNotNull();
        assertThat(objectMapper.readTree(msg2).path("type").asText()).isEqualTo("CELL_CLAIMED");
    }

    @Test
    @DisplayName("Section 19-G & H: PLAYER_JOINED and PLAYER_LEFT are broadcast upon connection and disconnection")
    void testPlayerJoinedAndLeft_Broadcasts() throws Exception {
        // 1. Create Player 1 and Player 2
        Player player1 = playerRepository.save(Player.builder()
                .username("Presence_P1")
                .color("#EF4444")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Player player2 = playerRepository.save(Player.builder()
                .username("Presence_P2")
                .color("#3B82F6")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        // 2. Connect Client 1 as Player 1
        BlockingQueue<String> p1Messages = new LinkedBlockingQueue<>();
        connect("/ws/game?playerId=" + player1.getId(), p1Messages);

        // Client 1 receives its own PLAYER_JOINED event
        String p1JoinMsg = p1Messages.poll(5, TimeUnit.SECONDS);
        assertThat(p1JoinMsg).isNotNull();
        JsonNode p1JoinJson = objectMapper.readTree(p1JoinMsg);
        assertThat(p1JoinJson.path("type").asText()).isEqualTo("PLAYER_JOINED");
        assertThat(p1JoinJson.path("playerId").asText()).isEqualTo(player1.getId().toString());

        // 3. Connect Client 2 as Player 2
        BlockingQueue<String> p2Messages = new LinkedBlockingQueue<>();
        WebSocketSession session2 = connect("/ws/game?playerId=" + player2.getId(), p2Messages);

        // 4. Verify Client 1 received PLAYER_JOINED for Player 2
        String joinMsg = p1Messages.poll(5, TimeUnit.SECONDS);
        assertThat(joinMsg).isNotNull();
        JsonNode joinJson = objectMapper.readTree(joinMsg);
        assertThat(joinJson.path("type").asText()).isEqualTo("PLAYER_JOINED");
        assertThat(joinJson.path("playerId").asText()).isEqualTo(player2.getId().toString());
        assertThat(joinJson.path("playerName").asText()).isEqualTo("Presence_P2");
        assertThat(joinJson.path("color").asText()).isEqualTo("#3B82F6");
        assertThat(joinJson.path("onlineCount").asInt()).isGreaterThanOrEqualTo(2);

        // 5. Disconnect Client 2
        session2.close(CloseStatus.NORMAL);

        // 6. Verify Client 1 received PLAYER_LEFT for Player 2
        String leftMsg = p1Messages.poll(5, TimeUnit.SECONDS);
        assertThat(leftMsg).isNotNull();
        JsonNode leftJson = objectMapper.readTree(leftMsg);
        assertThat(leftJson.path("type").asText()).isEqualTo("PLAYER_LEFT");
        assertThat(leftJson.path("playerId").asText()).isEqualTo(player2.getId().toString());
        assertThat(leftJson.path("onlineCount").asInt()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Section 19-K: Unique commander presence semantics — Multi-tab, duplicate prevention, and clean disconnect")
    void testCommanderPresence_MultiTabAndDisconnect_Semantics() throws Exception {
        Player playerA = playerRepository.save(Player.builder()
                .username("Presence_Alpha")
                .color("#10B981")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Player playerB = playerRepository.save(Player.builder()
                .username("Presence_Beta")
                .color("#6366F1")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        int initialOnline = sessionManager.getOnlinePlayerCount();

        // 1. One player connects -> online increases by 1
        BlockingQueue<String> p1Tab1Msgs = new LinkedBlockingQueue<>();
        WebSocketSession p1Tab1 = connect("/ws/game?playerId=" + playerA.getId(), p1Tab1Msgs);

        // Verify PLAYER_JOINED received with onlineCount (confirms server registration complete)
        String join1 = p1Tab1Msgs.poll(5, TimeUnit.SECONDS);
        assertThat(join1).isNotNull();
        assertThat(objectMapper.readTree(join1).path("type").asText()).isEqualTo("PLAYER_JOINED");
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(initialOnline + 1);

        // 2. Same player opens Tab 2 -> unique commanders remains the same (does NOT double count)
        BlockingQueue<String> p1Tab2Msgs = new LinkedBlockingQueue<>();
        WebSocketSession p1Tab2 = connect("/ws/game?playerId=" + playerA.getId(), p1Tab2Msgs);
        Thread.sleep(150);
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(initialOnline + 1);

        // Tab 1 must NOT receive a duplicate PLAYER_JOINED for playerA
        String dupJoin = p1Tab1Msgs.poll(500, TimeUnit.MILLISECONDS);
        assertThat(dupJoin).isNull();

        // 3. Second unique player connects -> online increases to initial + 2
        BlockingQueue<String> p2Msgs = new LinkedBlockingQueue<>();
        WebSocketSession p2Session = connect("/ws/game?playerId=" + playerB.getId(), p2Msgs);
        String p2Join = p2Msgs.poll(5, TimeUnit.SECONDS);
        assertThat(p2Join).isNotNull();
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(initialOnline + 2);

        // 4. Invalid/anonymous connection -> does NOT increase online commander count
        BlockingQueue<String> anonMsgs = new LinkedBlockingQueue<>();
        WebSocketSession anonSession = connect("/ws/game", anonMsgs);
        Thread.sleep(150);
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(initialOnline + 2);

        // 5. Close Tab 1 of playerA -> playerA still has Tab 2 active, count remains initial + 2
        p1Tab1.close(CloseStatus.NORMAL);
        Thread.sleep(150);
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(initialOnline + 2);

        // Player B must NOT receive PLAYER_LEFT yet (playerA still has active tab)
        String prematureLeft = p2Msgs.poll(500, TimeUnit.MILLISECONDS);
        // Drain any previous JOIN messages if present
        while (prematureLeft != null && objectMapper.readTree(prematureLeft).path("type").asText().equals("PLAYER_JOINED")) {
            prematureLeft = p2Msgs.poll(500, TimeUnit.MILLISECONDS);
        }
        assertThat(prematureLeft).isNull();

        // 6. Close final Tab 2 of playerA -> playerA is now completely offline, count decrements
        p1Tab2.close(CloseStatus.NORMAL);
        // Player B receives PLAYER_LEFT for playerA (confirms server removal complete)
        String leftMsg = p2Msgs.poll(5, TimeUnit.SECONDS);
        assertThat(leftMsg).isNotNull();
        JsonNode leftNode = objectMapper.readTree(leftMsg);
        assertThat(leftNode.path("type").asText()).isEqualTo("PLAYER_LEFT");
        assertThat(leftNode.path("playerId").asText()).isEqualTo(playerA.getId().toString());
        assertThat(sessionManager.getOnlinePlayerCount()).isEqualTo(initialOnline + 1);

        // Cleanup
        p2Session.close(CloseStatus.NORMAL);
        anonSession.close(CloseStatus.NORMAL);
    }

    @Test
    @DisplayName("Section 19-I: Malformed messages are handled safely without crashing or disconnecting clients")
    void testMalformedMessageHandling_DoesNotCrashServer() throws Exception {
        BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        WebSocketSession session = connect("/ws/game", messages);

        // Send corrupt text
        session.sendMessage(new TextMessage("THIS IS NOT JSON {{{"));
        // Send unknown object
        session.sendMessage(new TextMessage("{\"unknown_field\": true}"));
        // Send valid ping
        session.sendMessage(new TextMessage("{\"type\":\"PING\"}"));

        // Server responds to ping with pong without disconnecting
        String pongMsg = messages.poll(5, TimeUnit.SECONDS);
        assertThat(pongMsg).isNotNull();
        assertThat(objectMapper.readTree(pongMsg).path("type").asText()).isEqualTo("PONG");
        assertThat(session.isOpen()).isTrue();
    }

    @Test
    @DisplayName("Section 19-J: Post-commit safety - Rolled-back transactions do NOT emit WebSocket events")
    void testPostCommitSafety_RolledBackTransaction_DoesNotEmitEvents() throws Exception {
        BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        connect("/ws/game", messages);

        // Execute a transaction that publishes a CellClaimedDomainEvent but then rolls back
        try {
            txTemplate.execute(status -> {
                eventPublisher.publishEvent(new CellClaimedDomainEvent(
                        999L, 0, 0, UUID.randomUUID(), "Ghost", "#000", Instant.now(), 1));
                // Force rollback
                throw new RuntimeException("Simulated transaction failure");
            });
        } catch (RuntimeException expected) {
            // Expected
        }

        // Verify that @TransactionalEventListener(phase = AFTER_COMMIT) did NOT fire
        String message = messages.poll(1, TimeUnit.SECONDS);
        assertThat(message).isNull();
    }
}

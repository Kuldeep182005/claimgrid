package com.claimgrid;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellRequest;
import com.claimgrid.dto.GameSessionResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.Player;
import com.claimgrid.service.BattleSessionService;
import com.claimgrid.websocket.GameSessionManager;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class WebSocketGameIsolationIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private GameProperties gameProperties;

    @Autowired
    private BattleSessionService battleSessionService;

    @Autowired
    private GameSessionManager sessionManager;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StandardWebSocketClient wsClient = new StandardWebSocketClient();
    private final List<WebSocketSession> openSessions = new ArrayList<>();

    private Player playerA1;
    private Player playerA2;
    private Player playerB1;
    private Player playerB2;

    private GameSessionResponse gameA;
    private GameSessionResponse gameB;

    @BeforeEach
    void setUp() {
        cleanDatabase();
        gameProperties.setCooldownMs(0); // 0ms cooldown for fast test execution

        playerA1 = playerRepository.save(Player.builder().username("AliceA").color("#EF4444").build());
        playerA2 = playerRepository.save(Player.builder().username("BobA").color("#3B82F6").build());
        playerB1 = playerRepository.save(Player.builder().username("CharlieB").color("#10B981").build());
        playerB2 = playerRepository.save(Player.builder().username("DaveB").color("#F59E0B").build());

        gameA = battleSessionService.createGame(playerA1.getId());
        battleSessionService.joinGame(gameA.getCode(), playerA2.getId());

        gameB = battleSessionService.createGame(playerB1.getId());
        battleSessionService.joinGame(gameB.getCode(), playerB2.getId());
    }

    @AfterEach
    void tearDown() {
        for (WebSocketSession session : openSessions) {
            try {
                session.close();
            } catch (Exception ignored) {
            }
        }
        openSessions.clear();
    }

    private TestWsHandler connectClient(Player player, GameSessionResponse game) throws Exception {
        TestWsHandler handler = new TestWsHandler();
        String uri = "ws://localhost:" + port + "/ws/game?playerId=" + player.getId() + "&gameId=" + game.getGameId();
        WebSocketSession session = wsClient.execute(handler, uri).get(5, TimeUnit.SECONDS);
        openSessions.add(session);
        return handler;
    }

    @Test
    @DisplayName("16-17. WebSocket Isolation: events in Game A are only broadcast to Game A subscribers, zero events received by Game B")
    void testWebSocketEventIsolation_BetweenGames() throws Exception {
        // Connect client A1 to Game A
        TestWsHandler handlerA1 = connectClient(playerA1, gameA);

        // Connect client B1 to Game B
        TestWsHandler handlerB1 = connectClient(playerB1, gameB);

        // Drain initial connection/presence events
        Thread.sleep(300);
        handlerA1.clear();
        handlerB1.clear();

        // Perform claim in Game A
        List<Cell> cellsA = cellRepository.findBySessionIdOrderByYAscXAsc(gameA.getGameId());
        Cell targetCellA = cellsA.get(0);

        ClaimCellRequest request = new ClaimCellRequest(playerA1.getId());
        restTemplate.postForEntity(
                "/api/games/" + gameA.getGameId() + "/cells/" + targetCellA.getId() + "/claim",
                request, String.class);

        // Client in Game A MUST receive CELL_CLAIMED
        JsonNode receivedByA = handlerA1.awaitEvent("CELL_CLAIMED", 3, TimeUnit.SECONDS);
        assertThat(receivedByA).isNotNull();
        assertThat(receivedByA.path("gameId").asText()).isEqualTo(gameA.getGameId().toString());
        assertThat(receivedByA.path("cellId").asLong()).isEqualTo(targetCellA.getId());
        assertThat(receivedByA.path("turnNumber").asInt()).isEqualTo(2);

        // Client in Game A MUST also receive TURN_CHANGED
        JsonNode turnChangedA = handlerA1.awaitEvent("TURN_CHANGED", 3, TimeUnit.SECONDS);
        assertThat(turnChangedA).isNotNull();
        assertThat(turnChangedA.path("gameId").asText()).isEqualTo(gameA.getGameId().toString());
        assertThat(turnChangedA.path("currentPlayerId").asText()).isEqualTo(playerA2.getId().toString());

        // Client in Game B MUST NOT receive any message from Game A
        Thread.sleep(500);
        assertThat(handlerB1.allReceived()).isEmpty();
    }

    private static class TestWsHandler extends TextWebSocketHandler {
        final List<JsonNode> history = Collections.synchronizedList(new ArrayList<>());
        final BlockingQueue<JsonNode> queue = new LinkedBlockingQueue<>();
        private final ObjectMapper mapper = new ObjectMapper();

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) {
            try {
                JsonNode node = mapper.readTree(message.getPayload());
                history.add(node);
                queue.add(node);
            } catch (Exception ignored) {
            }
        }

        void clear() {
            history.clear();
            queue.clear();
        }

        List<JsonNode> allReceived() {
            return new ArrayList<>(history);
        }

        JsonNode awaitEvent(String expectedType, long timeout, TimeUnit unit) throws InterruptedException {
            long deadline = System.currentTimeMillis() + unit.toMillis(timeout);
            while (System.currentTimeMillis() < deadline) {
                synchronized (history) {
                    for (JsonNode n : history) {
                        if (expectedType.equals(n.path("type").asText())) {
                            return n;
                        }
                    }
                }
                long remaining = deadline - System.currentTimeMillis();
                if (remaining <= 0) break;
                queue.poll(Math.min(remaining, 100), TimeUnit.MILLISECONDS);
            }
            return null;
        }
    }
}

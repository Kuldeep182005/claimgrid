package com.claimgrid;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.GameSessionResponse;
import com.claimgrid.entity.Player;
import com.claimgrid.service.BattleSessionService;
import com.claimgrid.service.PracticeBotService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class WebSocketCommsIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private BattleSessionService battleSessionService;

    @Autowired
    private PracticeBotService practiceBotService;

    @Autowired
    private GameProperties gameProperties;

    private final StandardWebSocketClient client = new StandardWebSocketClient();
    private final ObjectMapper mapper = new ObjectMapper();
    private final List<WebSocketSession> sessions = new ArrayList<>();
    private Player first;
    private Player second;
    private GameSessionResponse game;

    @BeforeEach
    void setUpComms() {
        cleanDatabase();
        gameProperties.setChatRateLimitMs(1000);
        gameProperties.setReactionRateLimitMs(500);
        first = playerRepository.save(Player.builder().username("CommsOne").color("#111111").build());
        second = playerRepository.save(Player.builder().username("CommsTwo").color("#222222").build());
        game = battleSessionService.createGame(first.getId());
        battleSessionService.joinGame(game.getCode(), second.getId());
    }

    @AfterEach
    void closeSessions() {
        for (WebSocketSession session : sessions) {
            try {
                if (session.isOpen()) session.close();
            } catch (Exception ignored) {
            }
        }
        sessions.clear();
    }

    @Test
    void broadcastsValidChatAndReactionOnlyToTheConnectedGame() throws Exception {
        TestHandler recipient = connect(first, game);
        GameSessionResponse otherGame = createGame("OtherOne", "OtherTwo");
        Player other = playerRepository.findByUsername("OtherOne").orElseThrow();
        TestHandler otherRecipient = connect(other, otherGame);
        drain(recipient, otherRecipient);

        WebSocketSession sender = sessions.get(0);
        sender.sendMessage(new TextMessage(json("SEND_CHAT_MESSAGE", "gameId", game.getGameId(),
                "message", "  hello grid  ")));
        JsonNode chat = recipient.awaitType("CHAT_MESSAGE", 3);
        assertThat(chat).isNotNull();
        assertThat(chat.path("gameId").asText()).isEqualTo(game.getGameId().toString());
        assertThat(chat.path("playerId").asText()).isEqualTo(first.getId().toString());
        assertThat(chat.path("playerName").asText()).isEqualTo("CommsOne");
        assertThat(chat.path("message").asText()).isEqualTo("hello grid");
        assertThat(otherRecipient.awaitType("CHAT_MESSAGE", 1)).isNull();

        Thread.sleep(1050);
        sender.sendMessage(new TextMessage(json("SEND_REACTION", "gameId", game.getGameId(),
                "reaction", "THUMBS_UP")));
        JsonNode reaction = recipient.awaitType("PLAYER_REACTION", 3);
        assertThat(reaction).isNotNull();
        assertThat(reaction.path("reaction").asText()).isEqualTo("THUMBS_UP");
        assertThat(reaction.path("playerId").asText()).isEqualTo(first.getId().toString());
        assertThat(otherRecipient.awaitType("PLAYER_REACTION", 1)).isNull();
    }

    @Test
    void rejectsInvalidChatReactionAndSpoofedGameContext() throws Exception {
        TestHandler handler = connect(first, game);
        drain(handler);
        WebSocketSession sender = sessions.get(0);

        sender.sendMessage(new TextMessage(json("SEND_CHAT_MESSAGE", "gameId", game.getGameId(), "message", "   ")));
        assertError(handler, "INVALID_MESSAGE");

        sender.sendMessage(new TextMessage(json("SEND_CHAT_MESSAGE", "gameId", game.getGameId(),
                "message", "x".repeat(121))));
        assertError(handler, "INVALID_MESSAGE");

        sender.sendMessage(new TextMessage(json("SEND_REACTION", "gameId", game.getGameId(), "reaction", "HEART")));
        assertError(handler, "INVALID_REACTION");

        UUID spoofed = UUID.randomUUID();
        sender.sendMessage(new TextMessage(json("SEND_CHAT_MESSAGE", "gameId", spoofed, "message", "spoof")));
        assertError(handler, "INVALID_GAME");
        assertThat(handler.awaitType("CHAT_MESSAGE", 1)).isNull();
    }

    @Test
    void enforcesConfigurablePerPlayerRateLimits() throws Exception {
        TestHandler handler = connect(first, game);
        drain(handler);
        WebSocketSession sender = sessions.get(0);

        sender.sendMessage(new TextMessage(json("SEND_CHAT_MESSAGE", "gameId", game.getGameId(), "message", "one")));
        assertThat(handler.awaitType("CHAT_MESSAGE", 3)).isNotNull();
        sender.sendMessage(new TextMessage(json("SEND_CHAT_MESSAGE", "gameId", game.getGameId(), "message", "two")));
        assertError(handler, "RATE_LIMITED");

        sender.sendMessage(new TextMessage(json("SEND_REACTION", "gameId", game.getGameId(), "reaction", "LAUGH")));
        assertThat(handler.awaitType("PLAYER_REACTION", 3)).isNotNull();
        sender.sendMessage(new TextMessage(json("SEND_REACTION", "gameId", game.getGameId(), "reaction", "CRY")));
        assertError(handler, "RATE_LIMITED");
    }

    @Test
    void rejectsPracticeSessionCommunications() throws Exception {
        Player practicePlayer = playerRepository.save(
                Player.builder().username("PracticeComms").color("#333333").build());
        GameSessionResponse practice = practiceBotService.createPracticeGame(practicePlayer.getId());
        TestHandler handler = connect(practicePlayer, practice);
        drain(handler);

        try {
            WebSocketSession sender = sessions.get(0);
            sender.sendMessage(new TextMessage(json("SEND_CHAT_MESSAGE", "gameId",
                    practice.getGameId(), "message", "not allowed")));
            assertError(handler, "COMMS_UNAVAILABLE");
        } finally {
            practiceBotService.endPracticeGame(practice.getGameId(), practicePlayer.getId());
        }
    }

    private GameSessionResponse createGame(String firstName, String secondName) {
        Player one = playerRepository.save(Player.builder().username(firstName).color("#444444").build());
        Player two = playerRepository.save(Player.builder().username(secondName).color("#555555").build());
        GameSessionResponse result = battleSessionService.createGame(one.getId());
        battleSessionService.joinGame(result.getCode(), two.getId());
        return result;
    }

    private TestHandler connect(Player player, GameSessionResponse session) throws Exception {
        TestHandler handler = new TestHandler();
        String uri = "ws://localhost:" + port + "/ws/game?playerId=" + player.getId()
                + "&gameId=" + session.getGameId();
        sessions.add(client.execute(handler, uri).get(5, TimeUnit.SECONDS));
        return handler;
    }

    private String json(String type, String key, Object value, String secondKey, String secondValue)
            throws Exception {
        return mapper.createObjectNode().put("type", type).putPOJO(key, value)
                .put(secondKey, secondValue).toString();
    }

    private void assertError(TestHandler handler, String code) throws InterruptedException {
        JsonNode error = handler.awaitType("COMMS_ERROR", 3);
        assertThat(error).isNotNull();
        assertThat(error.path("code").asText()).isEqualTo(code);
    }

    private void drain(TestHandler... handlers) throws InterruptedException {
        Thread.sleep(200);
        for (TestHandler handler : handlers) handler.clear();
    }

    private static class TestHandler extends TextWebSocketHandler {
        private final ObjectMapper mapper = new ObjectMapper();
        private final List<JsonNode> history = Collections.synchronizedList(new ArrayList<>());
        private final BlockingQueue<JsonNode> queue = new LinkedBlockingQueue<>();

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) {
            try {
                JsonNode node = mapper.readTree(message.getPayload());
                history.add(node);
                queue.offer(node);
            } catch (Exception ignored) {
            }
        }

        void clear() {
            history.clear();
            queue.clear();
        }

        JsonNode awaitType(String type, long seconds) throws InterruptedException {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(seconds);
            while (System.nanoTime() < deadline) {
                synchronized (history) {
                    for (int i = 0; i < history.size(); i++) {
                        JsonNode node = history.get(i);
                        if (type.equals(node.path("type").asText())) {
                            history.remove(i);
                            return node;
                        }
                    }
                }
                long remaining = deadline - System.nanoTime();
                if (remaining > 0) queue.poll(Math.min(TimeUnit.NANOSECONDS.toMillis(remaining), 100), TimeUnit.MILLISECONDS);
            }
            return null;
        }
    }
}

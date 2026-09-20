package com.claimgrid;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellRequest;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.ClaimStatus;
import com.claimgrid.dto.CreateGameRequest;
import com.claimgrid.dto.GameSessionResponse;
import com.claimgrid.dto.JoinGameRequest;
import com.claimgrid.dto.SessionGameStateResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.GameSession;
import com.claimgrid.entity.GameStatus;
import com.claimgrid.entity.Player;
import com.claimgrid.exception.InvalidGameRequestException;
import com.claimgrid.service.BattleSessionService;
import com.claimgrid.service.ClaimService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GameSessionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private BattleSessionService battleSessionService;

    @Autowired
    private ClaimService claimService;

    @Autowired
    private GameProperties gameProperties;

    private Player player1;
    private Player player2;
    private Player player3;

    @BeforeEach
    void setUp() {
        cleanDatabase();
        gameProperties.setCooldownMs(3000);

        player1 = playerRepository.save(Player.builder()
                .username("Alice")
                .color("#EF4444")
                .build());

        player2 = playerRepository.save(Player.builder()
                .username("Bob")
                .color("#3B82F6")
                .build());

        player3 = playerRepository.save(Player.builder()
                .username("Charlie")
                .color("#10B981")
                .build());
    }

    @Test
    @DisplayName("1-3. Create game: generates unique code, status WAITING, and exactly 625 cells (0..24, 0..24)")
    void testCreateGame_Generates625CellsAndWaitingStatus() {
        GameSessionResponse session = battleSessionService.createGame(player1.getId());

        assertThat(session.getGameId()).isNotNull();
        assertThat(session.getCode()).hasSize(6);
        assertThat(session.getStatus()).isEqualTo(GameStatus.WAITING);
        assertThat(session.getPlayerCount()).isEqualTo(1);
        assertThat(session.getCurrentPlayerId()).isNull();
        assertThat(session.getTurnNumber()).isEqualTo(0);

        List<Cell> cells = cellRepository.findBySessionIdOrderByYAscXAsc(session.getGameId());
        assertThat(cells).hasSize(625);

        // Verify bounds
        for (Cell cell : cells) {
            assertThat(cell.getX()).isBetween(0, 24);
            assertThat(cell.getY()).isBetween(0, 24);
            assertThat(cell.getOwnerId()).isNull();
            assertThat(cell.getSessionId()).isEqualTo(session.getGameId());
        }
    }

    @Test
    @DisplayName("4-8. Join game: second player joins, status transitions to ACTIVE, initial turn = Player 1, turnNumber = 1")
    void testJoinGame_SecondPlayerActivatesBattle() {
        GameSessionResponse created = battleSessionService.createGame(player1.getId());
        String code = created.getCode();

        GameSessionResponse joined = battleSessionService.joinGame(code, player2.getId());

        assertThat(joined.getStatus()).isEqualTo(GameStatus.ACTIVE);
        assertThat(joined.getPlayerCount()).isEqualTo(2);
        assertThat(joined.getCurrentPlayerId()).isEqualTo(player1.getId());
        assertThat(joined.getTurnNumber()).isEqualTo(1);
        assertThat(joined.getStartedAt()).isNotNull();
    }

    @Test
    @DisplayName("6. Third player attempting to join is rejected")
    void testJoinGame_ThirdPlayerRejected() {
        GameSessionResponse created = battleSessionService.createGame(player1.getId());
        battleSessionService.joinGame(created.getCode(), player2.getId());

        assertThatThrownBy(() -> battleSessionService.joinGame(created.getCode(), player3.getId()))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("already ACTIVE and cannot be joined");
    }

    @Test
    @DisplayName("7. Duplicate join attempt by same player is rejected")
    void testJoinGame_DuplicatePlayerRejected() {
        GameSessionResponse created = battleSessionService.createGame(player1.getId());

        assertThatThrownBy(() -> battleSessionService.joinGame(created.getCode(), player1.getId()))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("Player cannot join their own battle");
    }

    @Test
    @DisplayName("10-12. Turn engine: Player 1 claims -> success, turn advances to Player 2; Player 1 claiming again is rejected")
    void testTurnEngine_EnforcesAlternatingTurns() {
        GameSessionResponse session = battleSessionService.createGame(player1.getId());
        battleSessionService.joinGame(session.getCode(), player2.getId());

        Cell cell1 = cellRepository.findBySessionIdAndXAndY(session.getGameId(), 8, 7).orElseThrow();
        Cell cell2 = cellRepository.findBySessionIdAndXAndY(session.getGameId(), 16, 17).orElseThrow();

        // Player 1's turn -> should succeed
        ClaimCellResponse claim1 = claimService.claimCell(session.getGameId(), player1.getId(), cell1.getId());
        assertThat(claim1.isSuccess()).isTrue();
        assertThat(claim1.getStatus()).isEqualTo(ClaimStatus.SUCCESS);
        assertThat(claim1.getNextPlayerId()).isEqualTo(player2.getId());
        assertThat(claim1.getTurnNumber()).isEqualTo(2);

        // Player 1 attempts to claim again out of turn -> rejected with NOT_YOUR_TURN
        ClaimCellResponse claimOutTurn = claimService.claimCell(session.getGameId(), player1.getId(), cell2.getId());
        assertThat(claimOutTurn.isSuccess()).isFalse();
        assertThat(claimOutTurn.getStatus()).isEqualTo(ClaimStatus.NOT_YOUR_TURN);

        // Player 2 claims -> should succeed
        ClaimCellResponse claim2 = claimService.claimCell(session.getGameId(), player2.getId(), cell2.getId());
        assertThat(claim2.isSuccess()).isTrue();
        assertThat(claim2.getStatus()).isEqualTo(ClaimStatus.SUCCESS);
        assertThat(claim2.getNextPlayerId()).isEqualTo(player1.getId());
        assertThat(claim2.getTurnNumber()).isEqualTo(3);
    }

    @Test
    @DisplayName("13-14. Cross-session isolation: Player cannot claim cell belonging to another session")
    void testCrossSessionIsolation_CannotClaimCellFromOtherSession() {
        GameSessionResponse sessionA = battleSessionService.createGame(player1.getId());
        battleSessionService.joinGame(sessionA.getCode(), player2.getId());

        GameSessionResponse sessionB = battleSessionService.createGame(player2.getId());
        battleSessionService.joinGame(sessionB.getCode(), player3.getId());

        List<Cell> cellsB = cellRepository.findBySessionIdOrderByYAscXAsc(sessionB.getGameId());
        Cell cellFromB = cellsB.get(0);

        // Player 1 attempts to claim cellFromB inside sessionA
        assertThatThrownBy(() -> claimService.claimCell(sessionA.getGameId(), player1.getId(), cellFromB.getId()))
                .isInstanceOf(com.claimgrid.exception.CellNotFoundException.class);
    }

    @Test
    @DisplayName("15. Concurrent turn attempt: 2 simultaneous claims on Player 1's turn result in exactly 1 success")
    void testConcurrentTurnClaims_RowLockingPreventsDoubleTurns() throws Exception {
        GameSessionResponse session = battleSessionService.createGame(player1.getId());
        battleSessionService.joinGame(session.getCode(), player2.getId());

        Cell cell1 = cellRepository.findBySessionIdAndXAndY(session.getGameId(), 8, 7).orElseThrow();
        Cell cell2 = cellRepository.findBySessionIdAndXAndY(session.getGameId(), 16, 17).orElseThrow();

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        // Thread 1: Player 1 claims cell1 for turn 1
        executor.submit(() -> {
            try {
                startLatch.await();
                ClaimCellResponse resp = claimService.claimCell(session.getGameId(), player1.getId(), cell1.getId(), 1);
                if (resp.isSuccess()) successCount.incrementAndGet();
                else rejectedCount.incrementAndGet();
            } catch (Exception e) {
                rejectedCount.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        });

        // Thread 2: Player 2 attempts to claim cell2 concurrently during turn 1
        executor.submit(() -> {
            try {
                startLatch.await();
                ClaimCellResponse resp = claimService.claimCell(session.getGameId(), player2.getId(), cell2.getId(), 1);
                if (resp.isSuccess()) successCount.incrementAndGet();
                else rejectedCount.incrementAndGet();
            } catch (Exception e) {
                rejectedCount.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        });

        startLatch.countDown();
        assertThat(doneLatch.await(5, TimeUnit.SECONDS)).isTrue();
        executor.shutdown();

        // Exactly one should succeed (Player 1) and Player 2 should be rejected as NOT_YOUR_TURN
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(rejectedCount.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("18. REST API /api/games endpoints: create, join, get state, and claim")
    void testBattleRestEndpoints() {
        // 1. POST /api/games
        CreateGameRequest createReq = new CreateGameRequest(player1.getId());
        ResponseEntity<GameSessionResponse> createResp = restTemplate.postForEntity(
                "/api/games", createReq, GameSessionResponse.class);

        assertThat(createResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        GameSessionResponse created = createResp.getBody();
        assertThat(created).isNotNull();
        String code = created.getCode();

        // 2. POST /api/games/{code}/join
        JoinGameRequest joinReq = new JoinGameRequest(player2.getId());
        ResponseEntity<GameSessionResponse> joinResp = restTemplate.postForEntity(
                "/api/games/" + code + "/join", joinReq, GameSessionResponse.class);

        assertThat(joinResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        GameSessionResponse joined = joinResp.getBody();
        assertThat(joined).isNotNull();
        assertThat(joined.getStatus()).isEqualTo(GameStatus.ACTIVE);

        // 3. GET /api/games/{gameId}/state
        ResponseEntity<SessionGameStateResponse> stateResp = restTemplate.getForEntity(
                "/api/games/" + joined.getGameId() + "/state", SessionGameStateResponse.class);

        assertThat(stateResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        SessionGameStateResponse state = stateResp.getBody();
        assertThat(state).isNotNull();
        assertThat(state.getWidth()).isEqualTo(25);
        assertThat(state.getHeight()).isEqualTo(25);
        assertThat(state.getTotalCells()).isEqualTo(625);
        assertThat(state.getCells()).hasSize(625);
        assertThat(state.getCurrentPlayerId()).isEqualTo(player1.getId());

        // 4. POST /api/games/{gameId}/cells/{cellId}/claim
        Long firstCellId = cellRepository.findBySessionIdAndXAndY(joined.getGameId(), 8, 7).orElseThrow().getId();
        ClaimCellRequest claimReq = new ClaimCellRequest(player1.getId());
        ResponseEntity<ClaimCellResponse> claimResp = restTemplate.postForEntity(
                "/api/games/" + joined.getGameId() + "/cells/" + firstCellId + "/claim",
                claimReq, ClaimCellResponse.class);

        assertThat(claimResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        ClaimCellResponse claimResult = claimResp.getBody();
        assertThat(claimResult).isNotNull();
        assertThat(claimResult.isSuccess()).isTrue();
        assertThat(claimResult.getNextPlayerId()).isEqualTo(player2.getId());
        assertThat(claimResult.getTurnNumber()).isEqualTo(2);
    }
}

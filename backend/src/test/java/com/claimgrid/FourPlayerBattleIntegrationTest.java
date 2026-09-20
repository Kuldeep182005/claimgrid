package com.claimgrid;

import com.claimgrid.config.GameProperties;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FourPlayerBattleIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private BattleSessionService battleSessionService;

    @Autowired
    private ClaimService claimService;

    @Autowired
    private GameProperties gameProperties;

    private Player p1;
    private Player p2;
    private Player p3;
    private Player p4;
    private Player p5;

    @BeforeEach
    void setUp() {
        cleanDatabase();

        p1 = playerRepository.save(Player.builder().username("Player_Alpha").color("#EF4444").build());
        p2 = playerRepository.save(Player.builder().username("Player_Beta").color("#3B82F6").build());
        p3 = playerRepository.save(Player.builder().username("Player_Gamma").color("#10B981").build());
        p4 = playerRepository.save(Player.builder().username("Player_Delta").color("#F59E0B").build());
        p5 = playerRepository.save(Player.builder().username("Player_Epsilon").color("#8B5CF6").build());
    }

    @Test
    @DisplayName("Invalid player count is rejected (only 2 or 4 allowed)")
    void createGame_invalidPlayerCount_rejected() {
        assertThatThrownBy(() -> battleSessionService.createGame(p1.getId(), 1))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("must be 2 or 4");

        assertThatThrownBy(() -> battleSessionService.createGame(p1.getId(), 3))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("must be 2 or 4");

        assertThatThrownBy(() -> battleSessionService.createGame(p1.getId(), 5))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("must be 2 or 4");

        assertThatThrownBy(() -> battleSessionService.createGame(p1.getId(), 6))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("must be 2 or 4");
    }

    @Test
    @DisplayName("2-player match starts when 2 players join")
    void twoPlayerMatch_startsAtTwoPlayers() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 2);
        assertThat(session.getStatus()).isEqualTo(GameStatus.WAITING);
        assertThat(session.getMaxPlayers()).isEqualTo(2);
        assertThat(session.getPlayerCount()).isEqualTo(1);

        GameSessionResponse joined = battleSessionService.joinGame(session.getCode(), p2.getId());
        assertThat(joined.getStatus()).isEqualTo(GameStatus.ACTIVE);
        assertThat(joined.getPlayerCount()).isEqualTo(2);
        assertThat(joined.getCurrentPlayerId()).isEqualTo(p1.getId());
        assertThat(joined.getTurnNumber()).isEqualTo(1);
    }

    @Test
    @DisplayName("4-player match starts only after four players join")
    void fourPlayerMatch_startsOnlyAtFourPlayers() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);
        assertThat(session.getStatus()).isEqualTo(GameStatus.WAITING);
        assertThat(session.getMaxPlayers()).isEqualTo(4);
        assertThat(session.getPlayerCount()).isEqualTo(1);

        // Player 2 joins -> remains WAITING
        GameSessionResponse step2 = battleSessionService.joinGame(session.getCode(), p2.getId());
        assertThat(step2.getStatus()).isEqualTo(GameStatus.WAITING);
        assertThat(step2.getPlayerCount()).isEqualTo(2);

        // Player 3 joins -> remains WAITING
        GameSessionResponse step3 = battleSessionService.joinGame(session.getCode(), p3.getId());
        assertThat(step3.getStatus()).isEqualTo(GameStatus.WAITING);
        assertThat(step3.getPlayerCount()).isEqualTo(3);

        // Player 4 joins -> transitions to ACTIVE!
        GameSessionResponse step4 = battleSessionService.joinGame(session.getCode(), p4.getId());
        assertThat(step4.getStatus()).isEqualTo(GameStatus.ACTIVE);
        assertThat(step4.getPlayerCount()).isEqualTo(4);
        assertThat(step4.getCurrentPlayerId()).isEqualTo(p1.getId());
        assertThat(step4.getTurnNumber()).isEqualTo(1);
        assertThat(step4.getPlayers()).hasSize(4);
    }

    @Test
    @DisplayName("Fifth player is rejected when 4-player match is full")
    void fourPlayerMatch_fifthPlayerRejected() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);
        battleSessionService.joinGame(session.getCode(), p2.getId());
        battleSessionService.joinGame(session.getCode(), p3.getId());
        battleSessionService.joinGame(session.getCode(), p4.getId());

        assertThatThrownBy(() -> battleSessionService.joinGame(session.getCode(), p5.getId()))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("cannot be joined");
    }

    @Test
    @DisplayName("Duplicate player join is rejected")
    void duplicateJoin_rejected() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);

        // Creator cannot join own battle
        assertThatThrownBy(() -> battleSessionService.joinGame(session.getCode(), p1.getId()))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("Player cannot join their own battle");

        battleSessionService.joinGame(session.getCode(), p2.getId());

        // Player 2 cannot join again
        assertThatThrownBy(() -> battleSessionService.joinGame(session.getCode(), p2.getId()))
                .isInstanceOf(InvalidGameRequestException.class)
                .hasMessageContaining("Player cannot join their own battle");
    }

    @Test
    @DisplayName("4-player starting positions are valid, separated, and assigned to each player")
    void fourPlayer_startingPositionsAssigned() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);
        battleSessionService.joinGame(session.getCode(), p2.getId());
        battleSessionService.joinGame(session.getCode(), p3.getId());
        battleSessionService.joinGame(session.getCode(), p4.getId());

        UUID sessionId = session.getGameId();
        List<Cell> p1Cells = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(sessionId, p1.getId());
        List<Cell> p2Cells = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(sessionId, p2.getId());
        List<Cell> p3Cells = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(sessionId, p3.getId());
        List<Cell> p4Cells = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(sessionId, p4.getId());

        assertThat(p1Cells).hasSize(2);
        assertThat(p2Cells).hasSize(2);
        assertThat(p3Cells).hasSize(2);
        assertThat(p4Cells).hasSize(2);

        // Verify North: (12, 4), (13, 5)
        assertThat(p1Cells).extracting(c -> c.getX() + "," + c.getY())
                .containsExactlyInAnyOrder("12,4", "13,5");

        // Verify East: (20, 12), (19, 13)
        assertThat(p2Cells).extracting(c -> c.getX() + "," + c.getY())
                .containsExactlyInAnyOrder("20,12", "19,13");

        // Verify South: (12, 20), (11, 19)
        assertThat(p3Cells).extracting(c -> c.getX() + "," + c.getY())
                .containsExactlyInAnyOrder("12,20", "11,19");

        // Verify West: (4, 12), (5, 11)
        assertThat(p4Cells).extracting(c -> c.getX() + "," + c.getY())
                .containsExactlyInAnyOrder("4,12", "5,11");
    }

    @Test
    @DisplayName("4-player turn order cycles A -> B -> C -> D -> A on successful actions")
    void fourPlayer_turnOrderCycle() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);
        battleSessionService.joinGame(session.getCode(), p2.getId());
        battleSessionService.joinGame(session.getCode(), p3.getId());
        battleSessionService.joinGame(session.getCode(), p4.getId());

        UUID sessionId = session.getGameId();

        // 1. P1's turn (Turn 1): P1 claims adjacent cell to (12,4)/(13,5) e.g. (12,3)
        Cell c1 = cellRepository.findBySessionIdAndXAndY(sessionId, 12, 3).orElseThrow();
        ClaimCellResponse resp1 = claimService.claimCell(sessionId, p1.getId(), c1.getId());
        assertThat(resp1.isSuccess()).isTrue();
        assertThat(resp1.getNextPlayerId()).isEqualTo(p2.getId());
        assertThat(resp1.getTurnNumber()).isEqualTo(2);

        // 2. P2's turn (Turn 2): P2 claims adjacent cell to (20,12)/(19,13) e.g. (20,11)
        Cell c2 = cellRepository.findBySessionIdAndXAndY(sessionId, 20, 11).orElseThrow();
        ClaimCellResponse resp2 = claimService.claimCell(sessionId, p2.getId(), c2.getId());
        assertThat(resp2.isSuccess()).isTrue();
        assertThat(resp2.getNextPlayerId()).isEqualTo(p3.getId());
        assertThat(resp2.getTurnNumber()).isEqualTo(3);

        // 3. P3's turn (Turn 3): P3 claims adjacent cell to (12,20)/(11,19) e.g. (12,21)
        Cell c3 = cellRepository.findBySessionIdAndXAndY(sessionId, 12, 21).orElseThrow();
        ClaimCellResponse resp3 = claimService.claimCell(sessionId, p3.getId(), c3.getId());
        assertThat(resp3.isSuccess()).isTrue();
        assertThat(resp3.getNextPlayerId()).isEqualTo(p4.getId());
        assertThat(resp3.getTurnNumber()).isEqualTo(4);

        // 4. P4's turn (Turn 4): P4 claims adjacent cell to (4,12)/(5,11) e.g. (4,11)
        Cell c4 = cellRepository.findBySessionIdAndXAndY(sessionId, 4, 11).orElseThrow();
        ClaimCellResponse resp4 = claimService.claimCell(sessionId, p4.getId(), c4.getId());
        assertThat(resp4.isSuccess()).isTrue();
        assertThat(resp4.getNextPlayerId()).isEqualTo(p1.getId()); // cycles back to P1!
        assertThat(resp4.getTurnNumber()).isEqualTo(5);
    }

    @Test
    @DisplayName("Invalid action does not advance turn in 4-player game")
    void invalidAction_doesNotAdvanceTurn() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);
        battleSessionService.joinGame(session.getCode(), p2.getId());
        battleSessionService.joinGame(session.getCode(), p3.getId());
        battleSessionService.joinGame(session.getCode(), p4.getId());

        UUID sessionId = session.getGameId();

        // P2 tries to claim out of turn
        Cell c = cellRepository.findBySessionIdAndXAndY(sessionId, 20, 11).orElseThrow();
        ClaimCellResponse outOfTurn = claimService.claimCell(sessionId, p2.getId(), c.getId());
        assertThat(outOfTurn.isSuccess()).isFalse();
        assertThat(outOfTurn.getStatus()).isEqualTo(ClaimStatus.NOT_YOUR_TURN);

        // Turn is still 1 and still P1's turn
        GameSession updated = gameSessionRepository.findById(sessionId).orElseThrow();
        assertThat(updated.getTurnNumber()).isEqualTo(1);
        assertThat(updated.getCurrentPlayerId()).isEqualTo(p1.getId());

        // P1 tries to claim unadjacent cell (0, 0)
        Cell nonAdj = cellRepository.findBySessionIdAndXAndY(sessionId, 0, 0).orElseThrow();
        ClaimCellResponse nonAdjResp = claimService.claimCell(sessionId, p1.getId(), nonAdj.getId());
        assertThat(nonAdjResp.isSuccess()).isFalse();
        assertThat(nonAdjResp.getStatus()).isEqualTo(ClaimStatus.FRONTIER_INVALID);

        // Turn is STILL 1 and still P1's turn
        updated = gameSessionRepository.findById(sessionId).orElseThrow();
        assertThat(updated.getTurnNumber()).isEqualTo(1);
        assertThat(updated.getCurrentPlayerId()).isEqualTo(p1.getId());
    }

    @Test
    @DisplayName("Player can attack an adjacent cell owned by any enemy player in the session")
    void fourPlayer_attackEnemyCell() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);
        battleSessionService.joinGame(session.getCode(), p2.getId());
        battleSessionService.joinGame(session.getCode(), p3.getId());
        battleSessionService.joinGame(session.getCode(), p4.getId());

        UUID sessionId = session.getGameId();

        // Place an enemy cell owned by P2 adjacent to P1's starting position (12, 4) -> at (12, 3)
        Cell enemyCell = cellRepository.findBySessionIdAndXAndY(sessionId, 12, 3).orElseThrow();
        enemyCell.setOwnerId(p2.getId());
        cellRepository.save(enemyCell);

        // P1 attacks the enemy cell at (12, 3)
        ClaimCellResponse attackResp = claimService.attackCell(sessionId, p1.getId(), enemyCell.getId());
        assertThat(attackResp.isSuccess()).isTrue();
        assertThat(attackResp.getStatus()).isEqualTo(ClaimStatus.ATTACK_SUCCESS);
        assertThat(attackResp.getOwnerId()).isEqualTo(p1.getId());

        // Turn advances to P2
        assertThat(attackResp.getNextPlayerId()).isEqualTo(p2.getId());
        assertThat(attackResp.getTurnNumber()).isEqualTo(2);

        // Verify cell ownership changed in DB
        Cell captured = cellRepository.findById(enemyCell.getId()).orElseThrow();
        assertThat(captured.getOwnerId()).isEqualTo(p1.getId());
    }

    @Test
    @DisplayName("Player cannot attack their own cell or non-adjacent enemy cell")
    void attackValidation_rejectsOwnOrNonAdjacent() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);
        battleSessionService.joinGame(session.getCode(), p2.getId());
        battleSessionService.joinGame(session.getCode(), p3.getId());
        battleSessionService.joinGame(session.getCode(), p4.getId());

        UUID sessionId = session.getGameId();

        // P1's own cell
        Cell ownCell = cellRepository.findBySessionIdAndXAndY(sessionId, 12, 4).orElseThrow();
        ClaimCellResponse attackOwn = claimService.attackCell(sessionId, p1.getId(), ownCell.getId());
        assertThat(attackOwn.isSuccess()).isFalse();
        assertThat(attackOwn.getStatus()).isEqualTo(ClaimStatus.ATTACK_REJECTED);

        // P2's cell at (20, 12) is far away from P1 (not adjacent)
        Cell farCell = cellRepository.findBySessionIdAndXAndY(sessionId, 20, 12).orElseThrow();
        ClaimCellResponse attackFar = claimService.attackCell(sessionId, p1.getId(), farCell.getId());
        assertThat(attackFar.isSuccess()).isFalse();
        assertThat(attackFar.getStatus()).isEqualTo(ClaimStatus.FRONTIER_INVALID);
    }

    @Test
    @DisplayName("Leaderboard and gameState contain all 4 players with independent score and territory")
    void fourPlayer_leaderboardAndScores() {
        GameSessionResponse session = battleSessionService.createGame(p1.getId(), 4);
        battleSessionService.joinGame(session.getCode(), p2.getId());
        battleSessionService.joinGame(session.getCode(), p3.getId());
        battleSessionService.joinGame(session.getCode(), p4.getId());

        SessionGameStateResponse state = battleSessionService.getSessionState(session.getGameId());
        assertThat(state.getMaxPlayers()).isEqualTo(4);
        assertThat(state.getPlayers()).hasSize(4);

        for (var p : state.getPlayers()) {
            assertThat(p.getCellsClaimed()).isEqualTo(2);
            assertThat(p.getScore()).isPositive();
        }
    }

    @Test
    @DisplayName("REST API create with maxPlayers=4 and join works end-to-end")
    void restApi_fourPlayerEndToEnd() {
        CreateGameRequest createReq = new CreateGameRequest(p1.getId(), 4);
        ResponseEntity<GameSessionResponse> createResp = restTemplate.postForEntity("/api/games", createReq, GameSessionResponse.class);
        assertThat(createResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        GameSessionResponse body = createResp.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getMaxPlayers()).isEqualTo(4);
        assertThat(body.getStatus()).isEqualTo(GameStatus.WAITING);

        // Join P2
        JoinGameRequest joinReq2 = new JoinGameRequest(p2.getId());
        ResponseEntity<GameSessionResponse> joinResp2 = restTemplate.postForEntity("/api/games/" + body.getCode() + "/join", joinReq2, GameSessionResponse.class);
        assertThat(joinResp2.getBody().getStatus()).isEqualTo(GameStatus.WAITING);

        // Join P3
        JoinGameRequest joinReq3 = new JoinGameRequest(p3.getId());
        ResponseEntity<GameSessionResponse> joinResp3 = restTemplate.postForEntity("/api/games/" + body.getCode() + "/join", joinReq3, GameSessionResponse.class);
        assertThat(joinResp3.getBody().getStatus()).isEqualTo(GameStatus.WAITING);

        // Join P4
        JoinGameRequest joinReq4 = new JoinGameRequest(p4.getId());
        ResponseEntity<GameSessionResponse> joinResp4 = restTemplate.postForEntity("/api/games/" + body.getCode() + "/join", joinReq4, GameSessionResponse.class);
        assertThat(joinResp4.getBody().getStatus()).isEqualTo(GameStatus.ACTIVE);
        assertThat(joinResp4.getBody().getTurnNumber()).isEqualTo(1);
    }
}

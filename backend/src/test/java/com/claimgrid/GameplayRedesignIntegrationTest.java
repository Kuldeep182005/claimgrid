package com.claimgrid;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.ClaimStatus;
import com.claimgrid.dto.GameSessionResponse;
import com.claimgrid.dto.SessionGameStateResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.GameSession;
import com.claimgrid.entity.Player;
import com.claimgrid.service.BattleSessionService;
import com.claimgrid.service.ClaimService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class GameplayRedesignIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private BattleSessionService battleSessionService;

    @Autowired
    private ClaimService claimService;

    @Autowired
    private GameProperties gameProperties;

    private Player player1;
    private Player player2;

    @BeforeEach
    void setUp() {
        cleanDatabase();
        gameProperties.setCooldownMs(0);
        gameProperties.setMatchTurnLimit(40);

        player1 = playerRepository.save(Player.builder()
                .username("FrontierOne")
                .color("#EF4444")
                .build());
        player2 = playerRepository.save(Player.builder()
                .username("FrontierTwo")
                .color("#3B82F6")
                .build());
    }

    @Test
    void fairStartingPositionsAreAssignedAndFarApart() {
        GameSessionResponse created = battleSessionService.createGame(player1.getId());
        GameSessionResponse joined = battleSessionService.joinGame(created.getCode(), player2.getId());

        UUID sessionId = joined.getGameId();
        List<Cell> p1Cells = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(sessionId, player1.getId());
        List<Cell> p2Cells = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(sessionId, player2.getId());

        assertThat(p1Cells).hasSizeGreaterThanOrEqualTo(2);
        assertThat(p2Cells).hasSizeGreaterThanOrEqualTo(2);

        Cell first = p1Cells.get(0);
        Cell second = p2Cells.get(0);
        int distance = Math.max(Math.abs(first.getX() - second.getX()), Math.abs(first.getY() - second.getY()));
        assertThat(distance).isGreaterThan(7);

        SessionGameStateResponse state = battleSessionService.getSessionState(sessionId);
        assertThat(state.getPlayer1Score()).isPositive();
        assertThat(state.getPlayer2Score()).isPositive();
    }

    @Test
    void frontierValidationUsesEightDirectionAdjacency() {
        GameSessionResponse created = battleSessionService.createGame(player1.getId());
        GameSessionResponse joined = battleSessionService.joinGame(created.getCode(), player2.getId());

        UUID sessionId = joined.getGameId();
        Cell valid = cellRepository.findBySessionIdAndXAndY(sessionId, 8, 7).orElseThrow();
        Cell invalid = cellRepository.findBySessionIdAndXAndY(sessionId, 0, 0).orElseThrow();

        ClaimCellResponse validClaim = claimService.claimCell(sessionId, player1.getId(), valid.getId());
        assertThat(validClaim.isSuccess()).isTrue();
        assertThat(validClaim.getStatus()).isEqualTo(ClaimStatus.SUCCESS);

        GameSession session = gameSessionRepository.findById(sessionId).orElseThrow();
        session.setCurrentPlayerId(player1.getId());
        session.setTurnNumber(1);
        gameSessionRepository.save(session);

        ClaimCellResponse invalidClaim = claimService.claimCell(sessionId, player1.getId(), invalid.getId());
        assertThat(invalidClaim.isSuccess()).isFalse();
        assertThat(invalidClaim.getStatus()).isEqualTo(ClaimStatus.FRONTIER_INVALID);
    }

    @Test
    void adjacentEnemyAttackCapturesTargetCell() {
        GameSessionResponse created = battleSessionService.createGame(player1.getId());
        GameSessionResponse joined = battleSessionService.joinGame(created.getCode(), player2.getId());

        UUID sessionId = joined.getGameId();
        GameSession session = gameSessionRepository.findById(sessionId).orElseThrow();
        session.setCurrentPlayerId(player1.getId());
        session.setTurnNumber(1);
        gameSessionRepository.save(session);

        Cell enemyCell = cellRepository.findBySessionIdAndXAndY(sessionId, 7, 8).orElseThrow();
        enemyCell.setOwnerId(player2.getId());
        enemyCell.setClaimedAt(Instant.now());
        cellRepository.save(enemyCell);

        ClaimCellResponse response = claimService.attackCell(sessionId, player1.getId(), enemyCell.getId());
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getStatus()).isEqualTo(ClaimStatus.ATTACK_SUCCESS);
        assertThat(cellRepository.findById(enemyCell.getId()).orElseThrow().getOwnerId()).isEqualTo(player1.getId());
    }

    @Test
    void matchScoringUsesConnectedTerritoryBonusAndTurnLimit() {
        gameProperties.setMatchTurnLimit(2);
        GameSessionResponse created = battleSessionService.createGame(player1.getId());
        GameSessionResponse joined = battleSessionService.joinGame(created.getCode(), player2.getId());

        UUID sessionId = joined.getGameId();
        Cell player1Cell = cellRepository.findBySessionIdAndXAndY(sessionId, 8, 7).orElseThrow();
        ClaimCellResponse firstMove = claimService.claimCell(sessionId, player1.getId(), player1Cell.getId());
        assertThat(firstMove.isSuccess()).isTrue();

        Cell player2Cell = cellRepository.findBySessionIdAndXAndY(sessionId, 16, 17).orElseThrow();
        ClaimCellResponse secondMove = claimService.claimCell(sessionId, player2.getId(), player2Cell.getId());
        assertThat(secondMove.isSuccess()).isTrue();

        GameSession finished = gameSessionRepository.findById(sessionId).orElseThrow();
        assertThat(finished.getStatus().name()).isEqualTo("FINISHED");
        assertThat(finished.getTurnLimit()).isEqualTo(2);
        assertThat(finished.getPlayer1Score() + finished.getPlayer2Score()).isGreaterThan(0);
    }
}



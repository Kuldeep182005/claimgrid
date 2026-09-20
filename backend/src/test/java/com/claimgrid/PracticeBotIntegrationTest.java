package com.claimgrid;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.GameSessionResponse;
import com.claimgrid.entity.Player;
import com.claimgrid.service.BattleSessionService;
import com.claimgrid.service.ClaimService;
import com.claimgrid.service.PracticeBotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class PracticeBotIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private PracticeBotService practiceBotService;

    @Autowired
    private ClaimService claimService;

    @Autowired
    private GameProperties gameProperties;

    private Player human;

    @BeforeEach
    void setUpPractice() {
        cleanDatabase();
        gameProperties.setCooldownMs(50);
        human = playerRepository.save(Player.builder()
                .username("PracticeHuman")
                .color("#6366F1")
                .build());
    }

    @Test
    void createsIsolatedPracticeGameAndRunsExactlyOneBotWorker() throws Exception {
        GameSessionResponse practice = practiceBotService.createPracticeGame(human.getId());

        assertThat(practice.isPractice()).isTrue();
        assertThat(practice.getPlayerCount()).isEqualTo(2);
        assertThat(practice.getPlayers()).extracting("username")
                .containsExactlyInAnyOrder("PracticeHuman", PracticeBotService.BOT_USERNAME);
        assertThat(cellRepository.countBySessionId(practice.getGameId()))
                .isEqualTo(BattleSessionService.TOTAL_CELLS);
        assertThat(practiceBotService.getWorkerCount()).isEqualTo(1);

        long globalClaimedBefore = countGlobalClaims();
        ClaimCellResponse humanClaim = claimService.claimCell(
                practice.getGameId(),
                human.getId(),
                cellRepository.findBySessionIdAndXAndY(practice.getGameId(), 8, 7).orElseThrow().getId());
        assertThat(humanClaim.isSuccess()).isTrue();

        awaitUntil(() -> cellRepository.countBySessionIdAndOwnerId(
                practice.getGameId(),
                playerRepository.findByUsername(PracticeBotService.BOT_USERNAME).orElseThrow().getId()) > 0);
        assertThat(countGlobalClaims()).isEqualTo(globalClaimedBefore);
        assertThat(playerRepository.findById(human.getId()).orElseThrow().getCellsClaimed()).isZero();
        assertThat(playerRepository.findByUsername(PracticeBotService.BOT_USERNAME).orElseThrow().getCellsClaimed()).isZero();

        practiceBotService.endPracticeGame(practice.getGameId(), human.getId());
        awaitUntil(() -> practiceBotService.getWorkerCount() == 0);
        assertThat(gameSessionRepository.findById(practice.getGameId()).orElseThrow().getStatus().name())
                .isEqualTo("FINISHED");
    }

    private void awaitUntil(BooleanSupplier condition) throws Exception {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(5));
        while (!condition.getAsBoolean() && Instant.now().isBefore(deadline)) {
            Thread.sleep(50);
        }
        assertThat(condition.getAsBoolean()).isTrue();
    }

    private long countGlobalClaims() {
        return cellRepository.findAllGlobalCellsOrderByYAscXAsc().stream()
                .filter(cell -> cell.getOwnerId() != null)
                .count();
    }

    @FunctionalInterface
    private interface BooleanSupplier {
        boolean getAsBoolean();
    }
}



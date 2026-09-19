package com.claimgrid;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.ClaimStatus;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.Player;
import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.PlayerRepository;
import com.claimgrid.service.ClaimService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class ConcurrentClaimIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private CellRepository cellRepository;

    @Autowired
    private GameProperties gameProperties;

    @BeforeEach
    void setUp() {
        cleanDatabase();
    }

    @Test
    @DisplayName("Section 25: 50 concurrent claim attempts on the SAME cell must result in exactly ONE winner")
    void testConcurrentClaimsOnSameCell_ExactlyOneWinner() throws Exception {
        int threadCount = 50;

        // 1. Pick an unowned cell
        Cell targetCell = cellRepository.findByXAndY(10, 10)
                .orElseThrow(() -> new IllegalStateException("Cell (10, 10) not found"));
        assertThat(targetCell.getOwnerId()).isNull();
        Long cellId = targetCell.getId();

        // 2. Create 50 distinct players
        List<Player> players = new ArrayList<>();
        Instant now = Instant.now();
        for (int i = 0; i < threadCount; i++) {
            players.add(Player.builder()
                    .username("Contender_" + i)
                    .color("#3B82F6")
                    .cellsClaimed(0)
                    .currentStreak(0)
                    .createdAt(now)
                    .lastSeenAt(now)
                    .build());
        }
        playerRepository.saveAll(players);

        // 3. Prepare concurrent execution with CountDownLatch for simultaneous release
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        List<Callable<ClaimCellResponse>> tasks = new ArrayList<>();
        for (Player player : players) {
            UUID playerId = player.getId();
            tasks.add(() -> {
                readyLatch.countDown();
                // Block until all threads are prepped and startLatch is released
                startLatch.await();
                return claimService.claimCell(playerId, cellId);
            });
        }

        // 4. Launch all tasks simultaneously
        List<Future<ClaimCellResponse>> futures = new ArrayList<>();
        for (Callable<ClaimCellResponse> task : tasks) {
            futures.add(executor.submit(task));
        }

        // Wait for all threads to be ready, then fire simultaneously
        boolean allReady = readyLatch.await(10, TimeUnit.SECONDS);
        assertThat(allReady).isTrue();
        startLatch.countDown(); // FIRE ALL THREADS SIMULTANEOUSLY

        // 5. Gather outcomes
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);
        UUID winningPlayerId = null;

        for (Future<ClaimCellResponse> future : futures) {
            ClaimCellResponse result = future.get(15, TimeUnit.SECONDS);
            if (result.isSuccess()) {
                successCount.incrementAndGet();
                winningPlayerId = result.getOwnerId();
                assertThat(result.getStatus()).isEqualTo(ClaimStatus.SUCCESS);
            } else {
                rejectedCount.incrementAndGet();
                assertThat(result.getStatus()).isEqualTo(ClaimStatus.CELL_ALREADY_CLAIMED);
            }
        }

        executor.shutdown();
        boolean terminated = executor.awaitTermination(5, TimeUnit.SECONDS);
        assertThat(terminated).isTrue();

        // 6. Assertions on concurrent claim results:
        // Exactly ONE claim must succeed
        assertThat(successCount.get())
                .as("Exactly ONE claim must succeed among concurrent contenders")
                .isEqualTo(1);

        // Exactly (threadCount - 1) claims must fail
        assertThat(rejectedCount.get())
                .as("All losing claims must be rejected")
                .isEqualTo(threadCount - 1);

        // 7. Verify authoritative database state for the Cell
        Cell updatedCell = cellRepository.findById(cellId).orElseThrow();
        assertThat(updatedCell.getOwnerId())
                .as("Cell owner in database must match the winning player ID")
                .isNotNull()
                .isEqualTo(winningPlayerId);
        assertThat(updatedCell.getClaimedAt()).isNotNull();

        // 8. Verify authoritative database state for Players
        Player winningPlayer = playerRepository.findById(winningPlayerId).orElseThrow();
        assertThat(winningPlayer.getCellsClaimed())
                .as("Winning player's cellsClaimed must be exactly 1")
                .isEqualTo(1);
        assertThat(winningPlayer.getLastClaimAt())
                .as("Winning player's lastClaimAt must be recorded")
                .isNotNull();

        for (Player contender : players) {
            if (!contender.getId().equals(winningPlayerId)) {
                Player loser = playerRepository.findById(contender.getId()).orElseThrow();
                assertThat(loser.getCellsClaimed())
                        .as("Losing player %s cellsClaimed must remain 0", loser.getUsername())
                        .isEqualTo(0);
                assertThat(loser.getLastClaimAt())
                        .as("Losing player %s lastClaimAt must remain null", loser.getUsername())
                        .isNull();
            }
        }
    }

    @Test
    @DisplayName("Section 24 & 26: 20 simultaneous claims on DIFFERENT cells by the SAME player must enforce cooldown: exactly ONE succeeds, 19 rejected")
    void testConcurrentClaimsBySamePlayer_CooldownEnforcesSingleSuccess() throws Exception {
        int cellCount = 20;

        // 1. Create a single player with no previous claim
        Instant now = Instant.now();
        Player player = playerRepository.save(Player.builder()
                .username("RapidClaimer")
                .color("#10B981")
                .cellsClaimed(0)
                .currentStreak(0)
                .createdAt(now)
                .lastSeenAt(now)
                .build());
        UUID playerId = player.getId();

        // 2. Select 20 distinct unowned cells (coordinates (20, 0) through (20, 19))
        List<Long> cellIds = new ArrayList<>();
        for (int y = 0; y < cellCount; y++) {
            final int targetY = y;
            Cell cell = cellRepository.findByXAndY(20, targetY)
                    .orElseThrow(() -> new IllegalStateException("Cell (20, " + targetY + ") not found"));
            assertThat(cell.getOwnerId()).isNull();
            cellIds.add(cell.getId());
        }

        // 3. Prepare concurrent execution
        ExecutorService executor = Executors.newFixedThreadPool(cellCount);
        CountDownLatch readyLatch = new CountDownLatch(cellCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        List<Callable<ClaimCellResponse>> tasks = new ArrayList<>();
        for (Long cellId : cellIds) {
            tasks.add(() -> {
                readyLatch.countDown();
                startLatch.await();
                return claimService.claimCell(playerId, cellId);
            });
        }

        List<Future<ClaimCellResponse>> futures = new ArrayList<>();
        for (Callable<ClaimCellResponse> task : tasks) {
            futures.add(executor.submit(task));
        }

        boolean allReady = readyLatch.await(10, TimeUnit.SECONDS);
        assertThat(allReady).isTrue();
        startLatch.countDown(); // FIRE ALL 20 CLAIMS SIMULTANEOUSLY

        // 4. Gather results: exactly 1 must succeed, 19 must be rejected due to COOLDOWN_ACTIVE
        int successCount = 0;
        int cooldownRejectedCount = 0;

        for (Future<ClaimCellResponse> future : futures) {
            ClaimCellResponse result = future.get(15, TimeUnit.SECONDS);
            if (result.isSuccess()) {
                successCount++;
                assertThat(result.getStatus()).isEqualTo(ClaimStatus.SUCCESS);
                assertThat(result.getOwnerId()).isEqualTo(playerId);
            } else {
                cooldownRejectedCount++;
                assertThat(result.getStatus()).isEqualTo(ClaimStatus.COOLDOWN_ACTIVE);
                assertThat(result.getRemainingCooldownMs()).isGreaterThan(0L);
            }
        }

        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);

        assertThat(successCount)
                .as("Only the initial claim must succeed before cooldown activates")
                .isEqualTo(1);
        assertThat(cooldownRejectedCount)
                .as("All simultaneous subsequent claims by the same player must be rejected by cooldown")
                .isEqualTo(cellCount - 1);

        // 5. Verify authoritative database statistics: territory count is strictly 1
        Player updatedPlayer = playerRepository.findById(playerId).orElseThrow();
        assertThat(updatedPlayer.getCellsClaimed())
                .as("cellsClaimed must be exactly 1 (server-side cooldown prevents double increments)")
                .isEqualTo(1);
        assertThat(updatedPlayer.getLastClaimAt()).isNotNull();

        // 6. Verify count of owned cells in cells table is exactly 1
        long actualOwnedCount = cellRepository.countByOwnerId(playerId);
        assertThat(actualOwnedCount)
                .as("cells table actual row count owned by player must equal 1")
                .isEqualTo(1);
    }
}

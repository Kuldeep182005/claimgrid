package com.claimgrid;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellRequest;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.ClaimStatus;
import com.claimgrid.dto.GameStateResponse;
import com.claimgrid.dto.LeaderboardResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.Player;
import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.PlayerRepository;
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

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ClaimEngineIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ClaimService claimService;

    @Autowired
    private CellRepository cellRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private GameProperties gameProperties;

    @BeforeEach
    void setUp() {
        cleanDatabase();
        gameProperties.setCooldownMs(3000); // ensure baseline default
    }

    @Test
    @DisplayName("Section 21: Successful claim updates cell ownership, territory count, and player activity timestamps")
    void testClaimSuccess_UpdatesAuthoritativeState() {
        // 1. Create a player
        Player player = playerRepository.save(Player.builder()
                .username("Alice")
                .color("#EF4444")
                .cellsClaimed(0)
                .currentStreak(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell = cellRepository.findByXAndY(5, 5).orElseThrow();
        assertThat(cell.getOwnerId()).isNull();

        // 2. Perform claim
        ClaimCellResponse response = claimService.claimCell(player.getId(), cell.getId());

        // 3. Verify response
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getStatus()).isEqualTo(ClaimStatus.SUCCESS);
        assertThat(response.getCellId()).isEqualTo(cell.getId());
        assertThat(response.getOwnerId()).isEqualTo(player.getId());
        assertThat(response.getOwnerUsername()).isEqualTo("Alice");
        assertThat(response.getOwnerColor()).isEqualTo("#EF4444");
        assertThat(response.getClaimedAt()).isNotNull();
        assertThat(response.getCellsClaimed()).isEqualTo(1);
        assertThat(response.getRemainingCooldownMs()).isEqualTo(3000L);

        // 4. Verify authoritative database state
        Cell dbCell = cellRepository.findById(cell.getId()).orElseThrow();
        assertThat(dbCell.getOwnerId()).isEqualTo(player.getId());
        assertThat(dbCell.getClaimedAt()).isNotNull();

        Player dbPlayer = playerRepository.findById(player.getId()).orElseThrow();
        assertThat(dbPlayer.getCellsClaimed()).isEqualTo(1);
        assertThat(dbPlayer.getLastClaimAt()).isNotNull();
        assertThat(dbPlayer.getLastSeenAt()).isNotNull();
    }

    @Test
    @DisplayName("Section 22: Attempting to claim an already-claimed cell is rejected without modifying player territory")
    void testAlreadyClaimedCell_RejectsWithoutModifyingTerritory() {
        // 1. Create Player A and Player B
        Player playerA = playerRepository.save(Player.builder()
                .username("PlayerA")
                .color("#EF4444")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Player playerB = playerRepository.save(Player.builder()
                .username("PlayerB")
                .color("#3B82F6")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell = cellRepository.findByXAndY(12, 12).orElseThrow();

        // 2. Player A claims cell successfully
        ClaimCellResponse claimA = claimService.claimCell(playerA.getId(), cell.getId());
        assertThat(claimA.isSuccess()).isTrue();
        assertThat(claimA.getStatus()).isEqualTo(ClaimStatus.SUCCESS);

        // 3. Player B attempts to claim the same cell
        ClaimCellResponse claimB = claimService.claimCell(playerB.getId(), cell.getId());

        // 4. Verify Player B is rejected
        assertThat(claimB.isSuccess()).isFalse();
        assertThat(claimB.getStatus()).isEqualTo(ClaimStatus.CELL_ALREADY_CLAIMED);
        assertThat(claimB.getOwnerId()).isEqualTo(playerA.getId());
        assertThat(claimB.getOwnerUsername()).isEqualTo("PlayerA");

        // 5. Verify Player B's statistics remain untouched
        Player dbPlayerB = playerRepository.findById(playerB.getId()).orElseThrow();
        assertThat(dbPlayerB.getCellsClaimed()).isEqualTo(0);
        assertThat(dbPlayerB.getLastClaimAt()).isNull();

        // 6. Verify cell owner remains Player A
        Cell dbCell = cellRepository.findById(cell.getId()).orElseThrow();
        assertThat(dbCell.getOwnerId()).isEqualTo(playerA.getId());
    }

    @Test
    @DisplayName("Section 23: Immediate second claim attempt is rejected due to active cooldown")
    void testCooldownRejection_WhenClaimAttemptedDuringCooldown() {
        Player player = playerRepository.save(Player.builder()
                .username("CooldownTester")
                .color("#10B981")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell1 = cellRepository.findByXAndY(1, 1).orElseThrow();
        Cell cell2 = cellRepository.findByXAndY(1, 2).orElseThrow();

        // 1. First claim succeeds
        ClaimCellResponse firstClaim = claimService.claimCell(player.getId(), cell1.getId());
        assertThat(firstClaim.isSuccess()).isTrue();
        assertThat(firstClaim.getStatus()).isEqualTo(ClaimStatus.SUCCESS);

        // 2. Immediate second claim on a different cell
        ClaimCellResponse secondClaim = claimService.claimCell(player.getId(), cell2.getId());

        // 3. Verify second claim is rejected due to COOLDOWN_ACTIVE
        assertThat(secondClaim.isSuccess()).isFalse();
        assertThat(secondClaim.getStatus()).isEqualTo(ClaimStatus.COOLDOWN_ACTIVE);
        assertThat(secondClaim.getRemainingCooldownMs()).isGreaterThan(0L);
        assertThat(secondClaim.getMessage()).contains("cooldown active");

        // 4. Cell 2 remains unowned
        Cell dbCell2 = cellRepository.findById(cell2.getId()).orElseThrow();
        assertThat(dbCell2.getOwnerId()).isNull();

        // 5. Territory remains 1
        Player dbPlayer = playerRepository.findById(player.getId()).orElseThrow();
        assertThat(dbPlayer.getCellsClaimed()).isEqualTo(1);
    }

    @Test
    @DisplayName("Section 23: Claim succeeds after cooldown duration has expired")
    void testSequentialClaims_AfterCooldownExpires_Succeeds() throws InterruptedException {
        // Set short test cooldown of 150ms
        gameProperties.setCooldownMs(150);

        Player player = playerRepository.save(Player.builder()
                .username("SpeedClaimer")
                .color("#8B5CF6")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell1 = cellRepository.findByXAndY(2, 1).orElseThrow();
        Cell cell2 = cellRepository.findByXAndY(2, 2).orElseThrow();

        // 1. First claim
        ClaimCellResponse claim1 = claimService.claimCell(player.getId(), cell1.getId());
        assertThat(claim1.isSuccess()).isTrue();

        // 2. Wait for cooldown to expire
        Thread.sleep(180);

        // 3. Second claim now succeeds
        ClaimCellResponse claim2 = claimService.claimCell(player.getId(), cell2.getId());
        assertThat(claim2.isSuccess()).isTrue();
        assertThat(claim2.getStatus()).isEqualTo(ClaimStatus.SUCCESS);
        assertThat(claim2.getCellsClaimed()).isEqualTo(2);

        // 4. Verify authoritative player territory is 2
        Player dbPlayer = playerRepository.findById(player.getId()).orElseThrow();
        assertThat(dbPlayer.getCellsClaimed()).isEqualTo(2);
    }

    @Test
    @DisplayName("Section 29: REST POST /api/game/cells/{id}/claim works and returns correct status codes")
    void testRestClaimEndpoint_ComprehensiveScenarios() {
        Player player = playerRepository.save(Player.builder()
                .username("RestPlayer")
                .color("#F59E0B")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell = cellRepository.findByXAndY(30, 30).orElseThrow();

        // Scenario 1: Successful claim via REST
        ClaimCellRequest request = ClaimCellRequest.builder().playerId(player.getId()).build();
        ResponseEntity<ClaimCellResponse> response = restTemplate.postForEntity(
                "/api/game/cells/" + cell.getId() + "/claim", request, ClaimCellResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getStatus()).isEqualTo(ClaimStatus.SUCCESS);
        assertThat(response.getBody().getOwnerId()).isEqualTo(player.getId());

        // Scenario 2: Missing Player (404)
        UUID fakePlayerId = UUID.randomUUID();
        ClaimCellRequest missingPlayerReq = ClaimCellRequest.builder().playerId(fakePlayerId).build();
        ResponseEntity<String> missingPlayerResp = restTemplate.postForEntity(
                "/api/game/cells/1/claim", missingPlayerReq, String.class);
        assertThat(missingPlayerResp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(missingPlayerResp.getBody()).contains("PLAYER_NOT_FOUND");

        // Scenario 3: Missing Cell (404)
        ResponseEntity<String> missingCellResp = restTemplate.postForEntity(
                "/api/game/cells/999999/claim", request, String.class);
        assertThat(missingCellResp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(missingCellResp.getBody()).contains("CELL_NOT_FOUND");

        // Scenario 4: Invalid Request Body with null playerId (400)
        ClaimCellRequest nullPlayerReq = ClaimCellRequest.builder().playerId(null).build();
        ResponseEntity<String> badRequestResp = restTemplate.postForEntity(
                "/api/game/cells/1/claim", nullPlayerReq, String.class);
        assertThat(badRequestResp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // Scenario 5: Negative Cell ID (400)
        ResponseEntity<String> negativeCellResp = restTemplate.postForEntity(
                "/api/game/cells/-5/claim", request, String.class);
        assertThat(negativeCellResp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Section 27 & 28: Leaderboard and Game State APIs reflect authoritative state after claims")
    void testLeaderboardAndGameState_ReflectSuccessfulClaims() {
        // 1. Create 2 players
        Player player1 = playerRepository.save(Player.builder()
                .username("TopPlayer")
                .color("#EF4444")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Player player2 = playerRepository.save(Player.builder()
                .username("SecondPlayer")
                .color("#3B82F6")
                .cellsClaimed(0)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build());

        Cell cell1 = cellRepository.findByXAndY(0, 0).orElseThrow();
        Cell cell2 = cellRepository.findByXAndY(0, 1).orElseThrow();

        // 2. Both players claim one cell each
        claimService.claimCell(player1.getId(), cell1.getId());
        claimService.claimCell(player2.getId(), cell2.getId());

        // 3. Verify Game State API reflects claimed cells
        ResponseEntity<GameStateResponse> stateResp = restTemplate.getForEntity("/api/game/state", GameStateResponse.class);
        assertThat(stateResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(stateResp.getBody()).isNotNull();
        assertThat(stateResp.getBody().getTotalCells()).isEqualTo(2500);
        assertThat(stateResp.getBody().getClaimedCells()).isEqualTo(2);

        // 4. Verify Leaderboard API reflects updated counts
        ResponseEntity<LeaderboardResponse> leaderResp = restTemplate.getForEntity("/api/leaderboard", LeaderboardResponse.class);
        assertThat(leaderResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(leaderResp.getBody()).isNotNull();
        assertThat(leaderResp.getBody().getEntries()).hasSize(2);
        assertThat(leaderResp.getBody().getEntries().get(0).getCellsClaimed()).isEqualTo(1);
    }
}

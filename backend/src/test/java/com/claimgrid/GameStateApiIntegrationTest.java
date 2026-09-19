package com.claimgrid;

import com.claimgrid.dto.GameStateResponse;
import com.claimgrid.dto.LeaderboardResponse;
import com.claimgrid.entity.Player;
import com.claimgrid.repository.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GameStateApiIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        cleanDatabase();
    }

    @Test
    void testGetGameState_Returns2500Cells() {
        ResponseEntity<GameStateResponse> response = restTemplate.getForEntity(
                "/api/game/state", GameStateResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        GameStateResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getWidth()).isEqualTo(50);
        assertThat(body.getHeight()).isEqualTo(50);
        assertThat(body.getTotalCells()).isEqualTo(2500);
        assertThat(body.getCells()).isNotNull().hasSize(2500);

        // Verify coordinate bounds
        assertThat(body.getCells().getFirst().getX()).isBetween(0, 49);
        assertThat(body.getCells().getFirst().getY()).isBetween(0, 49);
    }

    @Test
    void testGetLeaderboard_RankedCorrectly() {
        // Create 3 players with distinct cellsClaimed counts
        Instant now = Instant.now();
        Player p1 = Player.builder()
                .username("TopPlayer")
                .color("#EF4444")
                .cellsClaimed(15)
                .createdAt(now)
                .lastSeenAt(now)
                .build();
        Player p2 = Player.builder()
                .username("MiddlePlayer")
                .color("#3B82F6")
                .cellsClaimed(8)
                .createdAt(now)
                .lastSeenAt(now)
                .build();
        Player p3 = Player.builder()
                .username("RookiePlayer")
                .color("#10B981")
                .cellsClaimed(2)
                .createdAt(now)
                .lastSeenAt(now)
                .build();

        playerRepository.saveAll(List.of(p1, p2, p3));

        ResponseEntity<LeaderboardResponse> response = restTemplate.getForEntity(
                "/api/leaderboard", LeaderboardResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        LeaderboardResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getEntries()).hasSize(3);

        assertThat(body.getEntries().get(0).getUsername()).isEqualTo("TopPlayer");
        assertThat(body.getEntries().get(0).getRank()).isEqualTo(1);
        assertThat(body.getEntries().get(0).getCellsClaimed()).isEqualTo(15);

        assertThat(body.getEntries().get(1).getUsername()).isEqualTo("MiddlePlayer");
        assertThat(body.getEntries().get(1).getRank()).isEqualTo(2);
        assertThat(body.getEntries().get(1).getCellsClaimed()).isEqualTo(8);

        assertThat(body.getEntries().get(2).getUsername()).isEqualTo("RookiePlayer");
        assertThat(body.getEntries().get(2).getRank()).isEqualTo(3);
        assertThat(body.getEntries().get(2).getCellsClaimed()).isEqualTo(2);
    }
}

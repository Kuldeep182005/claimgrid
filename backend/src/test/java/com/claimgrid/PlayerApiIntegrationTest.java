package com.claimgrid;

import com.claimgrid.dto.CreatePlayerRequest;
import com.claimgrid.dto.ErrorResponse;
import com.claimgrid.dto.PlayerResponse;
import com.claimgrid.repository.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerApiIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        cleanDatabase();
    }

    @Test
    void testCreatePlayer_Success() {
        CreatePlayerRequest request = CreatePlayerRequest.builder()
                .username("PlayerOne")
                .build();

        ResponseEntity<PlayerResponse> response = restTemplate.postForEntity(
                "/api/players", request, PlayerResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        PlayerResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getId()).isNotNull();
        assertThat(body.getUsername()).isEqualTo("PlayerOne");
        assertThat(body.getColor()).isNotNull().startsWith("#");
        assertThat(body.getCellsClaimed()).isEqualTo(0);
        assertThat(body.getCurrentStreak()).isEqualTo(0);
        assertThat(body.getCreatedAt()).isNotNull();
        assertThat(body.getLastSeenAt()).isNotNull();
    }

    @Test
    void testCreatePlayer_ValidationFailure_BlankUsername() {
        CreatePlayerRequest request = CreatePlayerRequest.builder()
                .username("   ")
                .build();

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
                "/api/players", request, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ErrorResponse error = response.getBody();
        assertThat(error).isNotNull();
        assertThat(error.getError()).isEqualTo("VALIDATION_FAILED");
        assertThat(error.getValidationErrors()).containsKey("username");
    }

    @Test
    void testCreatePlayer_ValidationFailure_TooShort() {
        CreatePlayerRequest request = CreatePlayerRequest.builder()
                .username("A")
                .build();

        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
                "/api/players", request, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ErrorResponse error = response.getBody();
        assertThat(error).isNotNull();
        assertThat(error.getError()).isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void testCreatePlayer_DuplicateUsername() {
        CreatePlayerRequest request = CreatePlayerRequest.builder()
                .username("DuplicateUser")
                .build();

        ResponseEntity<PlayerResponse> first = restTemplate.postForEntity(
                "/api/players", request, PlayerResponse.class);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<ErrorResponse> second = restTemplate.postForEntity(
                "/api/players", request, ErrorResponse.class);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ErrorResponse error = second.getBody();
        assertThat(error).isNotNull();
        assertThat(error.getError()).isEqualTo("DUPLICATE_USERNAME");
    }

    @Test
    void testGetPlayer_Success() {
        CreatePlayerRequest request = CreatePlayerRequest.builder()
                .username("ExistingPlayer")
                .build();

        ResponseEntity<PlayerResponse> created = restTemplate.postForEntity(
                "/api/players", request, PlayerResponse.class);
        UUID playerId = created.getBody().getId();

        ResponseEntity<PlayerResponse> retrieved = restTemplate.getForEntity(
                "/api/players/" + playerId, PlayerResponse.class);

        assertThat(retrieved.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(retrieved.getBody()).isNotNull();
        assertThat(retrieved.getBody().getId()).isEqualTo(playerId);
        assertThat(retrieved.getBody().getUsername()).isEqualTo("ExistingPlayer");
    }

    @Test
    void testGetPlayer_NotFound() {
        UUID nonExistentId = UUID.randomUUID();

        ResponseEntity<ErrorResponse> response = restTemplate.getForEntity(
                "/api/players/" + nonExistentId, ErrorResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("PLAYER_NOT_FOUND");
    }
}

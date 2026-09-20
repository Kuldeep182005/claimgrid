package com.claimgrid.service;

import com.claimgrid.dto.CreatePlayerRequest;
import com.claimgrid.dto.PlayerResponse;
import com.claimgrid.entity.Player;
import com.claimgrid.exception.DuplicateUsernameException;
import com.claimgrid.exception.PlayerNotFoundException;
import com.claimgrid.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
public class PlayerService {

    private static final Logger log = LoggerFactory.getLogger(PlayerService.class);

    // Curated high-contrast, modern game colors for player territory visualization
    public static final List<String> PALETTE = List.of(
            "#EF4444", "#F97316", "#F59E0B", "#10B981",
            "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6",
            "#EC4899", "#14B8A6", "#F43F5E", "#84CC16"
    );

    private final PlayerRepository playerRepository;
    private final Random random = new Random();

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    @Transactional
    public PlayerResponse createPlayer(CreatePlayerRequest request) {
        String username = request.getUsername().trim();

        if (playerRepository.existsByUsername(username)) {
            throw new DuplicateUsernameException(username);
        }

        String assignedColor = PALETTE.get(random.nextInt(PALETTE.size()));
        Instant now = Instant.now();

        Player player = Player.builder()
                .username(username)
                .color(assignedColor)
                .createdAt(now)
                .lastSeenAt(now)
                .cellsClaimed(0)
                .currentStreak(0)
                .build();

        Player saved = playerRepository.save(player);
        log.info("Created player '{}' with id={} and color={}", saved.getUsername(), saved.getId(), saved.getColor());
        return PlayerResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public PlayerResponse getPlayer(UUID id) {
        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new PlayerNotFoundException(id));
        return PlayerResponse.fromEntity(player);
    }

    @Transactional(readOnly = true)
    public Player getPlayerEntity(UUID id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new PlayerNotFoundException(id));
    }
}

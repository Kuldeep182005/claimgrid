package com.claimgrid.service;

import com.claimgrid.dto.LeaderboardEntryResponse;
import com.claimgrid.dto.LeaderboardResponse;
import com.claimgrid.entity.Player;
import com.claimgrid.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class LeaderboardService {

    private static final Logger log = LoggerFactory.getLogger(LeaderboardService.class);
    private static final int DEFAULT_LIMIT = 20;

    private final PlayerRepository playerRepository;

    public LeaderboardService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    @Transactional(readOnly = true)
    public LeaderboardResponse getLeaderboard() {
        return getLeaderboard(DEFAULT_LIMIT);
    }

    @Transactional(readOnly = true)
    public LeaderboardResponse getLeaderboard(int limit) {
        List<Player> topPlayers = playerRepository.findLeaderboard(PageRequest.of(0, limit));

        List<LeaderboardEntryResponse> entries = new ArrayList<>(topPlayers.size());
        int rank = 1;
        for (Player p : topPlayers) {
            entries.add(LeaderboardEntryResponse.builder()
                    .id(p.getId())
                    .username(p.getUsername())
                    .color(p.getColor())
                    .cellsClaimed(p.getCellsClaimed())
                    .currentStreak(p.getCurrentStreak())
                    .rank(rank++)
                    .build());
        }

        log.debug("Retrieved leaderboard with {} entries", entries.size());
        return LeaderboardResponse.builder()
                .entries(entries)
                .build();
    }
}

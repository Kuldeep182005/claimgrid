package com.claimgrid.controller;

import com.claimgrid.dto.LeaderboardResponse;
import com.claimgrid.service.LeaderboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public LeaderboardResponse getLeaderboard(@RequestParam(defaultValue = "20") int limit) {
        return leaderboardService.getLeaderboard(limit);
    }
}

package com.claimgrid.dto;

import com.claimgrid.entity.GameStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResultResponse {
    private UUID gameId;
    private int maxPlayers;
    private UUID player1Id;
    private UUID player2Id;
    private UUID player3Id;
    private UUID player4Id;
    private UUID winnerId;
    private GameStatus status;
    private int turnLimit;
    private int player1Score;
    private int player2Score;
    private int player3Score;
    private int player4Score;
    private List<PlayerSummaryDto> players;
}

package com.claimgrid.dto;

import com.claimgrid.entity.GameStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionGameStateResponse {
    private UUID gameId;
    private String code;
    private GameStatus status;
    private int maxPlayers;
    private int width;
    private int height;
    private int totalCells;
    private long claimedCells;
    private UUID currentPlayerId;
    private int turnNumber;
    private int turnLimit;
    private UUID winnerId;
    private int player1Score;
    private int player2Score;
    private int player3Score;
    private int player4Score;
    private Instant startedAt;
    private Instant finishedAt;
    private boolean practice;
    private List<PlayerSummaryDto> players;
    private List<CellResponse> cells;
    private int onlineCount;
}

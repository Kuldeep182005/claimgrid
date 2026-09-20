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
public class GameSessionResponse {
    private UUID gameId;
    private String code;
    private GameStatus status;
    private int maxPlayers;
    private int playerCount;
    private UUID currentPlayerId;
    private int turnNumber;
    private UUID winnerId;
    private int turnLimit;
    private int player1Score;
    private int player2Score;
    private int player3Score;
    private int player4Score;
    private Instant createdAt;
    private Instant startedAt;
    private Instant finishedAt;
    private boolean practice;
    private List<PlayerSummaryDto> players;
}

package com.claimgrid.websocket.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameFinishedEvent {

    @Builder.Default
    private String type = "GAME_FINISHED";
    private UUID gameId;
    private UUID winnerId;
    private int player1Score;
    private int player2Score;
    private int player3Score;
    private int player4Score;
}

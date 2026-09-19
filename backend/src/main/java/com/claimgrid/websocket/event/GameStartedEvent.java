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
public class GameStartedEvent {

    @Builder.Default
    private String type = "GAME_STARTED";
    private UUID gameId;
    private String code;
    private UUID player1Id;
    private UUID player2Id;
    private UUID currentPlayerId;
    private int turnNumber;
}

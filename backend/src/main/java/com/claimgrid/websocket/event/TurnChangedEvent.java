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
public class TurnChangedEvent {

    @Builder.Default
    private String type = "TURN_CHANGED";
    private UUID gameId;
    private UUID currentPlayerId;
    private int turnNumber;
}

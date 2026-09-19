package com.claimgrid.websocket.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CellClaimedEvent {

    @Builder.Default
    private String type = "CELL_CLAIMED";
    private Long cellId;
    private int x;
    private int y;
    private UUID playerId;
    private String playerName;
    private String color;
    private Instant claimedAt;
}

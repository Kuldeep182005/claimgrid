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
public class PlayerJoinedEvent {

    @Builder.Default
    private String type = "PLAYER_JOINED";
    private UUID playerId;
    private String playerName;
    private String color;
}

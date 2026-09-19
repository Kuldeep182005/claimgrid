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
public class LeaderboardUpdatedEvent {

    @Builder.Default
    private String type = "LEADERBOARD_UPDATED";
    private UUID playerId;
    private int cellsClaimed;
}

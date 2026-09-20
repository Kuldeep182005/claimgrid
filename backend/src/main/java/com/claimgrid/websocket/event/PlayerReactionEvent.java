package com.claimgrid.websocket.event;

import com.claimgrid.dto.ReactionType;
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
public class PlayerReactionEvent {
    @Builder.Default
    private String type = "PLAYER_REACTION";
    private UUID gameId;
    private UUID playerId;
    private String playerName;
    private ReactionType reaction;
    private Instant timestamp;
}

package com.claimgrid.dto;

import com.claimgrid.entity.Player;
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
public class PlayerResponse {

    private UUID id;
    private String username;
    private String color;
    private Instant createdAt;
    private Instant lastSeenAt;
    private int cellsClaimed;
    private int currentStreak;

    public static PlayerResponse fromEntity(Player player) {
        return PlayerResponse.builder()
                .id(player.getId())
                .username(player.getUsername())
                .color(player.getColor())
                .createdAt(player.getCreatedAt())
                .lastSeenAt(player.getLastSeenAt())
                .cellsClaimed(player.getCellsClaimed())
                .currentStreak(player.getCurrentStreak())
                .build();
    }
}

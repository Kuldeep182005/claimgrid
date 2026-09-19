package com.claimgrid.dto;

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
public class ClaimCellResponse {

    private boolean success;
    private ClaimStatus status;
    private UUID gameId;
    private Long cellId;
    private int x;
    private int y;
    private UUID ownerId;
    private String ownerUsername;
    private String ownerColor;
    private Instant claimedAt;
    private Integer cellsClaimed;
    private Long remainingCooldownMs;
    private UUID nextPlayerId;
    private Integer turnNumber;
    private String message;
}

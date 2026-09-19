package com.claimgrid.websocket.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain event published by ClaimService upon successful cell claim.
 * Handled post-commit by GameEventListener to broadcast over WebSocket.
 */
public record CellClaimedDomainEvent(
        Long cellId,
        int x,
        int y,
        UUID playerId,
        String playerName,
        String color,
        Instant claimedAt,
        int cellsClaimed
) {}

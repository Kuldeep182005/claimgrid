package com.claimgrid.websocket.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain event published by ClaimService upon successful cell claim.
 * Handled post-commit by GameEventListener to broadcast over WebSocket.
 */
public record CellClaimedDomainEvent(
        UUID gameId,
        Long cellId,
        int x,
        int y,
        UUID playerId,
        String playerName,
        String color,
        Instant claimedAt,
        int cellsClaimed,
        int turnNumber,
        UUID nextPlayerId
) {
    /**
     * Backwards-compatible constructor for legacy unscoped events.
     */
    public CellClaimedDomainEvent(
            Long cellId,
            int x,
            int y,
            UUID playerId,
            String playerName,
            String color,
            Instant claimedAt,
            int cellsClaimed
    ) {
        this(null, cellId, x, y, playerId, playerName, color, claimedAt, cellsClaimed, 0, null);
    }
}

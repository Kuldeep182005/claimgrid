package com.claimgrid.websocket.event;

import java.util.UUID;

public record GameFinishedDomainEvent(
        UUID gameId,
        UUID winnerId,
        int player1Score,
        int player2Score,
        int player3Score,
        int player4Score
) {
    public GameFinishedDomainEvent(UUID gameId, UUID winnerId) {
        this(gameId, winnerId, 0, 0, 0, 0);
    }

    public GameFinishedDomainEvent(UUID gameId, UUID winnerId, int player1Score, int player2Score) {
        this(gameId, winnerId, player1Score, player2Score, 0, 0);
    }
}

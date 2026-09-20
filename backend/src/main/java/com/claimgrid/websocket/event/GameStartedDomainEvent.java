package com.claimgrid.websocket.event;

import java.util.List;
import java.util.UUID;

public record GameStartedDomainEvent(
        UUID gameId,
        String code,
        UUID player1Id,
        UUID player2Id,
        UUID currentPlayerId,
        int turnNumber,
        int maxPlayers,
        UUID player3Id,
        UUID player4Id,
        List<UUID> playerIds
) {
    public GameStartedDomainEvent(UUID gameId, String code, UUID player1Id, UUID player2Id, UUID currentPlayerId, int turnNumber) {
        this(gameId, code, player1Id, player2Id, currentPlayerId, turnNumber, 2, null, null,
                player2Id != null ? List.of(player1Id, player2Id) : List.of(player1Id));
    }
}

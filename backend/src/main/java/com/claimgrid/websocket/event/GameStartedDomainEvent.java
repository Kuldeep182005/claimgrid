package com.claimgrid.websocket.event;

import java.util.UUID;

public record GameStartedDomainEvent(
        UUID gameId,
        String code,
        UUID player1Id,
        UUID player2Id,
        UUID currentPlayerId,
        int turnNumber
) {}

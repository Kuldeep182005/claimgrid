package com.claimgrid.websocket.event;

import java.util.UUID;

public record TurnChangedDomainEvent(
        UUID gameId,
        UUID currentPlayerId,
        int turnNumber
) {}

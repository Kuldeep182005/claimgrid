package com.claimgrid.websocket.event;

import java.util.UUID;

public record GameFinishedDomainEvent(
        UUID gameId,
        UUID winnerId
) {}

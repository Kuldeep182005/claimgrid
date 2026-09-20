package com.claimgrid.service;

import java.util.UUID;

public record PracticeGameStartedDomainEvent(UUID gameId, UUID botPlayerId) {}

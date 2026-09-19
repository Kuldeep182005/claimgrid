package com.claimgrid.service;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.ClaimStatus;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.Player;
import com.claimgrid.exception.CellNotFoundException;
import com.claimgrid.exception.InvalidGameRequestException;
import com.claimgrid.exception.PlayerNotFoundException;
import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.PlayerRepository;
import com.claimgrid.websocket.event.CellClaimedDomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class ClaimService {

    private static final Logger log = LoggerFactory.getLogger(ClaimService.class);

    private final CellRepository cellRepository;
    private final PlayerRepository playerRepository;
    private final GameProperties gameProperties;
    private final ApplicationEventPublisher eventPublisher;

    public ClaimService(CellRepository cellRepository,
                        PlayerRepository playerRepository,
                        GameProperties gameProperties,
                        ApplicationEventPublisher eventPublisher) {
        this.cellRepository = cellRepository;
        this.playerRepository = playerRepository;
        this.gameProperties = gameProperties;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Authoritative game engine claim operation.
     *
     * Enforces the following rules:
     * 1. Player ID and Cell ID validation.
     * 2. Player existence check with row-level lock (SELECT FOR UPDATE) to serialize
     *    cooldown checks for the same player, guaranteeing zero race conditions on cooldown.
     * 3. Cell existence check.
     * 4. Server-side cooldown validation against game.claim.cooldown-ms.
     * 5. Atomic conditional database claim via UPDATE ... WHERE owner_id IS NULL.
     * 6. Atomic territory increment and claim timestamp update on successful claim.
     * 7. Publishes CellClaimedDomainEvent to trigger post-commit WebSocket broadcasting.
     * 8. Clean domain-level status outcome returned in ClaimCellResponse.
     */
    @Transactional
    public ClaimCellResponse claimCell(UUID playerId, Long cellId) {
        if (playerId == null) {
            throw new InvalidGameRequestException("Player ID must not be null");
        }
        if (cellId == null || cellId <= 0) {
            throw new InvalidGameRequestException("Cell ID must be a positive integer");
        }

        // 1. Lock player row and validate player existence (pessimistic row lock serializes same-player claims)
        Player player = playerRepository.findByIdForUpdate(playerId)
                .orElseThrow(() -> new PlayerNotFoundException(playerId));

        // 2. Validate cell existence
        Cell cell = cellRepository.findById(cellId)
                .orElseThrow(() -> new CellNotFoundException(cellId));

        // 3. Server-side cooldown check
        Instant now = Instant.now();
        long cooldownMs = gameProperties.getCooldownMs();
        if (player.getLastClaimAt() != null) {
            long elapsedMs = Duration.between(player.getLastClaimAt(), now).toMillis();
            if (elapsedMs < cooldownMs) {
                long remainingCooldownMs = cooldownMs - elapsedMs;
                log.warn("Player '{}' ({}) claim rejected: cooldown active (remaining: {}ms)",
                        player.getUsername(), playerId, remainingCooldownMs);

                return ClaimCellResponse.builder()
                        .success(false)
                        .status(ClaimStatus.COOLDOWN_ACTIVE)
                        .cellId(cellId)
                        .x(cell.getX())
                        .y(cell.getY())
                        .ownerId(cell.getOwnerId())
                        .cellsClaimed(player.getCellsClaimed())
                        .remainingCooldownMs(remainingCooldownMs)
                        .message("Claim rejected: cooldown active. Please wait " + remainingCooldownMs + "ms")
                        .build();
            }
        }

        // 4. Attempt atomic database claim
        int affectedRows = cellRepository.claimCellAtomically(cellId, playerId);

        if (affectedRows == 1) {
            // Claim succeeded - atomically increment territory and record claim timestamp
            playerRepository.recordSuccessfulClaim(playerId, now);
            int newCellsClaimed = player.getCellsClaimed() + 1;

            log.info("Player '{}' ({}) successfully claimed cell #{} at ({}, {}) [cellsClaimed={}]",
                    player.getUsername(), playerId, cellId, cell.getX(), cell.getY(), newCellsClaimed);

            // Publish domain event for post-commit WebSocket broadcasting
            eventPublisher.publishEvent(new CellClaimedDomainEvent(
                    cellId,
                    cell.getX(),
                    cell.getY(),
                    playerId,
                    player.getUsername(),
                    player.getColor(),
                    now,
                    newCellsClaimed
            ));

            return ClaimCellResponse.builder()
                    .success(true)
                    .status(ClaimStatus.SUCCESS)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .ownerId(playerId)
                    .ownerUsername(player.getUsername())
                    .ownerColor(player.getColor())
                    .claimedAt(now)
                    .cellsClaimed(newCellsClaimed)
                    .remainingCooldownMs(cooldownMs)
                    .message("Cell claimed successfully")
                    .build();
        } else {
            // Claim rejected - cell is already claimed
            Cell currentCell = cellRepository.findById(cellId).orElse(cell);
            Player currentOwner = currentCell.getOwnerId() != null
                    ? playerRepository.findById(currentCell.getOwnerId()).orElse(null)
                    : null;

            log.warn("Claim attempt by player '{}' ({}) rejected for cell #{}: already claimed by {}",
                    player.getUsername(), playerId, cellId, currentCell.getOwnerId());

            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.CELL_ALREADY_CLAIMED)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .ownerId(currentCell.getOwnerId())
                    .ownerUsername(currentOwner != null ? currentOwner.getUsername() : null)
                    .ownerColor(currentOwner != null ? currentOwner.getColor() : null)
                    .claimedAt(currentCell.getClaimedAt())
                    .cellsClaimed(player.getCellsClaimed())
                    .remainingCooldownMs(0L)
                    .message("Cell has already been claimed")
                    .build();
        }
    }
}

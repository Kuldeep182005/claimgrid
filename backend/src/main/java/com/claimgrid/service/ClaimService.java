package com.claimgrid.service;

import com.claimgrid.config.GameProperties;
import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.dto.ClaimStatus;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.GameSession;
import com.claimgrid.entity.GameStatus;
import com.claimgrid.entity.Player;
import com.claimgrid.exception.CellNotFoundException;
import com.claimgrid.exception.InvalidGameRequestException;
import com.claimgrid.exception.PlayerNotFoundException;
import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.GameSessionRepository;
import com.claimgrid.repository.PlayerRepository;
import com.claimgrid.websocket.event.CellClaimedDomainEvent;
import com.claimgrid.websocket.event.GameFinishedDomainEvent;
import com.claimgrid.websocket.event.TurnChangedDomainEvent;
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
    private final GameSessionRepository gameSessionRepository;
    private final GameProperties gameProperties;
    private final ApplicationEventPublisher eventPublisher;

    public ClaimService(CellRepository cellRepository,
                        PlayerRepository playerRepository,
                        GameSessionRepository gameSessionRepository,
                        GameProperties gameProperties,
                        ApplicationEventPublisher eventPublisher) {
        this.cellRepository = cellRepository;
        this.playerRepository = playerRepository;
        this.gameSessionRepository = gameSessionRepository;
        this.gameProperties = gameProperties;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Authoritative game engine claim operation scoped to a GameSession.
     *
     * Concurrency & Turn Safety:
     * 1. Acquires a pessimistic row lock (SELECT FOR UPDATE) on the GameSession.
     *    This completely serializes concurrent turn claims for the battle.
     * 2. Validates session status is ACTIVE, player belongs to session, and it is player's turn.
     * 3. Locks player row and validates cooldown.
     * 4. Atomically claims the cell using conditional SQL (session_id and owner_id IS NULL).
     * 5. Advances turn or finishes game, persisting turn state before transaction commit.
     * 6. Publishes transactional domain events for post-commit WebSocket dispatch.
     */
    @Transactional
    public ClaimCellResponse claimCell(UUID gameId, UUID playerId, Long cellId) {
        return claimCell(gameId, playerId, cellId, null);
    }

    /**
     * Authoritative atomic claim within a private GameSession:
     * 1. Acquires pessimistic row lock on GameSession to serialize turns.
     * 2. Validates game status (must be ACTIVE).
     * 3. Validates player membership and turn authority (requesting player == currentPlayerId and matching expectedTurn).
     * 4. Acquires pessimistic row lock on Player to serialize cooldown checks.
     * 5. Atomically claims the cell using conditional SQL (session_id and owner_id IS NULL).
     * 6. Advances turn or finishes game, persisting turn state before transaction commit.
     * 7. Publishes transactional domain events for post-commit WebSocket dispatch.
     */
    @Transactional
    public ClaimCellResponse claimCell(UUID gameId, UUID playerId, Long cellId, Integer expectedTurn) {
        if (gameId == null) {
            throw new InvalidGameRequestException("Game ID must not be null");
        }
        if (playerId == null) {
            throw new InvalidGameRequestException("Player ID must not be null");
        }
        if (cellId == null || cellId <= 0) {
            throw new InvalidGameRequestException("Cell ID must be a positive integer");
        }

        // 1. Lock session row (serializes concurrent claim and turn attempts in this session)
        GameSession session = gameSessionRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new InvalidGameRequestException("Battle session not found: " + gameId));

        if (session.getStatus() == GameStatus.FINISHED) {
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.GAME_FINISHED)
                    .gameId(gameId)
                    .cellId(cellId)
                    .message("Battle is already finished")
                    .build();
        }

        if (session.getStatus() != GameStatus.ACTIVE) {
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.GAME_NOT_ACTIVE)
                    .gameId(gameId)
                    .cellId(cellId)
                    .message("Battle is waiting for opponent")
                    .build();
        }

        if (!session.hasPlayer(playerId)) {
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.NOT_IN_GAME)
                    .gameId(gameId)
                    .cellId(cellId)
                    .message("Player does not belong to this battle")
                    .build();
        }

        if (expectedTurn != null && !expectedTurn.equals(session.getTurnNumber())) {
            log.warn("Claim rejected: turn mismatch or expired [gameId={}, playerId={}, expectedTurn={}, currentTurn={}]",
                    gameId, playerId, expectedTurn, session.getTurnNumber());
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.NOT_YOUR_TURN)
                    .gameId(gameId)
                    .cellId(cellId)
                    .nextPlayerId(session.getCurrentPlayerId())
                    .turnNumber(session.getTurnNumber())
                    .message("It is not your turn")
                    .build();
        }

        if (!session.isTurnOf(playerId)) {
            log.warn("Claim rejected: not player's turn [gameId={}, playerId={}, currentTurnPlayer={}]",
                    gameId, playerId, session.getCurrentPlayerId());
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.NOT_YOUR_TURN)
                    .gameId(gameId)
                    .cellId(cellId)
                    .nextPlayerId(session.getCurrentPlayerId())
                    .turnNumber(session.getTurnNumber())
                    .message("It is not your turn")
                    .build();
        }

        // 2. Lock player row to serialize cooldown checks
        Player player = playerRepository.findByIdForUpdate(playerId)
                .orElseThrow(() -> new PlayerNotFoundException(playerId));

        // 3. Validate cell belongs to this game session
        Cell cell = cellRepository.findByIdAndSessionId(cellId, gameId)
                .orElseThrow(() -> new CellNotFoundException(cellId));

        // 4. Server-side cooldown validation
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
                        .gameId(gameId)
                        .cellId(cellId)
                        .x(cell.getX())
                        .y(cell.getY())
                        .ownerId(cell.getOwnerId())
                        .cellsClaimed(player.getCellsClaimed())
                        .remainingCooldownMs(remainingCooldownMs)
                        .turnNumber(session.getTurnNumber())
                        .nextPlayerId(session.getCurrentPlayerId())
                        .message("Claim rejected: cooldown active. Please wait " + remainingCooldownMs + "ms")
                        .build();
            }
        }

        // 5. Attempt atomic database claim scoped to session
        int affectedRows = cellRepository.claimCellAtomically(cellId, gameId, playerId);

        if (affectedRows == 1) {
            playerRepository.recordSuccessfulClaim(playerId, now);
            int newCellsClaimed = player.getCellsClaimed() + 1;

            log.info("Player '{}' ({}) successfully claimed cell #{} at ({}, {}) in game {}",
                    player.getUsername(), playerId, cellId, cell.getX(), cell.getY(), gameId);

            // Check if board is full
            long totalClaimed = cellRepository.countBySessionIdAndOwnerIdIsNotNull(gameId);
            UUID nextPlayerId;
            int nextTurnNumber;

            if (totalClaimed >= BattleSessionService.TOTAL_CELLS) {
                session.setStatus(GameStatus.FINISHED);
                session.setFinishedAt(now);

                long p1Count = cellRepository.countBySessionIdAndOwnerId(gameId, session.getPlayer1Id());
                long p2Count = session.getPlayer2Id() != null
                        ? cellRepository.countBySessionIdAndOwnerId(gameId, session.getPlayer2Id())
                        : 0;

                UUID winnerId = (p1Count > p2Count) ? session.getPlayer1Id()
                        : (p2Count > p1Count ? session.getPlayer2Id() : null);

                session.setWinnerId(winnerId);
                gameSessionRepository.save(session);

                nextPlayerId = null;
                nextTurnNumber = session.getTurnNumber();

                log.info("Battle finished [gameId={}, winner={}, p1Count={}, p2Count={}]",
                        gameId, winnerId, p1Count, p2Count);

                eventPublisher.publishEvent(new GameFinishedDomainEvent(gameId, winnerId));
            } else {
                // Advance turn
                nextPlayerId = playerId.equals(session.getPlayer1Id())
                        ? session.getPlayer2Id()
                        : session.getPlayer1Id();
                nextTurnNumber = session.getTurnNumber() + 1;

                session.setCurrentPlayerId(nextPlayerId);
                session.setTurnNumber(nextTurnNumber);
                gameSessionRepository.save(session);

                eventPublisher.publishEvent(new TurnChangedDomainEvent(gameId, nextPlayerId, nextTurnNumber));
            }

            // Publish CELL_CLAIMED domain event
            eventPublisher.publishEvent(new CellClaimedDomainEvent(
                    gameId,
                    cellId,
                    cell.getX(),
                    cell.getY(),
                    playerId,
                    player.getUsername(),
                    player.getColor(),
                    now,
                    newCellsClaimed,
                    nextTurnNumber,
                    nextPlayerId
            ));

            return ClaimCellResponse.builder()
                    .success(true)
                    .status(ClaimStatus.SUCCESS)
                    .gameId(gameId)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .ownerId(playerId)
                    .ownerUsername(player.getUsername())
                    .ownerColor(player.getColor())
                    .claimedAt(now)
                    .cellsClaimed(newCellsClaimed)
                    .remainingCooldownMs(cooldownMs)
                    .turnNumber(nextTurnNumber)
                    .nextPlayerId(nextPlayerId)
                    .message("Cell claimed successfully")
                    .build();
        } else {
            Cell currentCell = cellRepository.findById(cellId).orElse(cell);
            Player currentOwner = currentCell.getOwnerId() != null
                    ? playerRepository.findById(currentCell.getOwnerId()).orElse(null)
                    : null;

            log.warn("Claim attempt by player '{}' ({}) rejected for cell #{}: already claimed by {}",
                    player.getUsername(), playerId, cellId, currentCell.getOwnerId());

            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.CELL_ALREADY_CLAIMED)
                    .gameId(gameId)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .ownerId(currentCell.getOwnerId())
                    .ownerUsername(currentOwner != null ? currentOwner.getUsername() : null)
                    .ownerColor(currentOwner != null ? currentOwner.getColor() : null)
                    .claimedAt(currentCell.getClaimedAt())
                    .cellsClaimed(player.getCellsClaimed())
                    .remainingCooldownMs(0L)
                    .turnNumber(session.getTurnNumber())
                    .nextPlayerId(session.getCurrentPlayerId())
                    .message("Cell has already been claimed")
                    .build();
        }
    }

    /**
     * Legacy claim overload that handles unscoped cells (or delegates if scoped).
     */
    @Transactional
    public ClaimCellResponse claimCell(UUID playerId, Long cellId) {
        if (playerId == null) {
            throw new InvalidGameRequestException("Player ID must not be null");
        }
        if (cellId == null || cellId <= 0) {
            throw new InvalidGameRequestException("Cell ID must be a positive integer");
        }

        Cell cell = cellRepository.findById(cellId)
                .orElseThrow(() -> new CellNotFoundException(cellId));

        if (cell.getSessionId() != null) {
            return claimCell(cell.getSessionId(), playerId, cellId);
        }

        // Global mode (Phase 3/4/5 logic)
        Player player = playerRepository.findByIdForUpdate(playerId)
                .orElseThrow(() -> new PlayerNotFoundException(playerId));

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

        int affectedRows = cellRepository.claimCellAtomically(cellId, playerId);

        if (affectedRows == 1) {
            playerRepository.recordSuccessfulClaim(playerId, now);
            int newCellsClaimed = player.getCellsClaimed() + 1;

            log.info("Player '{}' ({}) successfully claimed global cell #{} at ({}, {})",
                    player.getUsername(), playerId, cellId, cell.getX(), cell.getY());

            eventPublisher.publishEvent(new CellClaimedDomainEvent(
                    null,
                    cellId,
                    cell.getX(),
                    cell.getY(),
                    playerId,
                    player.getUsername(),
                    player.getColor(),
                    now,
                    newCellsClaimed,
                    0,
                    null
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
            Cell currentCell = cellRepository.findById(cellId).orElse(cell);
            Player currentOwner = currentCell.getOwnerId() != null
                    ? playerRepository.findById(currentCell.getOwnerId()).orElse(null)
                    : null;

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

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
import java.util.ArrayList;
import java.util.List;
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

    @Transactional
    public ClaimCellResponse claimCell(UUID gameId, UUID playerId, Long cellId) {
        return claimCell(gameId, playerId, cellId, null);
    }

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

        Player player = playerRepository.findByIdForUpdate(playerId)
                .orElseThrow(() -> new PlayerNotFoundException(playerId));

        Cell cell = cellRepository.findByIdAndSessionId(cellId, gameId)
                .orElseThrow(() -> new CellNotFoundException(cellId));

        if (cell.getOwnerId() != null) {
            Player currentOwner = playerRepository.findById(cell.getOwnerId()).orElse(null);
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.CELL_ALREADY_CLAIMED)
                    .gameId(gameId)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .ownerId(cell.getOwnerId())
                    .ownerUsername(currentOwner != null ? currentOwner.getUsername() : null)
                    .ownerColor(currentOwner != null ? currentOwner.getColor() : null)
                    .claimedAt(cell.getClaimedAt())
                    .cellsClaimed(player.getCellsClaimed())
                    .remainingCooldownMs(0L)
                    .turnNumber(session.getTurnNumber())
                    .nextPlayerId(session.getCurrentPlayerId())
                    .message("Cell has already been claimed")
                    .build();
        }

        if (!isFrontierClaim(session, playerId, cell)) {
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.FRONTIER_INVALID)
                    .gameId(gameId)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .turnNumber(session.getTurnNumber())
                    .nextPlayerId(session.getCurrentPlayerId())
                    .message("Cell must be adjacent to your territory")
                    .build();
        }

        Instant now = Instant.now();
        long cooldownMs = gameProperties.getCooldownMs();
        if (player.getLastClaimAt() != null) {
            long elapsedMs = Duration.between(player.getLastClaimAt(), now).toMillis();
            if (elapsedMs < cooldownMs) {
                long remainingCooldownMs = cooldownMs - elapsedMs;
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

        int affectedRows = cellRepository.claimCellAtomically(cellId, gameId, playerId);

        if (affectedRows == 1) {
            if (session.isPractice()) {
                playerRepository.recordPracticeClaim(playerId, now);
            } else {
                playerRepository.recordSuccessfulClaim(playerId, now);
            }

            int newCellsClaimed = (int) cellRepository.countBySessionIdAndOwnerId(gameId, playerId);
            log.info("Player '{}' ({}) successfully claimed cell #{} at ({}, {}) in game {}",
                    player.getUsername(), playerId, cellId, cell.getX(), cell.getY(), gameId);

            int currentTurn = session.getTurnNumber();
            int turnLimit = session.getTurnLimit() > 0 ? session.getTurnLimit() : gameProperties.getMatchTurnLimit();
            session.setTurnLimit(turnLimit);
            int nextTurnNumber = currentTurn;
            UUID nextPlayerId = null;

            if (currentTurn >= turnLimit) {
                finishByScoring(session, gameId, now);
                nextTurnNumber = currentTurn;
            } else {
                nextPlayerId = getNextTurnPlayer(session, playerId);
                nextTurnNumber = currentTurn + 1;
                session.setCurrentPlayerId(nextPlayerId);
                session.setTurnNumber(nextTurnNumber);
                session.setPlayerScore(playerId, calculateSessionScore(gameId, playerId));
                gameSessionRepository.save(session);
                eventPublisher.publishEvent(new TurnChangedDomainEvent(gameId, nextPlayerId, nextTurnNumber));
            }

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
        }

        Cell currentCell = cellRepository.findById(cellId).orElse(cell);
        Player currentOwner = currentCell.getOwnerId() != null ? playerRepository.findById(currentCell.getOwnerId()).orElse(null) : null;
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

    @Transactional
    public ClaimCellResponse attackCell(UUID gameId, UUID playerId, Long cellId) {
        return attackCell(gameId, playerId, cellId, null);
    }

    @Transactional
    public ClaimCellResponse attackCell(UUID gameId, UUID playerId, Long cellId, Integer expectedTurn) {
        if (gameId == null) {
            throw new InvalidGameRequestException("Game ID must not be null");
        }
        if (playerId == null) {
            throw new InvalidGameRequestException("Player ID must not be null");
        }
        if (cellId == null || cellId <= 0) {
            throw new InvalidGameRequestException("Cell ID must be a positive integer");
        }

        GameSession session = gameSessionRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new InvalidGameRequestException("Battle session not found: " + gameId));

        if (session.getStatus() == GameStatus.FINISHED) {
            return ClaimCellResponse.builder().success(false).status(ClaimStatus.GAME_FINISHED).gameId(gameId).cellId(cellId).message("Battle is already finished").build();
        }
        if (session.getStatus() != GameStatus.ACTIVE) {
            return ClaimCellResponse.builder().success(false).status(ClaimStatus.GAME_NOT_ACTIVE).gameId(gameId).cellId(cellId).message("Battle is waiting for opponent").build();
        }
        if (!session.hasPlayer(playerId)) {
            return ClaimCellResponse.builder().success(false).status(ClaimStatus.NOT_IN_GAME).gameId(gameId).cellId(cellId).message("Player does not belong to this battle").build();
        }
        if (expectedTurn != null && !expectedTurn.equals(session.getTurnNumber())) {
            return ClaimCellResponse.builder().success(false).status(ClaimStatus.NOT_YOUR_TURN).gameId(gameId).cellId(cellId).nextPlayerId(session.getCurrentPlayerId()).turnNumber(session.getTurnNumber()).message("It is not your turn").build();
        }
        if (!session.isTurnOf(playerId)) {
            return ClaimCellResponse.builder().success(false).status(ClaimStatus.NOT_YOUR_TURN).gameId(gameId).cellId(cellId).nextPlayerId(session.getCurrentPlayerId()).turnNumber(session.getTurnNumber()).message("It is not your turn").build();
        }

        Player player = playerRepository.findByIdForUpdate(playerId)
                .orElseThrow(() -> new PlayerNotFoundException(playerId));

        Cell cell = cellRepository.findByIdAndSessionId(cellId, gameId)
                .orElseThrow(() -> new CellNotFoundException(cellId));

        if (cell.getOwnerId() == null || cell.getOwnerId().equals(playerId)) {
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.ATTACK_REJECTED)
                    .gameId(gameId)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .turnNumber(session.getTurnNumber())
                    .nextPlayerId(session.getCurrentPlayerId())
                    .message("Select an adjacent enemy cell to attack")
                    .build();
        }

        UUID enemyId = cell.getOwnerId();
        if (!session.hasPlayer(enemyId)) {
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.ATTACK_REJECTED)
                    .gameId(gameId)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .turnNumber(session.getTurnNumber())
                    .nextPlayerId(session.getCurrentPlayerId())
                    .message("Enemy cell does not belong to this battle")
                    .build();
        }

        if (!isAdjacentToAnyOwnedCell(session, playerId, cell.getX(), cell.getY())) {
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.FRONTIER_INVALID)
                    .gameId(gameId)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .turnNumber(session.getTurnNumber())
                    .nextPlayerId(session.getCurrentPlayerId())
                    .message("Enemy cell must be adjacent to your territory")
                    .build();
        }

        Instant now = Instant.now();
        int affectedRows = cellRepository.captureAdjacentEnemyCell(cellId, gameId, playerId, enemyId);
        if (affectedRows != 1) {
            return ClaimCellResponse.builder()
                    .success(false)
                    .status(ClaimStatus.ATTACK_REJECTED)
                    .gameId(gameId)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .ownerId(enemyId)
                    .turnNumber(session.getTurnNumber())
                    .nextPlayerId(session.getCurrentPlayerId())
                    .message("Attack failed")
                    .build();
        }

        if (session.isPractice()) {
            playerRepository.recordPracticeClaim(playerId, now);
        } else {
            playerRepository.recordSuccessfulClaim(playerId, now);
        }

        int currentTurn = session.getTurnNumber();
        int turnLimit = session.getTurnLimit() > 0 ? session.getTurnLimit() : gameProperties.getMatchTurnLimit();
        session.setTurnLimit(turnLimit);
        UUID nextPlayerId = null;
        int nextTurnNumber = currentTurn;

        if (currentTurn >= turnLimit) {
            finishByScoring(session, gameId, now);
        } else {
            nextPlayerId = getNextTurnPlayer(session, playerId);
            nextTurnNumber = currentTurn + 1;
            session.setCurrentPlayerId(nextPlayerId);
            session.setTurnNumber(nextTurnNumber);
            session.setPlayerScore(playerId, calculateSessionScore(gameId, playerId));
            session.setPlayerScore(enemyId, calculateSessionScore(gameId, enemyId));
            gameSessionRepository.save(session);
            eventPublisher.publishEvent(new TurnChangedDomainEvent(gameId, nextPlayerId, nextTurnNumber));
        }

        int newCellsClaimed = (int) cellRepository.countBySessionIdAndOwnerId(gameId, playerId);
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
                .status(ClaimStatus.ATTACK_SUCCESS)
                .gameId(gameId)
                .cellId(cellId)
                .x(cell.getX())
                .y(cell.getY())
                .ownerId(playerId)
                .ownerUsername(player.getUsername())
                .ownerColor(player.getColor())
                .claimedAt(now)
                .cellsClaimed(newCellsClaimed)
                .turnNumber(nextTurnNumber)
                .nextPlayerId(nextPlayerId)
                .message("Enemy cell captured")
                .build();
    }

    private boolean isFrontierClaim(GameSession session, UUID playerId, Cell cell) {
        return isAdjacentToAnyOwnedCell(session, playerId, cell.getX(), cell.getY());
    }

    private boolean isAdjacentToAnyOwnedCell(GameSession session, UUID playerId, int targetX, int targetY) {
        List<Cell> ownCells = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(session.getId(), playerId);
        for (Cell ownedCell : ownCells) {
            if (isNeighbor(targetX, targetY, ownedCell.getX(), ownedCell.getY())) {
                return true;
            }
        }
        return false;
    }

    private boolean isNeighbor(int x1, int y1, int x2, int y2) {
        return !(x1 == x2 && y1 == y2)
                && Math.abs(x1 - x2) <= 1
                && Math.abs(y1 - y2) <= 1;
    }

    private UUID getNextTurnPlayer(GameSession session, UUID currentPlayerId) {
        List<UUID> playerIds = session.getPlayerIds();
        if (playerIds.isEmpty()) return null;
        int idx = playerIds.indexOf(currentPlayerId);
        if (idx == -1) return playerIds.get(0);
        return playerIds.get((idx + 1) % playerIds.size());
    }

    private void finishByScoring(GameSession session, UUID gameId, Instant now) {
        session.setStatus(GameStatus.FINISHED);
        session.setFinishedAt(now);
        session.setCurrentPlayerId(null);
        List<UUID> playerIds = session.getPlayerIds();
        int maxScore = -1;
        UUID winnerId = null;
        boolean tie = false;
        for (UUID pid : playerIds) {
            int score = calculateSessionScore(gameId, pid);
            session.setPlayerScore(pid, score);
            if (score > maxScore) {
                maxScore = score;
                winnerId = pid;
                tie = false;
            } else if (score == maxScore) {
                tie = true;
            }
        }
        if (tie) {
            winnerId = null;
        }
        session.setWinnerId(winnerId);
        gameSessionRepository.save(session);
        eventPublisher.publishEvent(new GameFinishedDomainEvent(
                gameId,
                winnerId,
                session.getPlayer1Score(),
                session.getPlayer2Score(),
                session.getPlayer3Score(),
                session.getPlayer4Score()
        ));
    }

    private int calculateSessionScore(UUID gameId, UUID playerId) {
        List<Cell> owned = cellRepository.findBySessionIdAndOwnerIdOrderByYAscXAsc(gameId, playerId);
        if (owned.isEmpty()) {
            return 0;
        }

        boolean[] visited = new boolean[owned.size()];
        int total = 0;
        for (int i = 0; i < owned.size(); i++) {
            if (visited[i]) {
                continue;
            }
            List<Cell> component = new ArrayList<>();
            dfs(owned, i, visited, component);
            int bonus = 0;
            int size = component.size();
            if (size >= 10) {
                bonus = 10;
            } else if (size >= 6) {
                bonus = 6;
            } else if (size >= 3) {
                bonus = 3;
            }
            total += component.stream().mapToInt(Cell::getCellValue).sum() + bonus;
        }
        return total;
    }

    private void dfs(List<Cell> cells, int index, boolean[] visited, List<Cell> component) {
        visited[index] = true;
        component.add(cells.get(index));
        for (int i = 0; i < cells.size(); i++) {
            if (!visited[i] && isNeighbor(cells.get(index).getX(), cells.get(index).getY(), cells.get(i).getX(), cells.get(i).getY())) {
                dfs(cells, i, visited, component);
            }
        }
    }

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

        Player player = playerRepository.findByIdForUpdate(playerId)
                .orElseThrow(() -> new PlayerNotFoundException(playerId));

        Instant now = Instant.now();
        long cooldownMs = gameProperties.getCooldownMs();
        if (player.getLastClaimAt() != null) {
            long elapsedMs = Duration.between(player.getLastClaimAt(), now).toMillis();
            if (elapsedMs < cooldownMs) {
                long remainingCooldownMs = cooldownMs - elapsedMs;
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
            Cell updatedCell = cellRepository.findById(cellId).orElse(cell);
            Player updatedOwner = updatedCell.getOwnerId() != null ? playerRepository.findById(updatedCell.getOwnerId()).orElse(player) : player;
            playerRepository.recordSuccessfulClaim(playerId, now);
            eventPublisher.publishEvent(new CellClaimedDomainEvent(
                    cellId,
                    cell.getX(),
                    cell.getY(),
                    playerId,
                    player.getUsername(),
                    player.getColor(),
                    now,
                    player.getCellsClaimed() + 1
            ));
            return ClaimCellResponse.builder()
                    .success(true)
                    .status(ClaimStatus.SUCCESS)
                    .cellId(cellId)
                    .x(updatedCell.getX())
                    .y(updatedCell.getY())
                    .ownerId(updatedCell.getOwnerId())
                    .ownerUsername(updatedOwner.getUsername())
                    .ownerColor(updatedOwner.getColor())
                    .claimedAt(updatedCell.getClaimedAt())
                    .cellsClaimed(player.getCellsClaimed() + 1)
                    .remainingCooldownMs(cooldownMs)
                    .message("Cell claimed successfully")
                    .build();
        }

        Cell currentCell = cellRepository.findById(cellId).orElse(cell);
        Player currentOwner = currentCell.getOwnerId() != null ? playerRepository.findById(currentCell.getOwnerId()).orElse(null) : null;
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
                .remainingCooldownMs(0L)
                .message("Cell has already been claimed")
                .build();
    }
}

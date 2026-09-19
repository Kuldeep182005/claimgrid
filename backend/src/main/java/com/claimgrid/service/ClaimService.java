package com.claimgrid.service;

import com.claimgrid.dto.ClaimCellResponse;
import com.claimgrid.entity.Cell;
import com.claimgrid.entity.Player;
import com.claimgrid.exception.CellNotFoundException;
import com.claimgrid.exception.PlayerNotFoundException;
import com.claimgrid.repository.CellRepository;
import com.claimgrid.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ClaimService {

    private static final Logger log = LoggerFactory.getLogger(ClaimService.class);

    private final CellRepository cellRepository;
    private final PlayerRepository playerRepository;

    public ClaimService(CellRepository cellRepository, PlayerRepository playerRepository) {
        this.cellRepository = cellRepository;
        this.playerRepository = playerRepository;
    }

    /**
     * Atomically claims a cell for a player.
     *
     * Exactly one concurrent claim can succeed on any unowned cell.
     * The database executes the transition atomically via an UPDATE WHERE owner_id IS NULL query.
     */
    @Transactional
    public ClaimCellResponse claimCell(UUID playerId, Long cellId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new PlayerNotFoundException(playerId));

        Cell cell = cellRepository.findById(cellId)
                .orElseThrow(() -> new CellNotFoundException(cellId));

        // Attempt atomic database claim
        int affectedRows = cellRepository.claimCellAtomically(cellId, playerId);

        if (affectedRows == 1) {
            // Claim succeeded - atomically increment player's claimed cell count
            playerRepository.incrementCellsClaimed(playerId);

            Instant claimedAt = Instant.now();
            log.info("Player '{}' ({}) successfully claimed cell #{} at ({}, {})",
                    player.getUsername(), playerId, cellId, cell.getX(), cell.getY());

            return ClaimCellResponse.builder()
                    .success(true)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .ownerId(playerId)
                    .ownerUsername(player.getUsername())
                    .ownerColor(player.getColor())
                    .claimedAt(claimedAt)
                    .message("Cell claimed successfully")
                    .build();
        } else {
            // Claim rejected - cell is already owned
            Cell currentCell = cellRepository.findById(cellId).orElse(cell);
            Player currentOwner = currentCell.getOwnerId() != null
                    ? playerRepository.findById(currentCell.getOwnerId()).orElse(null)
                    : null;

            log.warn("Claim attempt by player '{}' ({}) rejected for cell #{}: already claimed by {}",
                    player.getUsername(), playerId, cellId, currentCell.getOwnerId());

            return ClaimCellResponse.builder()
                    .success(false)
                    .cellId(cellId)
                    .x(cell.getX())
                    .y(cell.getY())
                    .ownerId(currentCell.getOwnerId())
                    .ownerUsername(currentOwner != null ? currentOwner.getUsername() : null)
                    .ownerColor(currentOwner != null ? currentOwner.getColor() : null)
                    .claimedAt(currentCell.getClaimedAt())
                    .message("Cell has already been claimed")
                    .build();
        }
    }
}

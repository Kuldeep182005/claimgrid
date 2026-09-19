package com.claimgrid.repository;

import com.claimgrid.entity.Cell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CellRepository extends JpaRepository<Cell, Long> {

    Optional<Cell> findByXAndY(int x, int y);

    List<Cell> findAllByOrderByYAscXAsc();

    long countByOwnerId(UUID ownerId);

    long countByOwnerIdIsNotNull();

    /**
     * Atomically claims a cell if and only if it is currently unowned (owner_id IS NULL).
     *
     * Returns 1 if the claim succeeded, 0 if the cell was already claimed.
     * This relies directly on PostgreSQL's row-level lock and write-consistency,
     * completely eliminating race conditions without application-level locks.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Cell c SET c.ownerId = null, c.claimedAt = null WHERE c.ownerId IS NOT NULL")
    int resetAllClaimedCells();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Cell c SET c.ownerId = :playerId, c.claimedAt = CURRENT_TIMESTAMP WHERE c.id = :cellId AND c.ownerId IS NULL")
    int claimCellAtomically(@Param("cellId") Long cellId, @Param("playerId") UUID playerId);
}

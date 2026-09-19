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

    Optional<Cell> findBySessionIdAndXAndY(UUID sessionId, int x, int y);

    Optional<Cell> findByIdAndSessionId(Long id, UUID sessionId);

    List<Cell> findBySessionIdOrderByYAscXAsc(UUID sessionId);

    @Query("SELECT c FROM Cell c WHERE c.sessionId IS NULL ORDER BY c.y ASC, c.x ASC")
    List<Cell> findAllGlobalCellsOrderByYAscXAsc();

    List<Cell> findAllByOrderByYAscXAsc();

    long countBySessionId(UUID sessionId);

    long countBySessionIdAndOwnerIdIsNotNull(UUID sessionId);

    long countBySessionIdAndOwnerId(UUID sessionId, UUID ownerId);

    long countByOwnerId(UUID ownerId);

    long countByOwnerIdIsNotNull();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Cell c WHERE c.sessionId IS NOT NULL")
    int deleteBySessionIdIsNotNull();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Cell c SET c.ownerId = null, c.claimedAt = null WHERE c.sessionId = :sessionId AND c.ownerId IS NOT NULL")
    int resetAllClaimedCellsInSession(@Param("sessionId") UUID sessionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Cell c SET c.ownerId = null, c.claimedAt = null WHERE c.ownerId IS NOT NULL")
    int resetAllClaimedCells();

    /**
     * Atomically claims a cell in a specific game session if and only if it is currently unowned.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Cell c SET c.ownerId = :playerId, c.claimedAt = CURRENT_TIMESTAMP WHERE c.id = :cellId AND c.sessionId = :sessionId AND c.ownerId IS NULL")
    int claimCellAtomically(@Param("cellId") Long cellId, @Param("sessionId") UUID sessionId, @Param("playerId") UUID playerId);

    /**
     * Atomically claims a cell in global mode if and only if it is currently unowned.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Cell c SET c.ownerId = :playerId, c.claimedAt = CURRENT_TIMESTAMP WHERE c.id = :cellId AND c.ownerId IS NULL")
    int claimCellAtomically(@Param("cellId") Long cellId, @Param("playerId") UUID playerId);
}

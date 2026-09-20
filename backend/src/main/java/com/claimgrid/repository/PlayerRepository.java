package com.claimgrid.repository;

import com.claimgrid.entity.Player;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlayerRepository extends JpaRepository<Player, UUID> {

    Optional<Player> findByUsername(String username);

    boolean existsByUsername(String username);

    List<Player> findTop10ByOrderByCellsClaimedDescCreatedAtAsc();

    @Query("SELECT p FROM Player p WHERE p.bot = false ORDER BY p.cellsClaimed DESC, p.createdAt ASC")
    List<Player> findLeaderboard(Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Player p SET p.cellsClaimed = p.cellsClaimed + 1, p.lastSeenAt = CURRENT_TIMESTAMP WHERE p.id = :playerId")
    int incrementCellsClaimed(@Param("playerId") UUID playerId);

    /**
     * Acquires a row-level lock (SELECT FOR UPDATE) on the player row.
     * This serializes concurrent claim requests from the SAME player,
     * ensuring race-safe cooldown checking and preventing double claims.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Player p WHERE p.id = :id")
    Optional<Player> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Atomically records a successful claim: increments territory count and updates
     * both last_claim_at and last_seen_at timestamps in a single database statement.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Player p SET p.cellsClaimed = p.cellsClaimed + 1, p.lastClaimAt = :now, p.lastSeenAt = :now WHERE p.id = :playerId")
    int recordSuccessfulClaim(@Param("playerId") UUID playerId, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Player p SET p.lastClaimAt = :now, p.lastSeenAt = :now WHERE p.id = :playerId")
    int recordPracticeClaim(@Param("playerId") UUID playerId, @Param("now") Instant now);
}

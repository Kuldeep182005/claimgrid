package com.claimgrid.repository;

import com.claimgrid.entity.Player;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlayerRepository extends JpaRepository<Player, UUID> {

    Optional<Player> findByUsername(String username);

    boolean existsByUsername(String username);

    List<Player> findTop10ByOrderByCellsClaimedDescCreatedAtAsc();

    @Query("SELECT p FROM Player p ORDER BY p.cellsClaimed DESC, p.createdAt ASC")
    List<Player> findLeaderboard(Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Player p SET p.cellsClaimed = p.cellsClaimed + 1, p.lastSeenAt = CURRENT_TIMESTAMP WHERE p.id = :playerId")
    int incrementCellsClaimed(@Param("playerId") UUID playerId);
}

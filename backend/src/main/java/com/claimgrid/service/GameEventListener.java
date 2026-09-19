package com.claimgrid.service;

import com.claimgrid.websocket.GameSessionManager;
import com.claimgrid.websocket.event.CellClaimedDomainEvent;
import com.claimgrid.websocket.event.CellClaimedEvent;
import com.claimgrid.websocket.event.LeaderboardUpdatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Post-commit transaction event listener.
 *
 * Guarantees that CELL_CLAIMED and LEADERBOARD_UPDATED events are dispatched over
 * WebSocket ONLY AFTER the database claim transaction has successfully committed.
 * If the database transaction rolls back, this listener never executes.
 */
@Component
public class GameEventListener {

    private static final Logger log = LoggerFactory.getLogger(GameEventListener.class);

    private final GameSessionManager sessionManager;

    public GameEventListener(GameSessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCellClaimed(CellClaimedDomainEvent event) {
        log.debug("Database transaction committed for cell #{}. Broadcasting WebSocket events.", event.cellId());

        // 1. Broadcast CELL_CLAIMED
        sessionManager.broadcast(CellClaimedEvent.builder()
                .cellId(event.cellId())
                .x(event.x())
                .y(event.y())
                .playerId(event.playerId())
                .playerName(event.playerName())
                .color(event.color())
                .claimedAt(event.claimedAt())
                .build());

        // 2. Broadcast LEADERBOARD_UPDATED
        sessionManager.broadcast(LeaderboardUpdatedEvent.builder()
                .playerId(event.playerId())
                .cellsClaimed(event.cellsClaimed())
                .build());
    }
}

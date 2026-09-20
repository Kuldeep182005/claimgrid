package com.claimgrid.service;

import com.claimgrid.websocket.GameSessionManager;
import com.claimgrid.websocket.event.CellClaimedDomainEvent;
import com.claimgrid.websocket.event.CellClaimedEvent;
import com.claimgrid.websocket.event.GameFinishedDomainEvent;
import com.claimgrid.websocket.event.GameFinishedEvent;
import com.claimgrid.websocket.event.GameStartedDomainEvent;
import com.claimgrid.websocket.event.GameStartedEvent;
import com.claimgrid.websocket.event.LeaderboardUpdatedEvent;
import com.claimgrid.websocket.event.TurnChangedDomainEvent;
import com.claimgrid.websocket.event.TurnChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Post-commit transaction event listener.
 *
 * Guarantees that battle events (CELL_CLAIMED, TURN_CHANGED, GAME_STARTED, GAME_FINISHED)
 * are dispatched over WebSocket ONLY AFTER the database claim transaction has successfully committed.
 * All events are scoped to the specific game session to guarantee game isolation.
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
        log.debug("Database transaction committed for cell #{}. Broadcasting to game {}.", event.cellId(), event.gameId());

        // 1. Broadcast CELL_CLAIMED to the game session
        CellClaimedEvent cellClaimedEvent = CellClaimedEvent.builder()
                .gameId(event.gameId())
                .cellId(event.cellId())
                .x(event.x())
                .y(event.y())
                .playerId(event.playerId())
                .playerName(event.playerName())
                .color(event.color())
                .claimedAt(event.claimedAt())
                .turnNumber(event.turnNumber())
                .nextPlayerId(event.nextPlayerId())
                .build();

        sessionManager.broadcastToGame(event.gameId(), cellClaimedEvent);

        // 2. Broadcast LEADERBOARD_UPDATED to the game session
        sessionManager.broadcastToGame(event.gameId(), LeaderboardUpdatedEvent.builder()
                .playerId(event.playerId())
                .cellsClaimed(event.cellsClaimed())
                .build());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTurnChanged(TurnChangedDomainEvent event) {
        log.debug("Broadcasting TURN_CHANGED in game {}: nextPlayer={}, turn={}",
                event.gameId(), event.currentPlayerId(), event.turnNumber());

        sessionManager.broadcastToGame(event.gameId(), TurnChangedEvent.builder()
                .gameId(event.gameId())
                .currentPlayerId(event.currentPlayerId())
                .turnNumber(event.turnNumber())
                .build());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onGameStarted(GameStartedDomainEvent event) {
        log.info("Broadcasting GAME_STARTED in game {} with code {}", event.gameId(), event.code());

        sessionManager.broadcastToGame(event.gameId(), GameStartedEvent.builder()
                .gameId(event.gameId())
                .code(event.code())
                .maxPlayers(event.maxPlayers())
                .player1Id(event.player1Id())
                .player2Id(event.player2Id())
                .player3Id(event.player3Id())
                .player4Id(event.player4Id())
                .playerIds(event.playerIds())
                .currentPlayerId(event.currentPlayerId())
                .turnNumber(event.turnNumber())
                .build());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onGameFinished(GameFinishedDomainEvent event) {
        log.info("Broadcasting GAME_FINISHED in game {}: winner={}", event.gameId(), event.winnerId());

        sessionManager.broadcastToGame(event.gameId(), GameFinishedEvent.builder()
                .gameId(event.gameId())
                .winnerId(event.winnerId())
                .player1Score(event.player1Score())
                .player2Score(event.player2Score())
                .player3Score(event.player3Score())
                .player4Score(event.player4Score())
                .build());
    }
}

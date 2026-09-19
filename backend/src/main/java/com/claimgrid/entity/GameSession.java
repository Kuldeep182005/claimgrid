package com.claimgrid.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "game_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GameStatus status;

    @Column(name = "player1_id", nullable = false)
    private UUID player1Id;

    @Column(name = "player2_id")
    private UUID player2Id;

    @Column(name = "current_player_id")
    private UUID currentPlayerId;

    @Column(name = "turn_number", nullable = false)
    @Builder.Default
    private int turnNumber = 0;

    @Column(name = "winner_id")
    private UUID winnerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
        if (this.status == null) {
            this.status = GameStatus.WAITING;
        }
    }

    public boolean isFull() {
        return player1Id != null && player2Id != null;
    }

    public boolean hasPlayer(UUID playerId) {
        if (playerId == null) return false;
        return playerId.equals(player1Id) || playerId.equals(player2Id);
    }

    public boolean isTurnOf(UUID playerId) {
        return currentPlayerId != null && currentPlayerId.equals(playerId);
    }

    public int getPlayerCount() {
        int count = 0;
        if (player1Id != null) count++;
        if (player2Id != null) count++;
        return count;
    }
}

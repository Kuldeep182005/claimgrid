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
import java.util.ArrayList;
import java.util.List;
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

    @Column(name = "max_players", nullable = false)
    @Builder.Default
    private int maxPlayers = 2;

    @Column(name = "player1_id", nullable = false)
    private UUID player1Id;

    @Column(name = "player2_id")
    private UUID player2Id;

    @Column(name = "player3_id")
    private UUID player3Id;

    @Column(name = "player4_id")
    private UUID player4Id;

    @Column(name = "current_player_id")
    private UUID currentPlayerId;

    @Column(name = "turn_number", nullable = false)
    @Builder.Default
    private int turnNumber = 0;

    @Column(name = "turn_limit", nullable = false)
    @Builder.Default
    private int turnLimit = 40;

    @Column(name = "player1_score", nullable = false)
    @Builder.Default
    private int player1Score = 0;

    @Column(name = "player2_score", nullable = false)
    @Builder.Default
    private int player2Score = 0;

    @Column(name = "player3_score", nullable = false)
    @Builder.Default
    private int player3Score = 0;

    @Column(name = "player4_score", nullable = false)
    @Builder.Default
    private int player4Score = 0;

    @Column(name = "winner_id")
    private UUID winnerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "is_practice", nullable = false)
    @Builder.Default
    private boolean practice = false;

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
        return getPlayerCount() >= maxPlayers;
    }

    public boolean hasPlayer(UUID playerId) {
        if (playerId == null) return false;
        return playerId.equals(player1Id)
                || playerId.equals(player2Id)
                || playerId.equals(player3Id)
                || playerId.equals(player4Id);
    }

    public boolean isTurnOf(UUID playerId) {
        return currentPlayerId != null && currentPlayerId.equals(playerId);
    }

    public int getPlayerCount() {
        int count = 0;
        if (player1Id != null) count++;
        if (player2Id != null) count++;
        if (player3Id != null) count++;
        if (player4Id != null) count++;
        return count;
    }

    public List<UUID> getPlayerIds() {
        List<UUID> list = new ArrayList<>(4);
        if (player1Id != null) list.add(player1Id);
        if (player2Id != null) list.add(player2Id);
        if (player3Id != null) list.add(player3Id);
        if (player4Id != null) list.add(player4Id);
        return list;
    }

    public void addPlayer(UUID playerId) {
        if (player2Id == null) {
            player2Id = playerId;
        } else if (player3Id == null) {
            player3Id = playerId;
        } else if (player4Id == null) {
            player4Id = playerId;
        } else {
            throw new IllegalStateException("GameSession is already full");
        }
    }

    public void setPlayerScore(UUID playerId, int score) {
        if (playerId == null) return;
        if (playerId.equals(player1Id)) player1Score = score;
        else if (playerId.equals(player2Id)) player2Score = score;
        else if (playerId.equals(player3Id)) player3Score = score;
        else if (playerId.equals(player4Id)) player4Score = score;
    }

    public int getPlayerScore(UUID playerId) {
        if (playerId == null) return 0;
        if (playerId.equals(player1Id)) return player1Score;
        if (playerId.equals(player2Id)) return player2Score;
        if (playerId.equals(player3Id)) return player3Score;
        if (playerId.equals(player4Id)) return player4Score;
        return 0;
    }
}

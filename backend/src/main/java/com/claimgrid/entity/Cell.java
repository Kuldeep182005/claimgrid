package com.claimgrid.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cells")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cell {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(nullable = false)
    private int x;

    @Column(nullable = false)
    private int y;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "claimed_at")
    private Instant claimedAt;

    public boolean isClaimed() {
        return ownerId != null;
    }
}

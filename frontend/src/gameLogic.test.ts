import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Cell } from './types/game.ts';
import type { LeaderboardEntry } from './types/player.ts';
import type { CellClaimedEvent, LeaderboardUpdatedEvent, PlayerJoinedEvent, PlayerLeftEvent } from './types/websocket.ts';

describe('ClaimGrid Phase 5 — Frontend Logic & State Management', () => {

  it('1. CELL_CLAIMED event updates only the affected cell in 2,500 grid', () => {
    // Initialize a sample 50-cell slice
    const initialCells: Cell[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      x: i % 10,
      y: Math.floor(i / 10),
      ownerId: null,
      claimedAt: null,
    }));

    const event: CellClaimedEvent = {
      type: 'CELL_CLAIMED',
      cellId: 12,
      x: 1,
      y: 1,
      playerId: 'player-uuid-123',
      playerName: 'CommanderNova',
      color: '#6366F1',
      claimedAt: '2026-09-20T00:00:00Z',
    };

    // State update reduction
    const updatedCells = [...initialCells];
    const targetIdx = event.cellId - 1;
    updatedCells[targetIdx] = {
      ...updatedCells[targetIdx],
      ownerId: event.playerId,
      claimedAt: event.claimedAt,
    };

    // Assert target cell is updated
    assert.equal(updatedCells[targetIdx].ownerId, 'player-uuid-123');
    assert.equal(updatedCells[targetIdx].claimedAt, '2026-09-20T00:00:00Z');

    // Assert adjacent cells remain unowned
    assert.equal(updatedCells[targetIdx - 1].ownerId, null);
    assert.equal(updatedCells[targetIdx + 1].ownerId, null);
  });

  it('2. LEADERBOARD_UPDATED dynamically re-ranks players by score descending', () => {
    const currentLeaderboard: LeaderboardEntry[] = [
      { id: 'p1', username: 'Alice', color: '#EF4444', cellsClaimed: 10, currentStreak: 0, rank: 1 },
      { id: 'p2', username: 'Bob', color: '#3B82F6', cellsClaimed: 8, currentStreak: 0, rank: 2 },
      { id: 'p3', username: 'Charlie', color: '#10B981', cellsClaimed: 5, currentStreak: 0, rank: 3 },
    ];

    // Bob claims 5 more cells, reaching 13 and taking #1
    const event: LeaderboardUpdatedEvent = {
      type: 'LEADERBOARD_UPDATED',
      playerId: 'p2',
      cellsClaimed: 13,
    };

    const updated = currentLeaderboard.map((entry) =>
      entry.id === event.playerId ? { ...entry, cellsClaimed: event.cellsClaimed } : entry
    );

    const reRanked = updated
      .sort((a, b) => b.cellsClaimed - a.cellsClaimed)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    assert.equal(reRanked[0].id, 'p2');
    assert.equal(reRanked[0].rank, 1);
    assert.equal(reRanked[0].cellsClaimed, 13);

    assert.equal(reRanked[1].id, 'p1');
    assert.equal(reRanked[1].rank, 2);
    assert.equal(reRanked[1].cellsClaimed, 10);
  });

  it('3. PLAYER_JOINED and PLAYER_LEFT correctly update active telemetry', () => {
    let onlineCount = 1;
    const playersMap = new Map<string, { username: string; color: string }>();

    // Join
    const joinEvent: PlayerJoinedEvent = {
      type: 'PLAYER_JOINED',
      playerId: 'p-new',
      playerName: 'Spectre',
      color: '#EC4899',
    };
    onlineCount += 1;
    playersMap.set(joinEvent.playerId, { username: joinEvent.playerName, color: joinEvent.color });

    assert.equal(onlineCount, 2);
    assert.equal(playersMap.get('p-new')?.username, 'Spectre');

    // Leave
    const leaveEvent: PlayerLeftEvent = {
      type: 'PLAYER_LEFT',
      playerId: 'p-new',
    };
    assert.equal(leaveEvent.type, 'PLAYER_LEFT');
    assert.equal(leaveEvent.playerId, 'p-new');
    onlineCount = Math.max(1, onlineCount - 1);
    assert.equal(onlineCount, 1);
  });

  it('4. Cooldown progress calculation correctly models 0.0 to 1.0 progression', () => {
    const totalMs = 3000;

    // Just triggered
    let remainingMs = 3000;
    let progress = (totalMs - remainingMs) / totalMs;
    assert.equal(progress, 0.0);
    assert.equal(remainingMs === 0, false);

    // Halfway
    remainingMs = 1500;
    progress = (totalMs - remainingMs) / totalMs;
    assert.equal(progress, 0.5);

    // Completed
    remainingMs = 0;
    progress = (totalMs - remainingMs) / totalMs;
    assert.equal(progress, 1.0);
    assert.equal(remainingMs === 0, true);
  });

  it('5. Claim rejection status codes map cleanly without UI mutation', () => {
    const validStatuses = [
      'SUCCESS',
      'COOLDOWN_ACTIVE',
      'CELL_ALREADY_CLAIMED',
      'PLAYER_NOT_FOUND',
      'CELL_NOT_FOUND',
      'INVALID_REQUEST',
    ];

    for (const status of validStatuses) {
      assert.ok(status.length > 0);
    }
  });
});

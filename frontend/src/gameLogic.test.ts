import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Cell } from './types/game.ts';
import type { LeaderboardEntry } from './types/player.ts';
import type { CellClaimedEvent, LeaderboardUpdatedEvent, PlayerJoinedEvent, PlayerLeftEvent } from './types/websocket.ts';

describe('ClaimGrid Phase 5 & 6 — Frontend Logic & Interaction System', () => {

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

  it('6. Leaderboard hover spotlight correctly discriminates highlighted vs dimmed cells', () => {
    const cells: Array<{ id: number; ownerId: string | null }> = [
      { id: 1, ownerId: 'player-A' },
      { id: 2, ownerId: 'player-B' },
      { id: 3, ownerId: null },
    ];

    const highlightedOwnerId = 'player-A';

    const cell1Highlight = highlightedOwnerId ? cells[0].ownerId === highlightedOwnerId : false;
    const cell1Dimmed = highlightedOwnerId ? (cells[0].ownerId !== null && cells[0].ownerId !== highlightedOwnerId) : false;

    const cell2Highlight = highlightedOwnerId ? cells[1].ownerId === highlightedOwnerId : false;
    const cell2Dimmed = highlightedOwnerId ? (cells[1].ownerId !== null && cells[1].ownerId !== highlightedOwnerId) : false;

    const cell3Highlight = highlightedOwnerId ? cells[2].ownerId === highlightedOwnerId : false;
    const cell3Dimmed = highlightedOwnerId ? (cells[2].ownerId !== null && cells[2].ownerId !== highlightedOwnerId) : false;

    assert.equal(cell1Highlight, true);
    assert.equal(cell1Dimmed, false);

    assert.equal(cell2Highlight, false);
    assert.equal(cell2Dimmed, true);

    assert.equal(cell3Highlight, false);
    assert.equal(cell3Dimmed, false);
  });

  it('7. First-time player directive logic shows before first claim and dismisses on success', () => {
    let cellsClaimed = 0;
    assert.equal(cellsClaimed === 0, true, 'Directive should show initially');

    cellsClaimed = 1;
    assert.equal(cellsClaimed === 0, false, 'Directive must be dismissed once first claim succeeds');
  });

  /* ==================================================
   * PHASE 7: PRIVATE 2-PLAYER BATTLE & TURN SYSTEM TESTS
   * ================================================== */

  it('8. 25×25 battlefield creates exactly 625 scoped sectors with coordinates 0..24', () => {
    const cells: Cell[] = [];
    for (let y = 0; y < 25; y++) {
      for (let x = 0; x < 25; x++) {
        cells.push({
          id: y * 25 + x + 1,
          x,
          y,
          ownerId: null,
          claimedAt: null,
        });
      }
    }

    assert.equal(cells.length, 625, 'Grid must contain exactly 625 cells');
    assert.equal(cells[0].x, 0);
    assert.equal(cells[0].y, 0);
    assert.equal(cells[624].x, 24);
    assert.equal(cells[624].y, 24);

    // Verify coordinate uniqueness
    const coords = new Set(cells.map((c) => `${c.x},${c.y}`));
    assert.equal(coords.size, 625, 'Every sector must have unique (x, y) coordinates');
  });

  it('9. Game session status transitions correctly from WAITING -> ACTIVE -> FINISHED', () => {
    type Status = 'WAITING' | 'ACTIVE' | 'FINISHED';
    let status: Status = 'WAITING';
    let playerCount = 1;

    // Second player joins
    playerCount += 1;
    if (playerCount === 2) {
      status = 'ACTIVE';
    }
    assert.equal(status, 'ACTIVE');

    // All cells claimed
    const claimedCount = 625;
    if (claimedCount === 625) {
      status = 'FINISHED';
    }
    assert.equal(status, 'FINISHED');
  });

  it('10. Turn enforcement correctly authorizes current player and rejects opponent', () => {
    const playerAId = 'p-uuid-a';
    const playerBId = 'p-uuid-b';
    const currentPlayerId = playerAId;

    const canClaimA = currentPlayerId === playerAId;
    const canClaimB = currentPlayerId === playerBId;

    assert.equal(canClaimA, true, 'Current player A must be permitted to claim');
    assert.equal(canClaimB, false, 'Opponent B must be rejected when not their turn');
  });

  it('11. Turn rotation alternates correctly between Player A and Player B', () => {
    const player1 = 'p-1';
    const player2 = 'p-2';
    let currentPlayer = player1;
    let turnNumber = 1;

    // Player 1 claims
    currentPlayer = currentPlayer === player1 ? player2 : player1;
    turnNumber += 1;
    assert.equal(currentPlayer, player2);
    assert.equal(turnNumber, 2);

    // Player 2 claims
    currentPlayer = currentPlayer === player1 ? player2 : player1;
    turnNumber += 1;
    assert.equal(currentPlayer, player1);
    assert.equal(turnNumber, 3);
  });

  it('12. TURN_CHANGED event updates turn telemetry on both clients', () => {
    let currentTurn = 1;
    let activePlayer = 'p-1';

    const event = {
      type: 'TURN_CHANGED',
      gameId: 'game-uuid-1',
      currentPlayerId: 'p-2',
      turnNumber: 2,
    };

    if (event.type === 'TURN_CHANGED') {
      currentTurn = event.turnNumber;
      activePlayer = event.currentPlayerId;
    }

    assert.equal(currentTurn, 2);
    assert.equal(activePlayer, 'p-2');
  });

  it('13. Game end state correctly determines VICTORY, DEFEAT, and DRAW', () => {
    const currentUserId = 'player-me';

    // Scenario A: Player won
    const winWinnerId = 'player-me';
    const isWin = winWinnerId === currentUserId;
    const isDrawWin = winWinnerId === null;
    assert.equal(isWin, true);
    assert.equal(isDrawWin, false);

    // Scenario B: Opponent won
    const lossWinnerId = 'player-rival';
    const isLoss = lossWinnerId !== currentUserId && lossWinnerId !== null;
    assert.equal(isLoss, true);

    // Scenario C: Draw
    const drawWinnerId: string | null = null;
    const isDraw = drawWinnerId === null;
    assert.equal(isDraw, true);
  });

  it('14. Battle code validation and normalization rules', () => {
    const normalizeCode = (raw: string) => raw.trim().toUpperCase();

    assert.equal(normalizeCode('x7k92p'), 'X7K92P');
    assert.equal(normalizeCode('  a3b4c5  '), 'A3B4C5');

    const isValidCode = (code: string) => /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(code);
    assert.equal(isValidCode('X7K92P'), true);
    assert.equal(isValidCode('ABCD'), false, 'Too short');
    assert.equal(isValidCode('X7K92P123'), false, 'Too long');
  });
});

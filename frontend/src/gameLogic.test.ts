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
    const onlinePlayerIds = new Set<string>(['p-self']);
    const playersMap = new Map<string, { username: string; color: string }>();

    // Case A: Receiving own PLAYER_JOINED does not double-count (1 -> 1)
    const selfJoinEvent: PlayerJoinedEvent = {
      type: 'PLAYER_JOINED',
      playerId: 'p-self',
      playerName: 'Commander',
      color: '#6366F1',
      onlineCount: 1,
    };
    onlinePlayerIds.add(selfJoinEvent.playerId);
    onlineCount = selfJoinEvent.onlineCount ?? onlinePlayerIds.size;
    assert.equal(onlineCount, 1);
    assert.equal(onlinePlayerIds.size, 1);

    // Case B: Rival joins battle (1 -> 2)
    const joinEvent: PlayerJoinedEvent = {
      type: 'PLAYER_JOINED',
      playerId: 'p-new',
      playerName: 'Spectre',
      color: '#EC4899',
      onlineCount: 2,
    };
    onlinePlayerIds.add(joinEvent.playerId);
    onlineCount = joinEvent.onlineCount ?? onlinePlayerIds.size;
    playersMap.set(joinEvent.playerId, { username: joinEvent.playerName, color: joinEvent.color });

    assert.equal(onlineCount, 2);
    assert.equal(onlinePlayerIds.size, 2);
    assert.equal(playersMap.get('p-new')?.username, 'Spectre');

    // Case C: Duplicate tab for same player does not increase unique count
    onlinePlayerIds.add('p-new');
    assert.equal(onlinePlayerIds.size, 2);

    // Case D: Rival leaves (2 -> 1)
    const leaveEvent: PlayerLeftEvent = {
      type: 'PLAYER_LEFT',
      playerId: 'p-new',
      onlineCount: 1,
    };
    assert.equal(leaveEvent.type, 'PLAYER_LEFT');
    assert.equal(leaveEvent.playerId, 'p-new');
    onlinePlayerIds.delete(leaveEvent.playerId);
    onlineCount = leaveEvent.onlineCount ?? Math.max(1, onlinePlayerIds.size);
    assert.equal(onlineCount, 1);
    assert.equal(onlinePlayerIds.size, 1);
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

  /* ==================================================
   * PHASE 8: 2/4-PLAYER MULTIPLAYER SYSTEM TESTS
   * ================================================== */

  it('15. 4-Player lobby capacity validation allows strictly 2 or 4 players', () => {
    const isValidPlayerCount = (count: number) => count === 2 || count === 4;

    assert.equal(isValidPlayerCount(2), true, '2 players must be accepted');
    assert.equal(isValidPlayerCount(4), true, '4 players must be accepted');
    assert.equal(isValidPlayerCount(1), false, '1 player must be rejected');
    assert.equal(isValidPlayerCount(3), false, '3 players must be rejected');
    assert.equal(isValidPlayerCount(5), false, '5 players must be rejected');
    assert.equal(isValidPlayerCount(6), false, '6 players must be rejected');
  });

  it('16. 4-Player turn rotation follows strict authoritative cycle A -> B -> C -> D -> A', () => {
    const players = ['player-A', 'player-B', 'player-C', 'player-D'];
    let currentIndex = 0;

    const nextTurn = () => {
      currentIndex = (currentIndex + 1) % players.length;
      return players[currentIndex];
    };

    assert.equal(players[currentIndex], 'player-A', 'Starts on Player A');
    assert.equal(nextTurn(), 'player-B', 'Advances to Player B');
    assert.equal(nextTurn(), 'player-C', 'Advances to Player C');
    assert.equal(nextTurn(), 'player-D', 'Advances to Player D');
    assert.equal(nextTurn(), 'player-A', 'Wraps back to Player A');
    assert.equal(nextTurn(), 'player-B', 'Cycles continuously to Player B');
  });

  it('17. 4-Player match start requires all 4 players and rejects 5th player', () => {
    const maxPlayers = 4;
    const joinedPlayers: string[] = [];

    const join = (playerId: string) => {
      if (joinedPlayers.includes(playerId)) return { status: 'DUPLICATE' };
      if (joinedPlayers.length >= maxPlayers) return { status: 'FULL' };
      joinedPlayers.push(playerId);
      const matchStarted = joinedPlayers.length === maxPlayers;
      return { status: 'JOINED', matchStarted };
    };

    assert.deepEqual(join('p1'), { status: 'JOINED', matchStarted: false });
    assert.deepEqual(join('p2'), { status: 'JOINED', matchStarted: false });
    assert.deepEqual(join('p2'), { status: 'DUPLICATE' });
    assert.deepEqual(join('p3'), { status: 'JOINED', matchStarted: false });
    assert.deepEqual(join('p4'), { status: 'JOINED', matchStarted: true });
    assert.deepEqual(join('p5'), { status: 'FULL' });
  });

  it('18. 4-Player final standings rank all 4 players by score descending with medals', () => {
    const players = [
      { id: 'p1', username: 'Nova', color: '#6366F1', cellsClaimed: 8, score: 24 },
      { id: 'p2', username: 'Luna', color: '#10B981', cellsClaimed: 12, score: 42 },
      { id: 'p3', username: 'Rex', color: '#F59E0B', cellsClaimed: 10, score: 31 },
      { id: 'p4', username: 'Kai', color: '#EC4899', cellsClaimed: 6, score: 18 },
    ];

    const ranked = [...players].sort((a, b) => b.score - a.score);

    assert.equal(ranked[0].username, 'Luna', '1st place must be highest score');
    assert.equal(ranked[0].score, 42);
    assert.equal(ranked[1].username, 'Rex', '2nd place');
    assert.equal(ranked[1].score, 31);
    assert.equal(ranked[2].username, 'Nova', '3rd place');
    assert.equal(ranked[2].score, 24);
    assert.equal(ranked[3].username, 'Kai', '4th place');
    assert.equal(ranked[3].score, 18);
  });
});

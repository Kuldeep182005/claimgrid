import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { useCooldown } from './useCooldown';
import { useWebSocket } from './useWebSocket';
import type { Cell, GameSession } from '../types/game';
import type { LeaderboardEntry, Player } from '../types/player';
import type { ServerGameEvent } from '../types/websocket';

export interface ActivityItem {
  id: string;
  type: 'CLAIM' | 'REMOTE_CLAIM' | 'JOIN' | 'LEAVE';
  message: string;
  timestamp: number;
  color?: string;
}

export function useGameState(initialPlayer: Player | null, activeGameId?: string | null) {
  const [player, setPlayer] = useState<Player | null>(initialPlayer);
  const [cells, setCells] = useState<Cell[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playersMap, setPlayersMap] = useState<Map<string, { username: string; color: string }>>(new Map());
  const [stats, setStats] = useState({ width: 25, height: 25, totalCells: 625, claimedCells: 0 });
  const [battleSession, setBattleSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingCellId, setClaimingCellId] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [lastClaimAnimation, setLastClaimAnimation] = useState<{ cellId: number; isSelf: boolean; timestamp: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const cooldown = useCooldown();
  const { isCooldownActive, getRemainingSeconds, startCooldown } = cooldown;
  const cellsMapRef = useRef<Map<number, Cell>>(new Map());
  const playerRef = useRef<Player | null>(player);
  const battleSessionRef = useRef<GameSession | null>(battleSession);
  const snapshotRequestIdRef = useRef<number>(0);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    battleSessionRef.current = battleSession;
  }, [battleSession]);

  const addActivity = useCallback((type: ActivityItem['type'], message: string, color?: string) => {
    setActivityFeed((prev) => [
      { id: `${Date.now()}-${Math.random()}`, type, message, timestamp: Date.now(), color },
      ...prev.slice(0, 4), // keep latest 5
    ]);
  }, []);

  const showStatus = useCallback((text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    window.setTimeout(() => {
      setStatusMessage((current) => (current?.text === text ? null : current));
    }, 3500);
  }, []);

  // Fetch full authoritative REST snapshot with safe reconciliation
  const loadSnapshot = useCallback(async () => {
    const requestId = ++snapshotRequestIdRef.current;
    try {
      if (activeGameId) {
        const battleState = await api.fetchBattleState(activeGameId);
        if (requestId !== snapshotRequestIdRef.current) return;

        setStats({
          width: battleState.width,
          height: battleState.height,
          totalCells: battleState.totalCells,
          claimedCells: battleState.claimedCells,
        });

        const sessionData: GameSession = {
          gameId: battleState.gameId,
          code: battleState.code,
          status: battleState.status,
          playerCount: battleState.players.length,
          currentPlayerId: battleState.currentPlayerId,
          turnNumber: battleState.turnNumber,
          winnerId: battleState.winnerId,
          startedAt: battleState.startedAt,
          finishedAt: battleState.finishedAt,
          players: battleState.players,
        };
        setBattleSession(sessionData);

        // Reconcile cells
        setCells((prevCells) => {
          const prevMap = new Map(prevCells.map((c) => [c.id, c]));
          const reconciled = battleState.cells.map((snapshotCell) => {
            const inMemoryCell = prevMap.get(snapshotCell.id);
            if (!inMemoryCell) return snapshotCell;
            if (inMemoryCell.ownerId !== null && snapshotCell.ownerId === null) return inMemoryCell;
            return snapshotCell;
          });

          const newMap = new Map<number, Cell>();
          reconciled.forEach((c) => newMap.set(c.id, c));
          cellsMapRef.current = newMap;
          return reconciled;
        });

        // Populate players and leaderboard from session players
        const entries: LeaderboardEntry[] = battleState.players.map((p, idx) => ({
          id: p.id,
          username: p.username,
          color: p.color,
          cellsClaimed: p.cellsClaimed,
          currentStreak: 0,
          rank: idx + 1,
        }));
        setLeaderboard(entries);

        setPlayersMap((prev) => {
          const next = new Map(prev);
          battleState.players.forEach((p) => next.set(p.id, { username: p.username, color: p.color }));
          return next;
        });
      } else {
        // Fallback global mode
        const [gameState, lb] = await Promise.all([
          api.fetchGameState(),
          api.fetchLeaderboard(50),
        ]);
        if (requestId !== snapshotRequestIdRef.current) return;

        setStats({
          width: gameState.width,
          height: gameState.height,
          totalCells: gameState.totalCells,
          claimedCells: gameState.claimedCells,
        });

        setCells((prevCells) => {
          const prevMap = new Map(prevCells.map((c) => [c.id, c]));
          const reconciled = gameState.cells.map((snapshotCell) => {
            const inMemoryCell = prevMap.get(snapshotCell.id);
            if (!inMemoryCell) return snapshotCell;
            if (inMemoryCell.ownerId !== null && snapshotCell.ownerId === null) return inMemoryCell;
            return snapshotCell;
          });
          const newMap = new Map<number, Cell>();
          reconciled.forEach((c) => newMap.set(c.id, c));
          cellsMapRef.current = newMap;
          return reconciled;
        });

        setLeaderboard(lb.entries);
        setPlayersMap((prev) => {
          const next = new Map(prev);
          lb.entries.forEach((entry) => next.set(entry.id, { username: entry.username, color: entry.color }));
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load authoritative game state:', err);
      showStatus('Failed to connect to game server. Retrying...', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeGameId, showStatus]);

  // Handle incoming real-time WebSocket events
  const handleWebSocketEvent = useCallback((event: ServerGameEvent) => {
    switch (event.type) {
      case 'CELL_CLAIMED': {
        const currentPlayer = playerRef.current;
        const isSelf = currentPlayer !== null && event.playerId === currentPlayer.id;

        // Register player metadata
        setPlayersMap((prev) => {
          const next = new Map(prev);
          next.set(event.playerId, { username: event.playerName, color: event.color });
          return next;
        });

        // Update in-memory cell map
        const existingInMap = cellsMapRef.current.get(event.cellId);
        if (existingInMap) {
          cellsMapRef.current.set(event.cellId, {
            ...existingInMap,
            ownerId: event.playerId,
            claimedAt: event.claimedAt,
          });
        }

        // Update cell in state
        setCells((prevCells) =>
          prevCells.map((c) =>
            c.id === event.cellId
              ? { ...c, ownerId: event.playerId, claimedAt: event.claimedAt }
              : c
          )
        );

        // Update stats
        setStats((prev) => ({
          ...prev,
          claimedCells: prev.claimedCells + 1,
        }));

        // Update turn info in session if present
        if (event.nextPlayerId !== undefined) {
          setBattleSession((prev) =>
            prev
              ? {
                  ...prev,
                  currentPlayerId: event.nextPlayerId ?? null,
                  turnNumber: event.turnNumber ?? prev.turnNumber,
                }
              : null
          );
        }

        // Audio & visual feedback
        setLastClaimAnimation({ cellId: event.cellId, isSelf, timestamp: Date.now() });
        window.setTimeout(() => {
          setLastClaimAnimation((curr) => (curr?.cellId === event.cellId ? null : curr));
        }, 700);

        if (!isSelf) {
          sound.playRemoteClaim();
          addActivity('REMOTE_CLAIM', `${event.playerName} captured Sector (${event.x}, ${event.y})`, event.color);
        } else {
          setPlayer((prev) => (prev ? { ...prev, cellsClaimed: prev.cellsClaimed + 1 } : null));
        }
        break;
      }

      case 'TURN_CHANGED': {
        setBattleSession((prev) =>
          prev
            ? {
                ...prev,
                currentPlayerId: event.currentPlayerId,
                turnNumber: event.turnNumber,
              }
            : null
        );
        const currentPlayer = playerRef.current;
        if (currentPlayer && event.currentPlayerId === currentPlayer.id) {
          sound.playClaimSuccess();
          showStatus('⚡ YOUR TURN — FIRE CLAIM CANNON', 'success');
        }
        break;
      }

      case 'GAME_STARTED': {
        setBattleSession((prev) =>
          prev
            ? {
                ...prev,
                status: 'ACTIVE',
                currentPlayerId: event.currentPlayerId,
                turnNumber: event.turnNumber,
              }
            : null
        );
        addActivity('JOIN', `Opponent joined! Battle commenced — Turn 1`);
        sound.playClaimSuccess();
        showStatus('⚔ BATTLE COMMENCED! All systems online', 'success');
        break;
      }

      case 'GAME_FINISHED': {
        setBattleSession((prev) =>
          prev
            ? {
                ...prev,
                status: 'FINISHED',
                winnerId: event.winnerId,
              }
            : null
        );
        const currentPlayer = playerRef.current;
        if (currentPlayer) {
          if (event.winnerId === currentPlayer.id) {
            showStatus('🏆 VICTORY! Sector dominance achieved', 'success');
          } else if (event.winnerId) {
            showStatus('DEFEAT! Grid secured by rival commander', 'warning');
          } else {
            showStatus('STALEMATE — Battle concluded', 'warning');
          }
        }
        break;
      }

      case 'LEADERBOARD_UPDATED': {
        setLeaderboard((prevLb) => {
          const existingIndex = prevLb.findIndex((e) => e.id === event.playerId);
          let updated: LeaderboardEntry[];
          if (existingIndex >= 0) {
            updated = [...prevLb];
            updated[existingIndex] = {
              ...updated[existingIndex],
              cellsClaimed: event.cellsClaimed,
            };
          } else {
            const playerInfo = playersMap.get(event.playerId);
            if (playerInfo) {
              updated = [
                ...prevLb,
                {
                  id: event.playerId,
                  username: playerInfo.username,
                  color: playerInfo.color,
                  cellsClaimed: event.cellsClaimed,
                  currentStreak: 0,
                  rank: prevLb.length + 1,
                },
              ];
            } else {
              updated = prevLb;
            }
          }
          return updated
            .sort((a, b) => b.cellsClaimed - a.cellsClaimed)
            .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
        });
        break;
      }

      case 'PLAYER_JOINED': {
        setOnlineCount((c) => c + 1);
        setPlayersMap((prev) => {
          const next = new Map(prev);
          next.set(event.playerId, { username: event.playerName, color: event.color });
          return next;
        });
        const currentPlayer = playerRef.current;
        if (currentPlayer && event.playerId !== currentPlayer.id) {
          addActivity('JOIN', `${event.playerName} connected to battle`, event.color);
        }
        break;
      }

      case 'PLAYER_LEFT': {
        setOnlineCount((c) => Math.max(1, c - 1));
        const leftPlayer = playersMap.get(event.playerId);
        if (leftPlayer) {
          addActivity('LEAVE', `${leftPlayer.username} disconnected`);
          showStatus('Opponent disconnected — awaiting reconnection', 'warning');
        }
        break;
      }
    }
  }, [playersMap, addActivity, showStatus]);

  // Connect WebSocket hook with auto-reconnect and snapshot resync
  const { connectionState, latencyMs } = useWebSocket({
    playerId: player?.id,
    gameId: activeGameId ?? undefined,
    onEvent: handleWebSocketEvent,
    onReconnect: loadSnapshot,
  });

  // Initial mount: load snapshot
  useEffect(() => {
    queueMicrotask(() => {
      void loadSnapshot();
    });
  }, [loadSnapshot]);

  // Player action: Claim cell
  const claimCell = useCallback(
    async (cellId: number) => {
      const currentPlayer = playerRef.current;
      if (!currentPlayer) {
        showStatus('Join as a player to claim territory', 'warning');
        return;
      }

      const currentSession = battleSessionRef.current;
      if (currentSession) {
        if (currentSession.status === 'WAITING') {
          sound.playError();
          showStatus('WAITING FOR OPPONENT TO JOIN', 'warning');
          return;
        }
        if (currentSession.status === 'FINISHED') {
          sound.playError();
          showStatus('BATTLE FINISHED', 'warning');
          return;
        }
        if (currentSession.currentPlayerId && currentSession.currentPlayerId !== currentPlayer.id) {
          sound.playError();
          showStatus('NOT YOUR TURN — AWAITING OPPONENT MOVE', 'warning');
          return;
        }
      }

      if (isCooldownActive()) {
        sound.playError();
        showStatus(`CLAIM COOLDOWN ACTIVE (Wait ${getRemainingSeconds()}s)`, 'warning');
        return;
      }

      const cell = cellsMapRef.current.get(cellId);
      if (cell && cell.ownerId !== null) {
        sound.playError();
        showStatus('SECTOR ALREADY CLAIMED', 'warning');
        return;
      }

      try {
        setClaimingCellId(cellId);
        const res = activeGameId
          ? await api.claimBattleCell(activeGameId, cellId, currentPlayer.id, battleSessionRef.current?.turnNumber)
          : await api.claimCell(cellId, currentPlayer.id);

        if (res.success) {
          startCooldown(res.remainingCooldownMs || 3000);
          sound.playClaimSuccess();
          showStatus(`Territory secured! Sector (${res.x}, ${res.y})`, 'success');
          addActivity('CLAIM', `Sector (${res.x}, ${res.y}) • +1 territory`, currentPlayer.color);

          if (res.cellsClaimed !== undefined) {
            setPlayer((prev) => (prev ? { ...prev, cellsClaimed: res.cellsClaimed! } : null));
          }
          if (res.turnNumber !== undefined) {
            setBattleSession((prev) =>
              prev
                ? {
                    ...prev,
                    turnNumber: res.turnNumber!,
                    currentPlayerId: res.nextPlayerId ?? null,
                  }
                : null
            );
          }
        } else {
          if (res.status === 'COOLDOWN_ACTIVE') {
            startCooldown(res.remainingCooldownMs || 1000);
            sound.playError();
            showStatus(`CLAIM COOLDOWN ACTIVE (Wait ${((res.remainingCooldownMs || 1000) / 1000).toFixed(1)}s)`, 'warning');
          } else if (res.status === 'NOT_YOUR_TURN') {
            sound.playError();
            showStatus('NOT YOUR TURN — AWAITING OPPONENT MOVE', 'warning');
          } else if (res.status === 'CELL_ALREADY_CLAIMED') {
            sound.playError();
            showStatus('SECTOR ALREADY CLAIMED', 'error');
          } else {
            sound.playError();
            showStatus(res.message || 'Claim rejected', 'error');
          }
        }
      } catch (err: unknown) {
        sound.playError();
        const errorMsg = err instanceof Error ? err.message : 'Claim failed. Server unreachable.';
        showStatus(errorMsg, 'error');
      } finally {
        setClaimingCellId(null);
      }
    },
    [activeGameId, isCooldownActive, getRemainingSeconds, startCooldown, showStatus, addActivity]
  );

  return {
    player,
    setPlayer,
    cells,
    leaderboard,
    playersMap,
    stats,
    battleSession,
    loading,
    claimingCellId,
    onlineCount,
    activityFeed,
    lastClaimAnimation,
    statusMessage,
    connectionState,
    latencyMs,
    cooldown,
    claimCell,
    reloadState: loadSnapshot,
  };
}

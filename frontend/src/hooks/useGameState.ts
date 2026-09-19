import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { useCooldown } from './useCooldown';
import { useWebSocket } from './useWebSocket';
import type { Cell } from '../types/game';
import type { LeaderboardEntry, Player } from '../types/player';
import type { ServerGameEvent } from '../types/websocket';

export interface ActivityItem {
  id: string;
  type: 'CLAIM' | 'REMOTE_CLAIM' | 'JOIN' | 'LEAVE';
  message: string;
  timestamp: number;
  color?: string;
}

export function useGameState(initialPlayer: Player | null) {
  const [player, setPlayer] = useState<Player | null>(initialPlayer);
  const [cells, setCells] = useState<Cell[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playersMap, setPlayersMap] = useState<Map<string, { username: string; color: string }>>(new Map());
  const [stats, setStats] = useState({ width: 50, height: 50, totalCells: 2500, claimedCells: 0 });
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
  const snapshotRequestIdRef = useRef<number>(0);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

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
      const [gameState, lb] = await Promise.all([
        api.fetchGameState(),
        api.fetchLeaderboard(50),
      ]);

      // Discard stale response if a newer snapshot request was initiated in-flight
      if (requestId !== snapshotRequestIdRef.current) {
        return;
      }

      // Reconcile snapshot cells with in-memory cells to protect in-flight WebSocket claims
      setCells((prevCells) => {
        const prevMap = new Map(prevCells.map((c) => [c.id, c]));

        const reconciled = gameState.cells.map((snapshotCell) => {
          const inMemoryCell = prevMap.get(snapshotCell.id);
          if (!inMemoryCell) {
            return snapshotCell;
          }

          // Case A: Cell was claimed via live WebSocket while snapshot HTTP request was in flight
          if (inMemoryCell.ownerId !== null && snapshotCell.ownerId === null) {
            return inMemoryCell;
          }

          // Case B: Both are claimed; check timestamps if available
          if (inMemoryCell.claimedAt && snapshotCell.claimedAt) {
            const inMemoryTime = new Date(inMemoryCell.claimedAt).getTime();
            const snapshotTime = new Date(snapshotCell.claimedAt).getTime();
            if (inMemoryTime > snapshotTime) {
              return inMemoryCell;
            }
          }

          return snapshotCell;
        });

        // Update lookup map
        const newMap = new Map<number, Cell>();
        reconciled.forEach((c) => newMap.set(c.id, c));
        cellsMapRef.current = newMap;

        // Authoritatively update stats based on reconciled cells
        const claimedCount = reconciled.filter((c) => c.ownerId !== null).length;
        setStats({
          width: gameState.width,
          height: gameState.height,
          totalCells: gameState.totalCells,
          claimedCells: claimedCount,
        });

        return reconciled;
      });

      setLeaderboard(lb.entries);

      // Populate players lookup map
      setPlayersMap((prevMap) => {
        const pMap = new Map(prevMap);
        lb.entries.forEach((entry) => {
          pMap.set(entry.id, { username: entry.username, color: entry.color });
        });
        const currentPlayer = playerRef.current;
        if (currentPlayer) {
          pMap.set(currentPlayer.id, { username: currentPlayer.username, color: currentPlayer.color });
        }
        return pMap;
      });
    } catch (err) {
      console.error('Failed to load authoritative game state:', err);
      showStatus('Failed to connect to game server. Retrying...', 'error');
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

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

        // Synchronize in-memory lookup map immediately
        const existingInMap = cellsMapRef.current.get(event.cellId);
        if (existingInMap) {
          cellsMapRef.current.set(event.cellId, {
            ...existingInMap,
            ownerId: event.playerId,
            claimedAt: event.claimedAt,
          });
        }

        // Update cell in state
        setCells((prevCells) => {
          const updated = [...prevCells];
          const idx = event.cellId - 1; // 1-indexed cellId matches 0-indexed sorted array
          if (idx >= 0 && idx < updated.length) {
            updated[idx] = {
              ...updated[idx],
              ownerId: event.playerId,
              claimedAt: event.claimedAt,
            };
          }
          return updated;
        });

        // Update stats
        setStats((prev) => ({
          ...prev,
          claimedCells: prev.claimedCells + 1,
        }));

        // Audio & visual feedback
        setLastClaimAnimation({ cellId: event.cellId, isSelf, timestamp: Date.now() });
        window.setTimeout(() => {
          setLastClaimAnimation((curr) => (curr?.cellId === event.cellId ? null : curr));
        }, 700);

        if (!isSelf) {
          sound.playRemoteClaim();
          addActivity('REMOTE_CLAIM', `${event.playerName} claimed Sector (${event.x}, ${event.y})`, event.color);
        }

        // Update territory count for self if applicable
        if (isSelf) {
          setPlayer((prev) => prev ? { ...prev, cellsClaimed: prev.cellsClaimed + 1 } : null);
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
            // New player entering leaderboard
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

          // Sort descending and re-assign ranks
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
          addActivity('JOIN', `${event.playerName} entered the grid`, event.color);
        }
        break;
      }

      case 'PLAYER_LEFT': {
        setOnlineCount((c) => Math.max(1, c - 1));
        const leftPlayer = playersMap.get(event.playerId);
        if (leftPlayer) {
          addActivity('LEAVE', `${leftPlayer.username} left the grid`);
        }
        break;
      }
    }
  }, [playersMap, addActivity]);

  // Connect WebSocket hook with auto-reconnect and snapshot resync
  const { connectionState, latencyMs } = useWebSocket({
    playerId: player?.id,
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
  // Stable callback: does NOT depend on ticking cooldown or cells array
  const claimCell = useCallback(async (cellId: number) => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) {
      showStatus('Join as a player to claim territory', 'warning');
      return;
    }

    if (isCooldownActive()) {
      sound.playError();
      showStatus(`Cooldown active: wait ${getRemainingSeconds()}s`, 'warning');
      return;
    }

    const cell = cellsMapRef.current.get(cellId);
    if (cell && cell.ownerId !== null) {
      sound.playError();
      showStatus('Cell is already occupied!', 'warning');
      return;
    }

    try {
      setClaimingCellId(cellId);
      const res = await api.claimCell(cellId, currentPlayer.id);

      if (res.success) {
        startCooldown(res.remainingCooldownMs || 3000);
        sound.playClaimSuccess();
        showStatus(`Territory secured! Sector (${res.x}, ${res.y})`, 'success');
        addActivity('CLAIM', `You secured Sector (${res.x}, ${res.y})!`, currentPlayer.color);

        if (res.cellsClaimed !== undefined) {
          setPlayer((prev) => prev ? { ...prev, cellsClaimed: res.cellsClaimed! } : null);
        }
      } else {
        if (res.status === 'COOLDOWN_ACTIVE') {
          startCooldown(res.remainingCooldownMs || 1000);
          sound.playError();
          showStatus(`Cooldown active: please wait ${((res.remainingCooldownMs || 1000) / 1000).toFixed(1)}s`, 'warning');
        } else if (res.status === 'CELL_ALREADY_CLAIMED') {
          sound.playError();
          showStatus('Cell was claimed by another player first!', 'error');
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
  }, [isCooldownActive, getRemainingSeconds, startCooldown, showStatus, addActivity]);

  return {
    player,
    setPlayer,
    cells,
    leaderboard,
    playersMap,
    stats,
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

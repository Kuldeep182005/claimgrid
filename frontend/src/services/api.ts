import type { ClaimCellResponse, GameSession, GameState, SessionGameState } from '../types/game';
import type { LeaderboardResponse, Player } from '../types/player';
import { buildApiUrl } from '../config';

export class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, errorMsg);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  async createPlayer(username: string): Promise<Player> {
    const res = await fetch(buildApiUrl('/api/players'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return handleResponse<Player>(res);
  },

  async getPlayer(id: string): Promise<Player> {
    const res = await fetch(buildApiUrl(`/api/players/${id}`));
    return handleResponse<Player>(res);
  },

  async fetchGameState(): Promise<GameState> {
    const res = await fetch(buildApiUrl('/api/game/state'));
    return handleResponse<GameState>(res);
  },

  async fetchLeaderboard(limit = 20): Promise<LeaderboardResponse> {
    const res = await fetch(buildApiUrl(`/api/leaderboard?limit=${limit}`));
    return handleResponse<LeaderboardResponse>(res);
  },

  async claimCell(cellId: number, playerId: string): Promise<ClaimCellResponse> {
    const res = await fetch(buildApiUrl(`/api/game/cells/${cellId}/claim`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    return handleResponse<ClaimCellResponse>(res);
  },

  // Battle session endpoints
  async createGame(playerId: string, maxPlayers: number = 2): Promise<GameSession> {
    const res = await fetch(buildApiUrl('/api/games'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, maxPlayers }),
    });
    return handleResponse<GameSession>(res);
  },

  async createPracticeGame(playerId: string): Promise<GameSession> {
    const res = await fetch(buildApiUrl('/api/games/practice'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    return handleResponse<GameSession>(res);
  },

  async endPracticeGame(gameId: string, playerId: string): Promise<void> {
    const res = await fetch(buildApiUrl(`/api/games/practice/${encodeURIComponent(gameId)}`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) {
      await handleResponse<unknown>(res);
    }
  },

  async joinGame(code: string, playerId: string): Promise<GameSession> {
    const res = await fetch(buildApiUrl(`/api/games/${encodeURIComponent(code)}/join`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    return handleResponse<GameSession>(res);
  },

  async fetchBattleState(gameId: string): Promise<SessionGameState> {
    const res = await fetch(buildApiUrl(`/api/games/${encodeURIComponent(gameId)}/state`));
    return handleResponse<SessionGameState>(res);
  },

  async claimBattleCell(gameId: string, cellId: number, playerId: string, turnNumber?: number): Promise<ClaimCellResponse> {
    const res = await fetch(buildApiUrl(`/api/games/${encodeURIComponent(gameId)}/cells/${cellId}/claim`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, turnNumber }),
    });
    return handleResponse<ClaimCellResponse>(res);
  },

  async attackBattleCell(gameId: string, cellId: number, playerId: string, turnNumber?: number): Promise<ClaimCellResponse> {
    const res = await fetch(buildApiUrl(`/api/games/${encodeURIComponent(gameId)}/cells/${cellId}/attack`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, turnNumber }),
    });
    return handleResponse<ClaimCellResponse>(res);
  },
};

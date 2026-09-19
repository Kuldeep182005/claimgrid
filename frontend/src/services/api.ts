import type { ClaimCellResponse, GameState } from '../types/game';
import type { LeaderboardResponse, Player } from '../types/player';

class ApiError extends Error {
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
  return res.json() as Promise<T>;
}

export const api = {
  async createPlayer(username: string): Promise<Player> {
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return handleResponse<Player>(res);
  },

  async getPlayer(id: string): Promise<Player> {
    const res = await fetch(`/api/players/${id}`);
    return handleResponse<Player>(res);
  },

  async fetchGameState(): Promise<GameState> {
    const res = await fetch('/api/game/state');
    return handleResponse<GameState>(res);
  },

  async fetchLeaderboard(limit = 20): Promise<LeaderboardResponse> {
    const res = await fetch(`/api/leaderboard?limit=${limit}`);
    return handleResponse<LeaderboardResponse>(res);
  },

  async claimCell(cellId: number, playerId: string): Promise<ClaimCellResponse> {
    const res = await fetch(`/api/game/cells/${cellId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    return handleResponse<ClaimCellResponse>(res);
  },
};

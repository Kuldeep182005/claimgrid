export interface Player {
  id: string;
  username: string;
  color: string;
  createdAt: string;
  lastSeenAt: string;
  lastClaimAt?: string | null;
  cellsClaimed: number;
  score?: number;
  currentStreak: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  color: string;
  cellsClaimed: number;
  score?: number;
  currentStreak: number;
  rank: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

export interface CreatePlayerRequest {
  username: string;
}

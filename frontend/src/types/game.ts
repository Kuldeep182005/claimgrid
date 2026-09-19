export type ClaimStatus =
  | 'SUCCESS'
  | 'PLAYER_NOT_FOUND'
  | 'CELL_NOT_FOUND'
  | 'CELL_ALREADY_CLAIMED'
  | 'COOLDOWN_ACTIVE'
  | 'NOT_YOUR_TURN'
  | 'GAME_NOT_ACTIVE'
  | 'NOT_IN_GAME'
  | 'GAME_FINISHED'
  | 'INVALID_REQUEST';

export type GameStatus = 'WAITING' | 'ACTIVE' | 'FINISHED';

export interface PlayerSummary {
  id: string;
  username: string;
  color: string;
  cellsClaimed: number;
}

export interface GameSession {
  gameId: string;
  code: string;
  status: GameStatus;
  playerCount: number;
  currentPlayerId: string | null;
  turnNumber: number;
  winnerId: string | null;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  players: PlayerSummary[];
}

export interface Cell {
  id: number;
  x: number;
  y: number;
  ownerId: string | null;
  claimedAt: string | null;
}

export interface GameState {
  width: number;
  height: number;
  totalCells: number;
  claimedCells: number;
  cells: Cell[];
}

export interface SessionGameState {
  gameId: string;
  code: string;
  status: GameStatus;
  width: number;
  height: number;
  totalCells: number;
  claimedCells: number;
  currentPlayerId: string | null;
  turnNumber: number;
  winnerId: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  players: PlayerSummary[];
  cells: Cell[];
}

export interface ClaimCellRequest {
  playerId: string;
}

export interface ClaimCellResponse {
  success: boolean;
  status: ClaimStatus;
  gameId?: string;
  cellId?: number;
  x?: number;
  y?: number;
  ownerId?: string | null;
  ownerUsername?: string | null;
  ownerColor?: string | null;
  claimedAt?: string | null;
  cellsClaimed?: number;
  remainingCooldownMs?: number;
  turnNumber?: number;
  nextPlayerId?: string | null;
  message?: string;
}

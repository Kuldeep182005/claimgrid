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
  | 'INVALID_REQUEST'
  | 'FRONTIER_INVALID'
  | 'ATTACK_REJECTED'
  | 'ATTACK_SUCCESS';
  // Gameplay redesign statuses are returned by battle actions.

export type GameStatus = 'WAITING' | 'ACTIVE' | 'FINISHED';

export interface PlayerSummary {
  id: string;
  username: string;
  color: string;
  cellsClaimed: number;
  score?: number;
}

export interface GameSession {
  gameId: string;
  code: string;
  status: GameStatus;
  maxPlayers?: number;
  playerCount: number;
  currentPlayerId: string | null;
  turnNumber: number;
  winnerId: string | null;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  players: PlayerSummary[];
  practice?: boolean;
  turnLimit?: number;
  player1Score?: number;
  player2Score?: number;
  player3Score?: number;
  player4Score?: number;
}

export interface Cell {
  id: number;
  x: number;
  y: number;
  ownerId: string | null;
  claimedAt: string | null;
  cellType?: string | null;
  cellValue?: number;
}

export interface GameState {
  width: number;
  height: number;
  totalCells: number;
  claimedCells: number;
  cells: Cell[];
  onlineCount?: number;
}

export interface SessionGameState {
  gameId: string;
  code: string;
  status: GameStatus;
  maxPlayers?: number;
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
  onlineCount?: number;
  practice?: boolean;
  turnLimit?: number;
  player1Score?: number;
  player2Score?: number;
  player3Score?: number;
  player4Score?: number;
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

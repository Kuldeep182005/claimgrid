export type ClaimStatus =
  | 'SUCCESS'
  | 'PLAYER_NOT_FOUND'
  | 'CELL_NOT_FOUND'
  | 'CELL_ALREADY_CLAIMED'
  | 'COOLDOWN_ACTIVE'
  | 'INVALID_REQUEST';

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

export interface ClaimCellRequest {
  playerId: string;
}

export interface ClaimCellResponse {
  success: boolean;
  status: ClaimStatus;
  cellId?: number;
  x?: number;
  y?: number;
  ownerId?: string | null;
  ownerUsername?: string | null;
  ownerColor?: string | null;
  claimedAt?: string | null;
  cellsClaimed?: number;
  remainingCooldownMs?: number;
  message?: string;
}

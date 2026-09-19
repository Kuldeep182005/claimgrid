export type ConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export interface CellClaimedEvent {
  type: 'CELL_CLAIMED';
  gameId?: string;
  cellId: number;
  x: number;
  y: number;
  playerId: string;
  playerName: string;
  color: string;
  claimedAt: string;
  turnNumber?: number;
  nextPlayerId?: string | null;
}

export interface TurnChangedEvent {
  type: 'TURN_CHANGED';
  gameId: string;
  currentPlayerId: string;
  turnNumber: number;
}

export interface GameStartedEvent {
  type: 'GAME_STARTED';
  gameId: string;
  code: string;
  player1Id: string;
  player2Id: string;
  currentPlayerId: string;
  turnNumber: number;
}

export interface GameFinishedEvent {
  type: 'GAME_FINISHED';
  gameId: string;
  winnerId: string | null;
}

export interface LeaderboardUpdatedEvent {
  type: 'LEADERBOARD_UPDATED';
  playerId: string;
  cellsClaimed: number;
}

export interface PlayerJoinedEvent {
  type: 'PLAYER_JOINED';
  gameId?: string;
  playerId: string;
  playerName: string;
  color: string;
}

export interface PlayerLeftEvent {
  type: 'PLAYER_LEFT';
  gameId?: string;
  playerId: string;
}

export interface PongEvent {
  type: 'PONG';
}

export type ServerGameEvent =
  | CellClaimedEvent
  | TurnChangedEvent
  | GameStartedEvent
  | GameFinishedEvent
  | LeaderboardUpdatedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | PongEvent;

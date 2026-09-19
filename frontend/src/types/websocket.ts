export type ConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export interface CellClaimedEvent {
  type: 'CELL_CLAIMED';
  cellId: number;
  x: number;
  y: number;
  playerId: string;
  playerName: string;
  color: string;
  claimedAt: string;
}

export interface LeaderboardUpdatedEvent {
  type: 'LEADERBOARD_UPDATED';
  playerId: string;
  cellsClaimed: number;
}

export interface PlayerJoinedEvent {
  type: 'PLAYER_JOINED';
  playerId: string;
  playerName: string;
  color: string;
}

export interface PlayerLeftEvent {
  type: 'PLAYER_LEFT';
  playerId: string;
}

export interface PongEvent {
  type: 'PONG';
}

export type ServerGameEvent =
  | CellClaimedEvent
  | LeaderboardUpdatedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | PongEvent;

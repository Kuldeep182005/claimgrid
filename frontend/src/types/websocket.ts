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
  maxPlayers?: number;
  player1Id: string;
  player2Id: string;
  player3Id?: string;
  player4Id?: string;
  playerIds?: string[];
  currentPlayerId: string;
  turnNumber: number;
}

export interface GameFinishedEvent {
  type: 'GAME_FINISHED';
  gameId: string;
  winnerId: string | null;
  player1Score?: number;
  player2Score?: number;
  player3Score?: number;
  player4Score?: number;
}

export interface LeaderboardUpdatedEvent {
  type: 'LEADERBOARD_UPDATED';
  playerId: string;
  cellsClaimed: number;
  score?: number;
}

export interface PlayerJoinedEvent {
  type: 'PLAYER_JOINED';
  gameId?: string;
  playerId: string;
  playerName: string;
  color: string;
  onlineCount?: number;
}

export interface PlayerLeftEvent {
  type: 'PLAYER_LEFT';
  gameId?: string;
  playerId: string;
  onlineCount?: number;
}

export interface PongEvent {
  type: 'PONG';
}

export type ReactionType = 'THUMBS_UP' | 'THUMBS_DOWN' | 'LAUGH' | 'CRY';

export interface ChatMessageEvent {
  type: 'CHAT_MESSAGE';
  gameId: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
}

export interface PlayerReactionEvent {
  type: 'PLAYER_REACTION';
  gameId: string;
  playerId: string;
  playerName: string;
  reaction: ReactionType;
  timestamp: string;
}

export interface CommsErrorEvent {
  type: 'COMMS_ERROR';
  code: string;
  message: string;
}

export type ServerGameEvent =
  | CellClaimedEvent
  | TurnChangedEvent
  | GameStartedEvent
  | GameFinishedEvent
  | LeaderboardUpdatedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | ChatMessageEvent
  | PlayerReactionEvent
  | CommsErrorEvent
  | PongEvent;

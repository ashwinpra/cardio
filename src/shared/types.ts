export type GameType = 'LITERATURE' | 'COUP' | 'SECRET_HITLER';

export interface Player {
  id: string;
  name: string;
  seatIndex: number;
  isConnected: boolean;
  team: 'TEAM_A' | 'TEAM_B';
}

export interface Move {
  type: string;
  timestamp: string;
  playerName: string;
  details: string;
  success: boolean;
}

export interface BaseGameState {
  sessionId: string;
  gameType: GameType;
  phase: string;
  players: Player[];
  activePlayerIndex: number;
  lastMove: Move | null;
  moveLog: Move[];
  pendingAction?: any;
  loserId?: string;
  resolution?: string;
  winner?: string;
}

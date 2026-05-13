import type { Player as BasePlayer, Move as BaseMove, BaseGameState } from '../../shared/types';

export type LoveLetterRole = 'GUARD' | 'PRIEST' | 'BARON' | 'HANDMAID' | 'PRINCE' | 'KING' | 'COUNTESS' | 'PRINCESS';

export interface Card {
  role: LoveLetterRole;
  value: number;
}

export interface Player extends BasePlayer {
  hand: Card[];
  isEliminated: boolean;
  tokens: number; // Victory tokens
}

export type LoveLetterMoveType = 'PLAY_CARD' | 'GUESS' | 'BLOCK_COMPARISON';

export interface Move extends BaseMove {
  type: LoveLetterMoveType;
  cardPlayed?: LoveLetterRole;
  targetPlayerId?: string;
  guessedRole?: LoveLetterRole;
}

export type LoveLetterPhase = 'LOBBY' | 'ROUND_START' | 'PLAYING' | 'ROUND_END' | 'GAME_OVER';

export interface GameState extends BaseGameState {
  gameType: 'LOVE_LETTER';
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  eliminatedThisRound: string[];
  currentRound: number;
  handmaidProtection: string | null; // Player ID protected by Handmaid
}

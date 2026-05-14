import type { Player as BasePlayer, Move as BaseMove, BaseGameState } from '../../shared/types';

export type HanabiColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'WHITE' | 'HIDDEN';
export type HanabiRank = 0 | 1 | 2 | 3 | 4 | 5; // 0 for hidden

export interface Card {
  id: string;
  color: HanabiColor;
  rank: HanabiRank;
  hintedColor?: boolean;
  hintedRank?: boolean;
}

export interface HintToken {
  type: 'HINT';
}

export interface MistakeToken {
  type: 'MISTAKE';
}

export interface Player extends BasePlayer {
  hand: Card[];
}

export type HanabiMoveType = 'PLAY' | 'DISCARD' | 'HINT';

export interface Move extends BaseMove {
  type: HanabiMoveType;
  cardIndex?: number;
  targetPlayerId?: string;
  hintType?: 'COLOR' | 'RANK';
  hintValue?: HanabiColor | HanabiRank;
}

export type HanabiPhase = 'LOBBY' | 'PLAYING' | 'GAME_OVER';

export interface GameState extends BaseGameState {
  gameType: 'HANABI';
  players: Player[];
  deck: Card[];
  playArea: Record<HanabiColor, HanabiRank>; // e.g., RED: 3 means Red 1,2,3 are played
  discardPile: Card[];
  hintTokens: number;
  mistakeTokens: number;
  score: number;
  turnsLeft: number | null;
}

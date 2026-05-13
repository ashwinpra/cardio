import type { Player as BasePlayer, Move as BaseMove, BaseGameState } from '../../shared/types';

export type Suit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player extends BasePlayer {
  team: 'TEAM_A' | 'TEAM_B';
  hand: Card[];
  bid: number | null;
  tricksTaken: number;
  bags: number; // Over-tricks
}

export type SpadesMoveType = 'BID' | 'PLAY_CARD';

export interface Move extends BaseMove {
  type: SpadesMoveType;
  bid?: number;
  card?: Card;
}

export type SpadesPhase = 'LOBBY' | 'BIDDING' | 'PLAYING' | 'TRICK_END' | 'ROUND_END' | 'GAME_OVER';

export interface Trick {
  leadSuit: Suit;
  cards: Array<{ playerId: string; card: Card }>;
  winner?: string;
}

export interface TeamScore {
  tricks: number;
  bags: number;
  score: number;
}

export interface GameState extends BaseGameState {
  gameType: 'SPADES';
  players: Player[];
  deck: Card[];
  currentTrick: Trick;
  trickHistory: Trick[];
  teamAScore: TeamScore;
  teamBScore: TeamScore;
  allPlayersBid: boolean;
  spadesBroken: boolean; // Can Spades be led?
}

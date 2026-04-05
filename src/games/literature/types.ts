import type { Player as BasePlayer, Move as BaseMove, BaseGameState } from '../../shared/types';

export type Suit = 'CLUB' | 'DIAMOND' | 'HEART' | 'SPADE' | 'JOKER';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'Jk1' | 'Jk2';
export type Team = 'TEAM_A' | 'TEAM_B';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type HalfSuitName = 
  | 'LOW_CLUB' | 'HIGH_CLUB'
  | 'LOW_DIAMOND' | 'HIGH_DIAMOND'
  | 'LOW_HEART' | 'HIGH_HEART'
  | 'LOW_SPADE' | 'HIGH_SPADE'
  | 'EIGHTS_AND_JOKERS';

export interface Player extends BasePlayer {
  team: Team;
}

export interface ClaimedBook {
  team: Team;
  halfSuit: HalfSuitName;
}

export interface Move extends BaseMove {
  type: 'ASK' | 'CLAIM';
}

export interface HouseRules {
  mandatory_declaration: boolean;
  announce_one_card: boolean;
  high_book_double: boolean;
  claim_any_turn: boolean;
  claim_passes_turn: boolean;
}

export interface GameState extends BaseGameState {
  gameType: 'LITERATURE';
  hands: Record<string, Card[]>;
  books: ClaimedBook[];
  houseRules: HouseRules;
  scores: { teamA: number; teamB: number };
}

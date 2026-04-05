import type { Player as BasePlayer, Move as BaseMove, BaseGameState } from '../../shared/types';

export type CoupRole = 'DUKE' | 'ASSASSIN' | 'CAPTAIN' | 'AMBASSADOR' | 'CONTESSA' | 'HIDDEN';

export interface Influence {
  role: CoupRole;
  isRevealed: boolean;
}

export interface Player extends BasePlayer {
  coins: number;
  influences: Influence[];
}

export type CoupActionType = 
  | 'INCOME' 
  | 'FOREIGN_AID' 
  | 'TAX' 
  | 'ASSASSINATE' 
  | 'STEAL' 
  | 'EXCHANGE' 
  | 'COUP'
  | 'BLOCK'
  | 'CHALLENGE'
  | 'PASS'
  | 'REVEAL';

export interface Move extends BaseMove {
  type: CoupActionType;
  targetId?: string;
  roleClaimed?: CoupRole;
}

export type CoupPhase = 
  | 'LOBBY' 
  | 'ACTION_DECLARATION'
  | 'WAITING_FOR_CHALLENGE'
  | 'WAITING_FOR_BLOCK'
  | 'WAITING_FOR_BLOCK_CHALLENGE'
  | 'RESOLUTION'
  | 'SELECTING_EXCHANGE_CARDS'
  | 'SELECT_INFLUENCE_TO_LOSE'
  | 'PLAYING'
  | 'GAME_OVER';

export interface GameState extends BaseGameState {
  gameType: 'COUP';
  deck: CoupRole[];
  players: Player[];
  pendingAction: {
    actorId: string;
    type: CoupActionType;
    targetId?: string;
    roleClaimed?: CoupRole;
    challengers: string[]; // Players who decided to pass/challenge
    blocks: {
      blockerId: string;
      roleClaimed: CoupRole;
    } | null;
  } | null;
  exchangeOptions?: CoupRole[];
}

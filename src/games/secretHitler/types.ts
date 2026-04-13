import type { BaseGameState, Move as BaseMove, Player as BasePlayer } from '../../shared/types';

export type SecretRole = 'LIBERAL' | 'FASCIST' | 'HITLER';
export type Party = 'LIBERAL' | 'FASCIST';
export type Vote = 'JA' | 'NEIN';
export type Policy = 'LIBERAL' | 'FASCIST';

export type ExecutiveActionType = 'INVESTIGATE' | 'SPECIAL_ELECTION' | 'POLICY_PEEK' | 'EXECUTE';

export type SecretHitlerPhase =
  | 'LOBBY'
  | 'NOMINATE_CHANCELLOR'
  | 'VOTING'
  | 'LEGISLATIVE_PRESIDENT'
  | 'LEGISLATIVE_CHANCELLOR'
  | 'VETO_RESPONSE'
  | 'EXECUTIVE_ACTION'
  | 'GAME_OVER';

export interface SecretHitlerPlayer extends BasePlayer {
  isAlive: boolean;
  role?: SecretRole;
  partyMembership?: Party;
}

export interface SecretHitlerMove extends BaseMove {
  type:
    | 'NOMINATE_CHANCELLOR'
    | 'VOTE'
    | 'ELECTION_RESULT'
    | 'POLICY_ENACTED'
    | 'EXECUTIVE_ACTION'
    | 'GAME_END';
}

export interface SecretHitlerState extends BaseGameState {
  gameType: 'SECRET_HITLER';
  phase: SecretHitlerPhase;
  players: SecretHitlerPlayer[];
  drawPile: Policy[];
  discardPile: Policy[];
  electionTracker: number;
  liberalPolicies: number;
  fascistPolicies: number;
  presidentId: string | null;
  nominatedChancellorId: string | null;
  chancellorId: string | null;
  previousPresidentId: string | null;
  previousChancellorId: string | null;
  presidentCards: Policy[];
  chancellorCards: Policy[];
  vetoRequested: boolean;
  votes: Record<string, Vote>;
  executiveAction: ExecutiveActionType | null;
  policyPeek: Policy[] | null;
  specialElectionReturnIndex: number | null;
  winner?: Party;
  winnerReason?: string;
  investigateResults: Record<string, { targetName: string; party: Party } | null>;
}

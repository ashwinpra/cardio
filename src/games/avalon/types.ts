import type { BaseGameState, Player as BasePlayer } from '../../shared/types';

// ─── Role & Faction types ──────────────────────────────────────────────────

export type AvalonRole =
  | 'MERLIN'
  | 'PERCIVAL'
  | 'LOYAL_SERVANT'
  | 'ASSASSIN'
  | 'MORGANA'
  | 'MORDRED'
  | 'OBERON'
  | 'MINION_OF_MORDRED';

export type AvalonFaction = 'GOOD' | 'EVIL';

export type TeamVote = 'APPROVE' | 'REJECT';
export type QuestVote = 'SUCCESS' | 'FAIL';

// ─── Phase ────────────────────────────────────────────────────────────────

export type AvalonPhase =
  | 'LOBBY'
  | 'TEAM_PROPOSAL'
  | 'TEAM_VOTE'
  | 'QUEST_VOTE'
  | 'ASSASSINATION'
  | 'GAME_OVER';

// ─── Player ───────────────────────────────────────────────────────────────

export interface AvalonPlayer extends BasePlayer {
  /** Only present in sanitized state for the player themselves or at GAME_OVER. */
  role?: AvalonRole;
  /** Set of player IDs this player can identify, keyed by what they know:
   *  - Evil players see each other (except Oberon)
   *  - Merlin sees Evil (except Mordred)
   *  - Percival sees two shuffled candidates (Merlin + Morgana)
   * This field is NOT sent to clients — it is computed server-side. */
}

// ─── Quest history entry ──────────────────────────────────────────────────

export interface QuestResult {
  questIndex: number;
  teamIds: string[];
  /** Shuffled array of votes, no player IDs attached. */
  votes: QuestVote[];
  failCount: number;
  success: boolean;
}

// ─── Revealed team vote (no player IDs for ordering security) ─────────────

export interface RevealedTeamVote {
  playerId: string;
  vote: TeamVote;
}

// ─── Full game state ──────────────────────────────────────────────────────

export interface AvalonState extends BaseGameState {
  gameType: 'AVALON';
  phase: AvalonPhase;
  players: AvalonPlayer[];

  // ── Quest / turn tracking ──
  currentQuest: number;        // 0-indexed (0–4)
  proposalNumber: number;      // 0-indexed rejection counter per quest (0–4)
  leaderIndex: number;         // index into players[]
  currentTeam: string[];       // player IDs currently on the proposed team

  // ── Vote state ──
  /** Server-authoritative: maps playerId → vote. Never sent raw to client. */
  teamVotesPrivate: Record<string, TeamVote>;
  /** After vote resolution: ordered by insertion (randomized key iteration
   *  not used — array is shuffled server-side before sending). */
  teamVotesRevealed: RevealedTeamVote[];  // empty during voting
  /** Server-authoritative quest votes. Never sent raw to client. */
  questVotesPrivate: Record<string, QuestVote>;
  /** After quest resolution: shuffled votes with no player IDs. */
  questVotesRevealed: QuestVote[];

  // ── Quest history ──
  questHistory: QuestResult[];
  successfulQuests: number;
  failedQuests: number;

  // ── Assassination phase ──
  assassinationTarget: string | null;

  // ── End state ──
  winner: AvalonFaction | null;
  winnerReason: string | null;

  // ── Role visibility (computed at game start, stored for reconnect) ──
  /** What each player is allowed to see about others. Maps playerId → array
   *  of { id, role | 'EVIL_PLAYER' | 'MERLIN_CANDIDATE' } */
  roleVisibility: Record<string, VisiblePlayerInfo[]>;

  /** Percival's shuffled candidates (Merlin + Morgana), computed once at start. */
  percivalCandidates: string[];  // player IDs, shuffled
}

/** Information this player can see about another player. */
export interface VisiblePlayerInfo {
  playerId: string;
  /** What the observer knows about this player. */
  knownAs: 'EVIL_PLAYER' | 'MERLIN_CANDIDATE' | AvalonRole;
}

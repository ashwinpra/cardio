import type {
  AvalonFaction,
  AvalonPlayer,
  AvalonRole,
  AvalonState,
  QuestResult,
  QuestVote,
  TeamVote,
  VisiblePlayerInfo,
} from './types';

// ─── Player-count tables ───────────────────────────────────────────────────

/** Number of Good and Evil players per total player count. */
const FACTION_COUNTS: Record<number, { good: number; evil: number }> = {
  5:  { good: 3, evil: 2 },
  6:  { good: 4, evil: 2 },
  7:  { good: 4, evil: 3 },
  8:  { good: 5, evil: 3 },
  9:  { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};

/** Quest team sizes [Q1, Q2, Q3, Q4, Q5] per total player count. */
const QUEST_SIZES: Record<number, number[]> = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

/** Quest 4 (index 3) requires 2 fails in 7+ player games. */
const Q4_DOUBLE_FAIL_MIN_PLAYERS = 7;

// ─── Utilities ─────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function questSizeFor(playerCount: number, questIndex: number): number {
  return QUEST_SIZES[playerCount]?.[questIndex] ?? 2;
}

export function failThresholdFor(playerCount: number, questIndex: number): number {
  // Quest 4 (index 3) in 7+ player games requires 2 fails.
  if (questIndex === 3 && playerCount >= Q4_DOUBLE_FAIL_MIN_PLAYERS) return 2;
  return 1;
}

export function factionOf(role: AvalonRole): AvalonFaction {
  switch (role) {
    case 'MERLIN':
    case 'PERCIVAL':
    case 'LOYAL_SERVANT':
      return 'GOOD';
    default:
      return 'EVIL';
  }
}

// ─── Role validation ───────────────────────────────────────────────────────

export interface RoleConfig {
  includeMerlin: boolean;
  includePercival: boolean;
  includeMorgana: boolean;
  includeMordred: boolean;
  includeOberon: boolean;
  includeAssassin: boolean;
}

export function defaultRoleConfig(): RoleConfig {
  return {
    includeMerlin: true,
    includePercival: false,
    includeMorgana: false,
    includeMordred: false,
    includeOberon: false,
    includeAssassin: true,
  };
}

/**
 * Build the role list for the given player count.
 * Named roles are assigned first; remaining slots are auto-filled with
 * Loyal Servants (good) and Minions of Mordred (evil).
 * Returns an error string if the config is invalid, or the role list.
 */
export function buildRoleList(
  playerCount: number,
  config: RoleConfig,
): { roles: AvalonRole[]; error: null } | { roles: null; error: string } {
  const counts = FACTION_COUNTS[playerCount];
  if (!counts) {
    return { roles: null, error: `Avalon requires 5–10 players, got ${playerCount}.` };
  }

  const { good: goodSlots, evil: evilSlots } = counts;

  const goodRoles: AvalonRole[] = [];
  const evilRoles: AvalonRole[] = [];

  // Named Good roles
  if (config.includeMerlin) goodRoles.push('MERLIN');
  if (config.includePercival) goodRoles.push('PERCIVAL');

  // Named Evil roles
  if (config.includeAssassin) evilRoles.push('ASSASSIN');
  if (config.includeMorgana) evilRoles.push('MORGANA');
  if (config.includeMordred) evilRoles.push('MORDRED');
  if (config.includeOberon) evilRoles.push('OBERON');

  if (goodRoles.length > goodSlots) {
    return { roles: null, error: `Too many Good named roles for ${playerCount} players.` };
  }
  if (evilRoles.length > evilSlots) {
    return { roles: null, error: `Too many Evil named roles for ${playerCount} players.` };
  }

  // Auto-fill remaining slots
  while (goodRoles.length < goodSlots) goodRoles.push('LOYAL_SERVANT');
  while (evilRoles.length < evilSlots) evilRoles.push('MINION_OF_MORDRED');

  return { roles: shuffle([...goodRoles, ...evilRoles]), error: null };
}

// ─── Role visibility computation ───────────────────────────────────────────

/**
 * Compute what each player is allowed to see about others.
 * Must be called server-side only. Result is stored in `state.roleVisibility`
 * and `state.percivalCandidates`. It is sanitized before broadcast.
 *
 * Visibility rules:
 *   Merlin    → sees all Evil except Mordred (as 'EVIL_PLAYER')
 *   Percival  → sees Merlin + Morgana as indistinguishable 'MERLIN_CANDIDATE'
 *   Evil (non-Oberon) → sees all Evil except Oberon (as 'EVIL_PLAYER')
 *   Oberon    → sees nobody
 *   Loyal Servant → sees nobody
 */
export function computeRoleVisibility(
  players: AvalonPlayer[],
): { roleVisibility: Record<string, VisiblePlayerInfo[]>; percivalCandidates: string[] } {
  const roleVisibility: Record<string, VisiblePlayerInfo[]> = {};
  let percivalCandidates: string[] = [];

  const evilPlayers = players.filter(
    (p) => factionOf(p.role!) === 'EVIL',
  );
  const evilNonOberon = evilPlayers.filter((p) => p.role !== 'OBERON');
  const merlinPlayer = players.find((p) => p.role === 'MERLIN');
  const morganaPlayer = players.find((p) => p.role === 'MORGANA');

  // Percival candidates: Merlin + Morgana, shuffled
  const rawPercivalCandidates: string[] = [];
  if (merlinPlayer) rawPercivalCandidates.push(merlinPlayer.id);
  if (morganaPlayer) rawPercivalCandidates.push(morganaPlayer.id);
  percivalCandidates = shuffle(rawPercivalCandidates);

  for (const player of players) {
    const visible: VisiblePlayerInfo[] = [];
    const role = player.role!;

    if (role === 'MERLIN') {
      // Sees all Evil except Mordred
      for (const ep of evilPlayers) {
        if (ep.role !== 'MORDRED') {
          visible.push({ playerId: ep.id, knownAs: 'EVIL_PLAYER' });
        }
      }
    } else if (role === 'PERCIVAL') {
      // Sees Merlin + Morgana as indistinguishable candidates (shuffled)
      for (const cId of percivalCandidates) {
        visible.push({ playerId: cId, knownAs: 'MERLIN_CANDIDATE' });
      }
    } else if (factionOf(role) === 'EVIL' && role !== 'OBERON') {
      // Evil (non-Oberon) see each other except Oberon
      for (const ep of evilNonOberon) {
        if (ep.id !== player.id) {
          visible.push({ playerId: ep.id, knownAs: 'EVIL_PLAYER' });
        }
      }
    }
    // Oberon and Loyal Servants see nobody — visible stays []

    roleVisibility[player.id] = visible;
  }

  return { roleVisibility, percivalCandidates };
}

// ─── Game initialisation ───────────────────────────────────────────────────

export function setupAvalon(
  state: AvalonState,
  config: RoleConfig = defaultRoleConfig(),
): AvalonState | { error: string } {
  const playerCount = state.players.length;
  const roleResult = buildRoleList(playerCount, config);
  if (roleResult.error) return { error: roleResult.error };

  const roles = roleResult.roles!;
  const players: AvalonPlayer[] = state.players.map((p, i) => ({
    ...p,
    role: roles[i],
    isConnected: p.isConnected ?? true,
  }));

  const { roleVisibility, percivalCandidates } = computeRoleVisibility(players);

  return {
    ...state,
    players,
    phase: 'TEAM_PROPOSAL',
    currentQuest: 0,
    proposalNumber: 0,
    leaderIndex: 0,
    currentTeam: [],
    teamVotesPrivate: {},
    teamVotesRevealed: [],
    questVotesPrivate: {},
    questVotesRevealed: [],
    questHistory: [],
    successfulQuests: 0,
    failedQuests: 0,
    assassinationTarget: null,
    winner: null,
    winnerReason: null,
    roleVisibility,
    percivalCandidates,
    lastMove: null,
    moveLog: [],
  };
}

// ─── Leader rotation ───────────────────────────────────────────────────────

/**
 * Advance leader exactly once.
 * Called only in two places: (1) rejected team vote, (2) quest resolution.
 */
export function advanceLeader(state: AvalonState): AvalonState {
  const nextLeaderIndex = (state.leaderIndex + 1) % state.players.length;
  return { ...state, leaderIndex: nextLeaderIndex };
}

// ─── Team proposal ─────────────────────────────────────────────────────────

export function proposeTeam(
  state: AvalonState,
  actorId: string,
  teamIds: string[],
): { state: AvalonState } | { error: string } {
  if (state.phase !== 'TEAM_PROPOSAL') return { error: 'Not in team proposal phase.' };

  const leader = state.players[state.leaderIndex];
  if (!leader || leader.id !== actorId) return { error: 'Only the current leader can propose a team.' };

  const required = questSizeFor(state.players.length, state.currentQuest);
  if (teamIds.length !== required) {
    return { error: `Quest ${state.currentQuest + 1} requires exactly ${required} players.` };
  }

  // Validate all proposed players exist
  for (const id of teamIds) {
    if (!state.players.find((p) => p.id === id)) {
      return { error: `Unknown player ID: ${id}` };
    }
  }

  // Deduplicate
  if (new Set(teamIds).size !== teamIds.length) {
    return { error: 'Team contains duplicate players.' };
  }

  const move = {
    type: 'TEAM_PROPOSED',
    timestamp: new Date().toISOString(),
    playerName: leader.name,
    details: `${leader.name} proposed a team of ${required}: ${teamIds.map((id) => state.players.find((p) => p.id === id)?.name ?? id).join(', ')}.`,
    success: true,
  };

  return {
    state: {
      ...state,
      currentTeam: teamIds,
      phase: 'TEAM_VOTE',
      teamVotesPrivate: {},
      teamVotesRevealed: [],
      lastMove: move,
      moveLog: [move, ...state.moveLog],
    },
  };
}

// ─── Team vote ─────────────────────────────────────────────────────────────

export function castTeamVote(
  state: AvalonState,
  actorId: string,
  vote: TeamVote,
): { state: AvalonState } | { error: string } {
  if (state.phase !== 'TEAM_VOTE') return { error: 'Not in team vote phase.' };

  if (vote !== 'APPROVE' && vote !== 'REJECT') return { error: 'Invalid vote.' };

  if (state.teamVotesPrivate[actorId] !== undefined) {
    return { error: 'You have already voted.' };
  }

  if (!state.players.find((p) => p.id === actorId)) {
    return { error: 'Player not found.' };
  }

  const nextVotes = { ...state.teamVotesPrivate, [actorId]: vote };

  // Not all votes in yet
  if (Object.keys(nextVotes).length < state.players.length) {
    return { state: { ...state, teamVotesPrivate: nextVotes } };
  }

  // All votes are in — resolve
  return resolveTeamVote({ ...state, teamVotesPrivate: nextVotes });
}

function resolveTeamVote(
  state: AvalonState,
): { state: AvalonState } | { error: string } {
  const votes = state.teamVotesPrivate;
  const approveCount = Object.values(votes).filter((v) => v === 'APPROVE').length;
  const rejectCount = Object.values(votes).filter((v) => v === 'REJECT').length;
  const passed = approveCount > rejectCount; // strict majority (ties = reject)

  // Shuffle the reveal to prevent ordering attacks
  const revealedEntries: { playerId: string; vote: TeamVote }[] = shuffle(
    Object.entries(votes).map(([playerId, vote]) => ({ playerId, vote })),
  );

  const leader = state.players[state.leaderIndex];

  if (passed) {
    const move = {
      type: 'TEAM_APPROVED',
      timestamp: new Date().toISOString(),
      playerName: leader?.name ?? 'Unknown',
      details: `Team approved (${approveCount}–${rejectCount}). Quest begins.`,
      success: true,
    };
    return {
      state: {
        ...state,
        phase: 'QUEST_VOTE',
        teamVotesRevealed: revealedEntries,
        questVotesPrivate: {},
        questVotesRevealed: [],
        lastMove: move,
        moveLog: [move, ...state.moveLog],
      },
    };
  }

  // Rejected
  const nextProposalNumber = state.proposalNumber + 1;

  // 5th consecutive rejection → Evil wins immediately
  if (nextProposalNumber >= 5) {
    const move = {
      type: 'EVIL_WINS',
      timestamp: new Date().toISOString(),
      playerName: 'System',
      details: `Team rejected (${approveCount}–${rejectCount}). Five consecutive rejections — Evil wins!`,
      success: false,
    };
    return {
      state: {
        ...state,
        phase: 'GAME_OVER',
        teamVotesRevealed: revealedEntries,
        proposalNumber: nextProposalNumber,
        winner: 'EVIL',
        winnerReason: 'Five consecutive team proposals were rejected.',
        lastMove: move,
        moveLog: [move, ...state.moveLog],
      },
    };
  }

  const move = {
    type: 'TEAM_REJECTED',
    timestamp: new Date().toISOString(),
    playerName: leader?.name ?? 'Unknown',
    details: `Team rejected (${approveCount}–${rejectCount}). Proposal ${nextProposalNumber}/5.`,
    success: false,
  };

  // Rotate leader exactly once
  const nextLeaderIndex = (state.leaderIndex + 1) % state.players.length;

  return {
    state: {
      ...state,
      phase: 'TEAM_PROPOSAL',
      teamVotesRevealed: revealedEntries,
      proposalNumber: nextProposalNumber,
      leaderIndex: nextLeaderIndex,
      currentTeam: [],
      lastMove: move,
      moveLog: [move, ...state.moveLog],
    },
  };
}

// ─── Quest vote ────────────────────────────────────────────────────────────

export function castQuestVote(
  state: AvalonState,
  actorId: string,
  vote: QuestVote,
): { state: AvalonState } | { error: string } {
  if (state.phase !== 'QUEST_VOTE') return { error: 'Not in quest vote phase.' };

  if (!state.currentTeam.includes(actorId)) {
    return { error: 'Only team members may vote on this quest.' };
  }

  if (state.questVotesPrivate[actorId] !== undefined) {
    return { error: 'You have already submitted your quest vote.' };
  }

  if (vote !== 'SUCCESS' && vote !== 'FAIL') return { error: 'Invalid quest vote.' };

  // Good-aligned players MUST vote Success (server enforces)
  const player = state.players.find((p) => p.id === actorId);
  if (player?.role && factionOf(player.role) === 'GOOD' && vote === 'FAIL') {
    return { error: 'Good-aligned players must vote Success.' };
  }

  const nextVotes = { ...state.questVotesPrivate, [actorId]: vote };

  // Not all team members voted yet
  if (Object.keys(nextVotes).length < state.currentTeam.length) {
    return { state: { ...state, questVotesPrivate: nextVotes } };
  }

  // All votes in — resolve quest
  return resolveQuestVote({ ...state, questVotesPrivate: nextVotes });
}

function resolveQuestVote(
  state: AvalonState,
): { state: AvalonState } | { error: string } {
  const votes = state.questVotesPrivate;
  const allVotes = Object.values(votes) as QuestVote[];
  const failCount = allVotes.filter((v) => v === 'FAIL').length;
  const threshold = failThresholdFor(state.players.length, state.currentQuest);
  const questSuccess = failCount < threshold;

  // Shuffle votes before revealing (no player ID in reveal)
  const shuffledVotes: QuestVote[] = shuffle(allVotes);

  const questResult: QuestResult = {
    questIndex: state.currentQuest,
    teamIds: [...state.currentTeam],
    votes: shuffledVotes,
    failCount,
    success: questSuccess,
  };

  const nextSuccessful = state.successfulQuests + (questSuccess ? 1 : 0);
  const nextFailed = state.failedQuests + (questSuccess ? 0 : 1);

  const move = {
    type: 'QUEST_RESOLVED',
    timestamp: new Date().toISOString(),
    playerName: 'System',
    details: questSuccess
      ? `Quest ${state.currentQuest + 1} succeeded! (${failCount} fail card${failCount !== 1 ? 's' : ''})`
      : `Quest ${state.currentQuest + 1} failed! (${failCount} fail card${failCount !== 1 ? 's' : ''})`,
    success: questSuccess,
  };

  const baseNext: AvalonState = {
    ...state,
    questVotesPrivate: votes,
    questVotesRevealed: shuffledVotes,
    questHistory: [...state.questHistory, questResult],
    successfulQuests: nextSuccessful,
    failedQuests: nextFailed,
    lastMove: move,
    moveLog: [move, ...state.moveLog],
  };

  // Check Evil win (3 failed quests)
  if (nextFailed >= 3) {
    return {
      state: {
        ...baseNext,
        phase: 'GAME_OVER',
        winner: 'EVIL',
        winnerReason: 'Three quests have failed.',
      },
    };
  }

  // Check Good approaching win (3 successful quests → assassination)
  if (nextSuccessful >= 3) {
    const assassinPlayer = state.players.find((p) => p.role === 'ASSASSIN');
    if (!assassinPlayer) {
      // No Assassin role — Good wins immediately
      return {
        state: {
          ...baseNext,
          phase: 'GAME_OVER',
          winner: 'GOOD',
          winnerReason: 'Three quests succeeded.',
        },
      };
    }
    // Assassination phase
    const assMove = {
      type: 'ASSASSINATION_PHASE',
      timestamp: new Date().toISOString(),
      playerName: 'System',
      details: `Three quests succeeded. ${assassinPlayer.name} must identify Merlin.`,
      success: true,
    };
    return {
      state: {
        ...baseNext,
        phase: 'ASSASSINATION',
        lastMove: assMove,
        moveLog: [assMove, ...baseNext.moveLog],
      },
    };
  }

  // Advance to next quest — rotate leader exactly once, reset proposalNumber
  const nextLeaderIndex = (state.leaderIndex + 1) % state.players.length;

  return {
    state: {
      ...baseNext,
      phase: 'TEAM_PROPOSAL',
      currentQuest: state.currentQuest + 1,
      proposalNumber: 0,
      leaderIndex: nextLeaderIndex,
      currentTeam: [],
      teamVotesPrivate: {},
      teamVotesRevealed: [],
      questVotesPrivate: {},
      questVotesRevealed: [],
    },
  };
}

// ─── Assassination ─────────────────────────────────────────────────────────

export function performAssassination(
  state: AvalonState,
  actorId: string,
  targetId: string,
): { state: AvalonState } | { error: string } {
  if (state.phase !== 'ASSASSINATION') return { error: 'Not in assassination phase.' };

  const actor = state.players.find((p) => p.id === actorId);
  if (!actor || actor.role !== 'ASSASSIN') {
    return { error: 'Only the Assassin may perform the assassination.' };
  }

  const target = state.players.find((p) => p.id === targetId);
  if (!target) return { error: 'Target player not found.' };

  if (targetId === actorId) return { error: 'The Assassin cannot target themselves.' };

  const hitMerlin = target.role === 'MERLIN';
  const move = {
    type: 'ASSASSINATION',
    timestamp: new Date().toISOString(),
    playerName: actor.name,
    details: hitMerlin
      ? `${actor.name} assassinated ${target.name} — who was Merlin! Evil wins!`
      : `${actor.name} assassinated ${target.name} — who was NOT Merlin. Good wins!`,
    success: hitMerlin,
  };

  return {
    state: {
      ...state,
      phase: 'GAME_OVER',
      assassinationTarget: targetId,
      winner: hitMerlin ? 'EVIL' : 'GOOD',
      winnerReason: hitMerlin
        ? `Merlin (${target.name}) was assassinated.`
        : `The Assassin missed — ${target.name} was not Merlin.`,
      lastMove: move,
      moveLog: [move, ...state.moveLog],
    },
  };
}

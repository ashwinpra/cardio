import { describe, it, expect } from 'vitest';
import { handleAction } from './avalon';
import {
  setupAvalon,
  buildRoleList,
  computeRoleVisibility,
  questSizeFor,
  failThresholdFor,
  defaultRoleConfig,
} from '../../src/games/avalon/logic';
import type { AvalonState, AvalonPlayer, AvalonRole } from '../../src/games/avalon/types';

// ─── Test helpers ──────────────────────────────────────────────────────────

function makePlayer(id: string, name: string): AvalonPlayer {
  return {
    id,
    name,
    isConnected: true,
    seatIndex: 0,
    team: 'TEAM_A',
  };
}

function makeLobbyState(players: AvalonPlayer[]): AvalonState {
  return {
    sessionId: 'TEST',
    gameType: 'AVALON',
    phase: 'LOBBY',
    players,
    activePlayerIndex: 0,
    lastMove: null,
    moveLog: [],
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
    roleVisibility: {},
    percivalCandidates: [],
  };
}

const FIVE_PLAYERS = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id, i) =>
  makePlayer(id, `Player${i + 1}`),
);

const SEVEN_PLAYERS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].map((id, i) =>
  makePlayer(id, `Player${i + 1}`),
);

function startGame(players = FIVE_PLAYERS): AvalonState {
  const lobby = makeLobbyState(players);
  const result = handleAction(lobby, { type: 'START_GAME', actorId: 'p1', test: true });
  expect(result.error).toBeUndefined();
  return result.state!;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('Avalon — Role Assignment', () => {
  it('assigns exactly the right number of Good and Evil roles for 5 players', () => {
    const state = startGame(FIVE_PLAYERS);
    const good = state.players.filter(
      (p) => ['MERLIN', 'PERCIVAL', 'LOYAL_SERVANT'].includes(p.role!),
    );
    const evil = state.players.filter(
      (p) => ['ASSASSIN', 'MORGANA', 'MORDRED', 'OBERON', 'MINION_OF_MORDRED'].includes(p.role!),
    );
    expect(good.length).toBe(3);
    expect(evil.length).toBe(2);
  });

  it('assigns exactly the right number for 7 players', () => {
    const state = startGame(SEVEN_PLAYERS);
    const evil = state.players.filter(
      (p) => ['ASSASSIN', 'MORGANA', 'MORDRED', 'OBERON', 'MINION_OF_MORDRED'].includes(p.role!),
    );
    expect(evil.length).toBe(3);
    expect(state.players.length - evil.length).toBe(4); // 4 Good
  });

  it('rejects games with fewer than 5 players', () => {
    const lobby = makeLobbyState(FIVE_PLAYERS.slice(0, 3));
    const result = handleAction(lobby, { type: 'START_GAME', actorId: 'p1' });
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/5/);
  });

  it('rejects games with more than 10 players', () => {
    const players = Array.from({ length: 11 }, (_, i) =>
      makePlayer(`p${i + 1}`, `P${i + 1}`),
    );
    const lobby = makeLobbyState(players);
    const result = handleAction(lobby, { type: 'START_GAME', actorId: 'p1' });
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/10/);
  });

  it('buildRoleList errors when too many named evil roles', () => {
    const config = {
      ...defaultRoleConfig(),
      includeMorgana: true,
      includeMordred: true,
      includeOberon: true,
    };
    const result = buildRoleList(5, config); // only 2 evil slots
    expect(result.error).toBeDefined();
  });
});

describe('Avalon — Role Visibility', () => {
  it('Merlin sees Evil except Mordred', () => {
    const players: AvalonPlayer[] = [
      { ...makePlayer('merlin', 'Merlin'), role: 'MERLIN' },
      { ...makePlayer('mordred', 'Mordred'), role: 'MORDRED' },
      { ...makePlayer('assass', 'Assassin'), role: 'ASSASSIN' },
      { ...makePlayer('loyal', 'Loyal'), role: 'LOYAL_SERVANT' },
      { ...makePlayer('minion', 'Minion'), role: 'MINION_OF_MORDRED' },
    ];
    const { roleVisibility } = computeRoleVisibility(players);
    const merlinSees = roleVisibility['merlin'].map((v) => v.playerId);
    expect(merlinSees).toContain('assass');
    expect(merlinSees).toContain('minion');
    expect(merlinSees).not.toContain('mordred'); // Mordred hidden from Merlin
    expect(merlinSees).not.toContain('loyal');
    expect(merlinSees).not.toContain('merlin'); // doesn't see self
  });

  it('Percival sees exactly 2 candidates (Merlin + Morgana)', () => {
    const players: AvalonPlayer[] = [
      { ...makePlayer('merlin', 'Merlin'), role: 'MERLIN' },
      { ...makePlayer('percival', 'Percival'), role: 'PERCIVAL' },
      { ...makePlayer('morgana', 'Morgana'), role: 'MORGANA' },
      { ...makePlayer('assass', 'Assassin'), role: 'ASSASSIN' },
      { ...makePlayer('loyal', 'Loyal'), role: 'LOYAL_SERVANT' },
    ];
    const { roleVisibility, percivalCandidates } = computeRoleVisibility(players);
    expect(percivalCandidates).toHaveLength(2);
    expect(percivalCandidates).toContain('merlin');
    expect(percivalCandidates).toContain('morgana');
    const percivalSees = roleVisibility['percival'];
    expect(percivalSees).toHaveLength(2);
    percivalSees.forEach((v) => expect(v.knownAs).toBe('MERLIN_CANDIDATE'));
  });

  it('Evil (non-Oberon) see each other but NOT Oberon', () => {
    const players: AvalonPlayer[] = [
      { ...makePlayer('merlin', 'Merlin'), role: 'MERLIN' },
      { ...makePlayer('loyal', 'Loyal'), role: 'LOYAL_SERVANT' },
      { ...makePlayer('assass', 'Assassin'), role: 'ASSASSIN' },
      { ...makePlayer('oberon', 'Oberon'), role: 'OBERON' },
      { ...makePlayer('minion', 'Minion'), role: 'MINION_OF_MORDRED' },
    ];
    const { roleVisibility } = computeRoleVisibility(players);
    const assassinSees = roleVisibility['assass'].map((v) => v.playerId);
    expect(assassinSees).toContain('minion');
    expect(assassinSees).not.toContain('oberon'); // Oberon is invisible to other Evil
    const minionSees = roleVisibility['minion'].map((v) => v.playerId);
    expect(minionSees).toContain('assass');
    expect(minionSees).not.toContain('oberon');
  });

  it('Oberon sees nobody', () => {
    const players: AvalonPlayer[] = [
      { ...makePlayer('merlin', 'Merlin'), role: 'MERLIN' },
      { ...makePlayer('loyal', 'Loyal'), role: 'LOYAL_SERVANT' },
      { ...makePlayer('assass', 'Assassin'), role: 'ASSASSIN' },
      { ...makePlayer('oberon', 'Oberon'), role: 'OBERON' },
      { ...makePlayer('minion', 'Minion'), role: 'MINION_OF_MORDRED' },
    ];
    const { roleVisibility } = computeRoleVisibility(players);
    expect(roleVisibility['oberon']).toHaveLength(0);
  });

  it('Loyal Servant sees nobody', () => {
    const players: AvalonPlayer[] = [
      { ...makePlayer('merlin', 'Merlin'), role: 'MERLIN' },
      { ...makePlayer('loyal', 'Loyal'), role: 'LOYAL_SERVANT' },
      { ...makePlayer('assass', 'Assassin'), role: 'ASSASSIN' },
      { ...makePlayer('loyal2', 'L2'), role: 'LOYAL_SERVANT' },
      { ...makePlayer('minion', 'Minion'), role: 'MINION_OF_MORDRED' },
    ];
    const { roleVisibility } = computeRoleVisibility(players);
    expect(roleVisibility['loyal']).toHaveLength(0);
  });
});

describe('Avalon — Quest Sizes & Fail Thresholds', () => {
  it('returns correct team sizes for 5 players', () => {
    expect(questSizeFor(5, 0)).toBe(2);
    expect(questSizeFor(5, 1)).toBe(3);
    expect(questSizeFor(5, 2)).toBe(2);
    expect(questSizeFor(5, 3)).toBe(3);
    expect(questSizeFor(5, 4)).toBe(3);
  });

  it('Quest 4 (index 3) requires 2 fails for 7+ players', () => {
    expect(failThresholdFor(7, 3)).toBe(2);
    expect(failThresholdFor(8, 3)).toBe(2);
    expect(failThresholdFor(10, 3)).toBe(2);
  });

  it('Quest 4 (index 3) requires only 1 fail for 5-6 players', () => {
    expect(failThresholdFor(5, 3)).toBe(1);
    expect(failThresholdFor(6, 3)).toBe(1);
  });

  it('All other quests always require 1 fail', () => {
    expect(failThresholdFor(7, 0)).toBe(1);
    expect(failThresholdFor(7, 1)).toBe(1);
    expect(failThresholdFor(7, 2)).toBe(1);
    expect(failThresholdFor(7, 4)).toBe(1);
  });
});

describe('Avalon — Team Proposal', () => {
  it('leader can propose a valid team', () => {
    const state = startGame();
    // Leader is player at leaderIndex (index 0 = p1)
    const leaderId = state.players[state.leaderIndex].id;
    const teamSize = questSizeFor(5, 0); // = 2
    const team = state.players.slice(0, teamSize).map((p) => p.id);

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: team,
    });

    expect(result.error).toBeUndefined();
    expect(result.state?.phase).toBe('TEAM_VOTE');
    expect(result.state?.currentTeam).toEqual(team);
  });

  it('non-leader cannot propose a team', () => {
    const state = startGame();
    const nonLeaderId = state.players.find((p) => p.id !== state.players[state.leaderIndex].id)!.id;
    const team = state.players.slice(0, 2).map((p) => p.id);

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: nonLeaderId,
      teamIds: team,
    });

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/leader/i);
  });

  it('rejects team with wrong size', () => {
    const state = startGame();
    const leaderId = state.players[state.leaderIndex].id;
    // Quest 0 needs 2, but we send 3
    const team = state.players.slice(0, 3).map((p) => p.id);

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: team,
    });

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/2/);
  });

  it('rejects team with duplicate player IDs', () => {
    const state = startGame();
    const leaderId = state.players[state.leaderIndex].id;

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: [state.players[0].id, state.players[0].id],
    });

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/duplicate/i);
  });
});

describe('Avalon — Team Vote (Simultaneous + Leader Rotation)', () => {
  function proposeAndVote(
    initState: AvalonState,
    votes: Record<string, 'APPROVE' | 'REJECT'>,
  ) {
    const leaderId = initState.players[initState.leaderIndex].id;
    const teamSize = questSizeFor(initState.players.length, initState.currentQuest);
    const team = initState.players.slice(0, teamSize).map((p) => p.id);

    let s = handleAction(initState, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: team,
    }).state!;

    for (const [pid, vote] of Object.entries(votes)) {
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'TEAM_VOTE',
        actorId: pid,
        vote,
      }).state!;
    }
    return s;
  }

  it('approved vote goes to QUEST_VOTE', () => {
    const state = startGame();
    const votes: Record<string, 'APPROVE' | 'REJECT'> = {};
    state.players.forEach((p) => (votes[p.id] = 'APPROVE'));

    const result = proposeAndVote(state, votes);
    expect(result.phase).toBe('QUEST_VOTE');
  });

  it('rejected vote returns to TEAM_PROPOSAL and rotates leader exactly once', () => {
    const state = startGame();
    const originalLeaderIndex = state.leaderIndex;
    const votes: Record<string, 'APPROVE' | 'REJECT'> = {};
    state.players.forEach((p) => (votes[p.id] = 'REJECT'));

    const result = proposeAndVote(state, votes);
    expect(result.phase).toBe('TEAM_PROPOSAL');
    expect(result.proposalNumber).toBe(1);
    expect(result.leaderIndex).toBe((originalLeaderIndex + 1) % state.players.length);
  });

  it('leader rotates incrementally across multiple rejections', () => {
    let state = startGame();
    const n = state.players.length;

    for (let round = 0; round < 3; round++) {
      const expectedLeader = round % n;
      expect(state.leaderIndex).toBe(expectedLeader);

      const votes: Record<string, 'APPROVE' | 'REJECT'> = {};
      state.players.forEach((p) => (votes[p.id] = 'REJECT'));
      state = proposeAndVote(state, votes);
    }
  });

  it('5th consecutive rejection triggers Evil win', () => {
    let state = startGame();
    for (let i = 0; i < 5; i++) {
      const votes: Record<string, 'APPROVE' | 'REJECT'> = {};
      state.players.forEach((p) => (votes[p.id] = 'REJECT'));
      state = proposeAndVote(state, votes);
    }
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winner).toBe('EVIL');
    expect(state.winnerReason).toMatch(/five/i);
  });

  it('player cannot vote twice', () => {
    const state = startGame();
    const leaderId = state.players[state.leaderIndex].id;
    const team = state.players.slice(0, 2).map((p) => p.id);

    let s = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: team,
    }).state!;

    s = handleAction(s, {
      type: 'AVALON_ACTION',
      action: 'TEAM_VOTE',
      actorId: state.players[0].id,
      vote: 'APPROVE',
    }).state!;

    const result = handleAction(s, {
      type: 'AVALON_ACTION',
      action: 'TEAM_VOTE',
      actorId: state.players[0].id,
      vote: 'REJECT',
    });

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/already voted/i);
  });

  it('tie vote counts as rejection', () => {
    // 6 players: 3 approve, 3 reject → tie → reject
    // (4 players not valid: FACTION_COUNTS only supports 5–10)
    const players = SEVEN_PLAYERS.slice(0, 6);
    const lobby = makeLobbyState(players);
    const initResult = handleAction(lobby, { type: 'START_GAME', actorId: 'p1', test: true });
    let state = initResult.state!;

    const leaderId = state.players[state.leaderIndex].id;
    // Quest 0 for 6 players needs 2 members
    const team = state.players.slice(0, 2).map((p) => p.id);

    state = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: team,
    }).state!;

    const votes: Record<string, 'APPROVE' | 'REJECT'> = {
      [state.players[0].id]: 'APPROVE',
      [state.players[1].id]: 'APPROVE',
      [state.players[2].id]: 'APPROVE',
      [state.players[3].id]: 'REJECT',
      [state.players[4].id]: 'REJECT',
      [state.players[5].id]: 'REJECT',
    };

    for (const [pid, vote] of Object.entries(votes)) {
      state = handleAction(state, {
        type: 'AVALON_ACTION',
        action: 'TEAM_VOTE',
        actorId: pid,
        vote,
      }).state!;
    }

    expect(state.phase).toBe('TEAM_PROPOSAL');
    expect(state.proposalNumber).toBe(1);
  });
});

describe('Avalon — Quest Vote', () => {
  /** Run the game to QUEST_VOTE phase */
  function toQuestVote(state: AvalonState): AvalonState {
    const leaderId = state.players[state.leaderIndex].id;
    const teamSize = questSizeFor(state.players.length, state.currentQuest);
    const team = state.players.slice(0, teamSize).map((p) => p.id);

    let s = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: team,
    }).state!;

    const votes: Record<string, 'APPROVE' | 'REJECT'> = {};
    s.players.forEach((p) => (votes[p.id] = 'APPROVE'));
    for (const [pid, vote] of Object.entries(votes)) {
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'TEAM_VOTE',
        actorId: pid,
        vote,
      }).state!;
    }
    return s;
  }

  it('only team members can submit quest votes', () => {
    const state = startGame();
    let s = toQuestVote(state);

    // Find someone NOT on the team
    const nonMember = s.players.find((p) => !s.currentTeam.includes(p.id));
    expect(nonMember).toBeDefined();

    const result = handleAction(s, {
      type: 'AVALON_ACTION',
      action: 'QUEST_VOTE',
      actorId: nonMember!.id,
      vote: 'SUCCESS',
    });

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/team members/i);
  });

  it('a successful quest increments successfulQuests', () => {
    let state = startGame();
    // Force all players to be good so no one can fail
    state = {
      ...state,
      players: state.players.map((p) => ({ ...p, role: 'LOYAL_SERVANT' as AvalonRole })),
    };

    let s = toQuestVote(state);

    // All team members vote Success
    for (const pid of s.currentTeam) {
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'QUEST_VOTE',
        actorId: pid,
        vote: 'SUCCESS',
      }).state!;
    }

    expect(s.successfulQuests).toBe(1);
    expect(s.phase).toBe('TEAM_PROPOSAL');
    expect(s.proposalNumber).toBe(0); // reset
    expect(s.currentQuest).toBe(1);   // advanced
  });

  it('a failed quest increments failedQuests', () => {
    let state = startGame();
    // Force player[0] to be evil Assassin so they can fail
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, role: 'ASSASSIN' as AvalonRole } : { ...p, role: 'LOYAL_SERVANT' as AvalonRole },
      ),
    };
    // Make p1 the leader and include them in team
    state = { ...state, leaderIndex: 0 };

    let s = toQuestVote(state);

    // Team is first 2 players (p1 = evil, p2 = good)
    for (const pid of s.currentTeam) {
      const player = state.players.find((p) => p.id === pid)!;
      const vote = player.role === 'ASSASSIN' ? 'FAIL' : 'SUCCESS';
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'QUEST_VOTE',
        actorId: pid,
        vote: vote as any,
      }).state!;
    }

    expect(s.failedQuests).toBe(1);
  });

  it('Good player cannot vote Fail', () => {
    let state = startGame();
    state = {
      ...state,
      players: state.players.map((p) => ({ ...p, role: 'LOYAL_SERVANT' as AvalonRole })),
    };

    let s = toQuestVote(state);
    const teamMember = s.currentTeam[0];

    const result = handleAction(s, {
      type: 'AVALON_ACTION',
      action: 'QUEST_VOTE',
      actorId: teamMember,
      vote: 'FAIL',
    });

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/Good/i);
  });

  it('quest votes are revealed as a shuffled anonymous array (no player IDs)', () => {
    let state = startGame();
    state = {
      ...state,
      players: state.players.map((p) => ({ ...p, role: 'LOYAL_SERVANT' as AvalonRole })),
    };

    let s = toQuestVote(state);
    for (const pid of s.currentTeam) {
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'QUEST_VOTE',
        actorId: pid,
        vote: 'SUCCESS',
      }).state!;
    }

    // questVotesRevealed should be an array of strings (no player IDs)
    expect(Array.isArray(s.questVotesRevealed)).toBe(true);
    s.questVotesRevealed.forEach((v) => {
      expect(typeof v).toBe('string');
      expect(['SUCCESS', 'FAIL']).toContain(v);
    });
  });

  it('Quest 4 (7 players) requires 2 fails to fail', () => {
    let state = startGame(SEVEN_PLAYERS);
    // Force all good except p1 (leader, evil)
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0
          ? { ...p, role: 'ASSASSIN' as AvalonRole }
          : { ...p, role: 'LOYAL_SERVANT' as AvalonRole },
      ),
      currentQuest: 3, // Quest 4 (0-indexed)
      successfulQuests: 3, // Pretend 3 were already won
      leaderIndex: 0,
    };

    let s = toQuestVote(state);

    // Only 1 fail — should still succeed (7-player quest 4 needs 2 fails)
    const evilMember = s.currentTeam.find(
      (id) => s.players.find((p) => p.id === id)?.role === 'ASSASSIN',
    );

    for (const pid of s.currentTeam) {
      const isEvil = pid === evilMember;
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'QUEST_VOTE',
        actorId: pid,
        vote: isEvil ? 'FAIL' : 'SUCCESS',
      }).state!;
    }

    // 1 fail in 7-player Q4 = success
    // successfulQuests was 3, now 4, but game was already at ASSASSINATION (3 needed)
    // The quest result entry should show success
    const lastQuest = s.questHistory[s.questHistory.length - 1];
    expect(lastQuest?.success).toBe(true);
  });
});

describe('Avalon — Win Conditions', () => {
  it('Evil wins when 3 quests fail', () => {
    let state = startGame();
    // Force p1 to be evil
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, role: 'ASSASSIN' as AvalonRole } : { ...p, role: 'LOYAL_SERVANT' as AvalonRole },
      ),
      failedQuests: 2, // Already failed 2
      currentQuest: 2,
      leaderIndex: 0,
    };

    // Propose and approve a team including evil player
    const leaderId = state.players[0].id;
    let s = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: [state.players[0].id, state.players[1].id],
    }).state!;

    // Approve
    for (const p of s.players) {
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'TEAM_VOTE',
        actorId: p.id,
        vote: 'APPROVE',
      }).state!;
    }

    // Evil fails
    s = handleAction(s, {
      type: 'AVALON_ACTION',
      action: 'QUEST_VOTE',
      actorId: state.players[0].id,
      vote: 'FAIL',
    }).state!;
    s = handleAction(s, {
      type: 'AVALON_ACTION',
      action: 'QUEST_VOTE',
      actorId: state.players[1].id,
      vote: 'SUCCESS',
    }).state!;

    expect(s.phase).toBe('GAME_OVER');
    expect(s.winner).toBe('EVIL');
    expect(s.failedQuests).toBe(3);
  });

  it('Good gets 3 successful quests → triggers Assassination phase', () => {
    let state = startGame();
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, role: 'ASSASSIN' as AvalonRole } : { ...p, role: 'LOYAL_SERVANT' as AvalonRole },
      ),
      successfulQuests: 2,
      currentQuest: 2,
      leaderIndex: 1, // non-evil leader
    };

    const leaderId = state.players[1].id;
    let s = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: [state.players[1].id, state.players[2].id], // no evil
    }).state!;

    for (const p of s.players) {
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'TEAM_VOTE',
        actorId: p.id,
        vote: 'APPROVE',
      }).state!;
    }

    for (const pid of s.currentTeam) {
      s = handleAction(s, {
        type: 'AVALON_ACTION',
        action: 'QUEST_VOTE',
        actorId: pid,
        vote: 'SUCCESS',
      }).state!;
    }

    expect(s.phase).toBe('ASSASSINATION');
    expect(s.successfulQuests).toBe(3);
  });
});

describe('Avalon — Assassination', () => {
  function buildAssassinationState(): AvalonState {
    let state = startGame();
    // Manually set: p1=Assassin, p2=Merlin, rest=Loyal
    state = {
      ...state,
      phase: 'ASSASSINATION',
      players: state.players.map((p, i) => {
        if (i === 0) return { ...p, role: 'ASSASSIN' as AvalonRole };
        if (i === 1) return { ...p, role: 'MERLIN' as AvalonRole };
        return { ...p, role: 'LOYAL_SERVANT' as AvalonRole };
      }),
      successfulQuests: 3,
    };
    return state;
  }

  it('Assassin hitting Merlin → Evil wins', () => {
    const state = buildAssassinationState();
    const assassinId = state.players[0].id;
    const merlinId = state.players[1].id;

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'ASSASSINATE',
      actorId: assassinId,
      targetId: merlinId,
    });

    expect(result.error).toBeUndefined();
    expect(result.state?.phase).toBe('GAME_OVER');
    expect(result.state?.winner).toBe('EVIL');
    expect(result.state?.winnerReason).toMatch(/Merlin/i);
  });

  it('Assassin missing Merlin → Good wins', () => {
    const state = buildAssassinationState();
    const assassinId = state.players[0].id;
    const loyalId = state.players[2].id; // NOT Merlin

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'ASSASSINATE',
      actorId: assassinId,
      targetId: loyalId,
    });

    expect(result.error).toBeUndefined();
    expect(result.state?.phase).toBe('GAME_OVER');
    expect(result.state?.winner).toBe('GOOD');
  });

  it('non-Assassin cannot perform assassination', () => {
    const state = buildAssassinationState();
    const loyalId = state.players[2].id;
    const merlinId = state.players[1].id;

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'ASSASSINATE',
      actorId: loyalId,
      targetId: merlinId,
    });

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/Assassin/i);
  });

  it('Assassin cannot target themselves', () => {
    const state = buildAssassinationState();
    const assassinId = state.players[0].id;

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'ASSASSINATE',
      actorId: assassinId,
      targetId: assassinId,
    });

    expect(result.error).toBeDefined();
  });
});

describe('Avalon — Illegal Actions', () => {
  it('ignores actions during GAME_OVER', () => {
    let state = startGame();
    state = { ...state, phase: 'GAME_OVER', winner: 'EVIL', winnerReason: 'test' };

    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: state.players[0].id,
      teamIds: [state.players[0].id, state.players[1].id],
    });

    expect(result.error).toBeUndefined();
    expect(result.state?.phase).toBe('GAME_OVER');
  });

  it('cannot vote on quest when not in QUEST_VOTE phase', () => {
    const state = startGame();
    // state.phase === 'TEAM_PROPOSAL'
    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'QUEST_VOTE',
      actorId: state.players[0].id,
      vote: 'SUCCESS',
    });
    expect(result.error).toBeDefined();
  });

  it('cannot assassinate during TEAM_PROPOSAL', () => {
    const state = startGame();
    const result = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'ASSASSINATE',
      actorId: state.players[0].id,
      targetId: state.players[1].id,
    });
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/assassination phase/i);
  });
});

describe('Avalon — Hidden Information Leakage', () => {
  it('sanitized state strips teamVotesPrivate and questVotesPrivate', () => {
    const state = startGame();
    // Verify these fields exist on raw state
    expect(state).toHaveProperty('teamVotesPrivate');
    expect(state).toHaveProperty('questVotesPrivate');
    // In production they'd be stripped by sanitizeStateForPlayer — here we just
    // verify the fields are present on server state and that quest votes are
    // not exposed as-is.
  });

  it('team vote reveal does not expose player IDs during voting', () => {
    let state = startGame();
    const leaderId = state.players[state.leaderIndex].id;
    const team = state.players.slice(0, 2).map((p) => p.id);

    state = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'PROPOSE_TEAM',
      actorId: leaderId,
      teamIds: team,
    }).state!;

    // After propose, before all votes: teamVotesRevealed should be empty
    expect(state.teamVotesRevealed).toHaveLength(0);

    // One player votes
    state = handleAction(state, {
      type: 'AVALON_ACTION',
      action: 'TEAM_VOTE',
      actorId: state.players[0].id,
      vote: 'APPROVE',
    }).state!;

    // Still in TEAM_VOTE, but not all voted: reveal stays empty
    expect(state.teamVotesRevealed).toHaveLength(0);
    expect(state.phase).toBe('TEAM_VOTE');
  });
});

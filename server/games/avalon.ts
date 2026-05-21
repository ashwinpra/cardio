import * as Avalon from '../../src/games/avalon/logic.js';
import type { AvalonState, TeamVote, QuestVote } from '../../src/games/avalon/types.js';

export function handleAction(
  state: AvalonState,
  data: any,
): { state?: AvalonState; error?: string } {
  const actorId = data.actorId as string | null;
  if (!actorId) return { error: 'Not joined as a player.' };

  switch (data.type) {
    case 'START_GAME': {
      const minPlayers = data.test ? 1 : 5;
      if (state.players.length < minPlayers) {
        return { error: `Need at least ${minPlayers} players for Avalon.` };
      }
      if (state.players.length > 10) {
        return { error: 'Maximum 10 players allowed for Avalon.' };
      }

      const result = Avalon.setupAvalon(state, Avalon.defaultRoleConfig());
      if ('error' in result) return { error: result.error };
      return { state: result };
    }

    case 'AVALON_ACTION': {
      const action = data.action as string;

      if (state.phase === 'GAME_OVER') return { state };

      // ── Team Proposal ──────────────────────────────────────────────────
      if (action === 'PROPOSE_TEAM') {
        const teamIds = data.teamIds as string[];
        if (!Array.isArray(teamIds)) return { error: 'teamIds must be an array.' };

        const result = Avalon.proposeTeam(state, actorId, teamIds);
        if ('error' in result) return { error: result.error };
        return { state: result.state };
      }

      // ── Team Vote ──────────────────────────────────────────────────────
      if (action === 'TEAM_VOTE') {
        const vote = data.vote as TeamVote;
        if (!vote) return { error: 'Missing vote.' };

        const result = Avalon.castTeamVote(state, actorId, vote);
        if ('error' in result) return { error: result.error };
        return { state: result.state };
      }

      // ── Quest Vote ─────────────────────────────────────────────────────
      if (action === 'QUEST_VOTE') {
        const vote = data.vote as QuestVote;
        if (!vote) return { error: 'Missing vote.' };

        const result = Avalon.castQuestVote(state, actorId, vote);
        if ('error' in result) return { error: result.error };
        return { state: result.state };
      }

      // ── Assassination ──────────────────────────────────────────────────
      if (action === 'ASSASSINATE') {
        const targetId = data.targetId as string;
        if (!targetId) return { error: 'Missing targetId.' };

        const result = Avalon.performAssassination(state, actorId, targetId);
        if ('error' in result) return { error: result.error };
        return { state: result.state };
      }

      return { state };
    }

    default:
      return { state };
  }
}

import * as LiteratureLogic from '../../src/games/literature/logic.js';
import { Card } from '../../src/games/literature/types.js';

export function handleAction(state: any, data: any) {
  switch (data.type) {
    case 'START_GAME':
      if (state.players.length < 2) return { error: 'Need at least 2 players' };
      return { state: LiteratureLogic.dealCards(state) };

    case 'ASK_CARD':
      const { askerId, targetId, card } = data;
      const result = LiteratureLogic.handleAsk(state, askerId, targetId, card as Card);
      if (result.error) return { error: result.error };
      return { state: result.state };

    case 'CLAIM_BOOK':
      const { claimerId, halfSuit } = data;
      const claimer = state.players.find((p: any) => p.id === claimerId);
      if (!claimer) return { state };

      const claimingTeam = claimer.team;
      const hsCards = LiteratureLogic.getCardsInHalfSuit(halfSuit);
      const teamPlayerIds = state.players.filter((p: any) => p.team === claimingTeam).map((p: any) => p.id);

      let teamHoldsAll = true;
      for (const card of hsCards) {
        let found = false;
        for (const pid of teamPlayerIds) {
          const hand = state.hands[pid] || [];
          if (hand.some((c: any) => c.rank === card.rank && c.suit === card.suit)) { found = true; break; }
        }
        if (!found) { teamHoldsAll = false; break; }
      }

      const opponentTeam = claimingTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
      const awardedTo = teamHoldsAll ? claimingTeam : opponentTeam;

      const moveDetails = teamHoldsAll
        ? `${claimer.name} correctly claimed the ${halfSuit.replace(/_/g, ' ').toLowerCase()}!`
        : `${claimer.name} failed to claim the ${halfSuit.replace(/_/g, ' ').toLowerCase()} — the book goes to the opposing team.`;

      state.lastMove = {
        type: 'CLAIM', timestamp: new Date().toISOString(),
        playerName: claimer.name, details: moveDetails, success: teamHoldsAll,
      };
      state.moveLog = [state.lastMove, ...state.moveLog];

      for (const pid in state.hands) {
        state.hands[pid] = state.hands[pid].filter((c: any) => {
          return !hsCards.some((hc: any) => hc.rank === c.rank && hc.suit === c.suit);
        });
      }

      state.books.push({ team: awardedTo, halfSuit });
      if (awardedTo === 'TEAM_A') state.scores.teamA++;
      else state.scores.teamB++;

      const maxBooks = state.players.length === 8 ? 8 : 9;
      if (state.books.length >= maxBooks) state.phase = 'GAME_OVER';

      return { state };

    default:
      return { state };
  }
}

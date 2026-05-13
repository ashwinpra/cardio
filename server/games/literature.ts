import * as LiteratureLogic from '../../src/games/literature/logic.js';
import type { Card, GameState, HalfSuitName, Player, Move } from '../../src/games/literature/types.js';

interface ActionData {
  type: string;
  actorId?: string;
  askerId?: string;
  targetId?: string;
  card?: Card;
  claimerId?: string;
  halfSuit?: HalfSuitName;
}

interface ActionResult {
  state?: GameState;
  error?: string;
}

export function handleAction(state: GameState, data: ActionData): ActionResult {
  switch (data.type) {
    case 'START_GAME':
      if (state.players.length < 2) return { error: 'Need at least 2 players' };
      return { state: LiteratureLogic.dealCards(state) };

    case 'ASK_CARD': {
      const { askerId, targetId, card } = data;
      if (!askerId || !targetId || !card) return { error: 'Missing required fields' };

      // Validate it's the asker's turn
      const activePlayer = state.players[state.activePlayerIndex];
      if (activePlayer?.id !== askerId) return { error: 'It is not your turn' };

      const result = LiteratureLogic.handleAsk(state, askerId, targetId, card);
      if (result.error) return { error: result.error };
      return { state: result.state };
    }

    case 'CLAIM_BOOK': {
      const { claimerId, halfSuit } = data;
      if (!claimerId || !halfSuit) return { error: 'Missing required fields' };

      // Validate it's the claimer's turn
      const activePlayer = state.players[state.activePlayerIndex];
      if (activePlayer?.id !== claimerId) return { error: 'It is not your turn' };

      const claimer = state.players.find((p: Player) => p.id === claimerId);
      if (!claimer) return { error: 'Player not found' };

      const claimingTeam = claimer.team;
      const hsCards = LiteratureLogic.getCardsInHalfSuit(halfSuit);
      const teamPlayerIds = state.players
        .filter((p: Player) => p.team === claimingTeam)
        .map((p: Player) => p.id);

      let teamHoldsAll = true;
      for (const card of hsCards) {
        let found = false;
        for (const pid of teamPlayerIds) {
          const hand = state.hands[pid] || [];
          if (hand.some((c: Card) => c.rank === card.rank && c.suit === card.suit)) { found = true; break; }
        }
        if (!found) { teamHoldsAll = false; break; }
      }

      const opponentTeam = claimingTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
      const awardedTo = teamHoldsAll ? claimingTeam : opponentTeam;

      const moveDetails = teamHoldsAll
        ? `${claimer.name} correctly claimed the ${halfSuit.replace(/_/g, ' ').toLowerCase()}!`
        : `${claimer.name} failed to claim the ${halfSuit.replace(/_/g, ' ').toLowerCase()} — the book goes to the opposing team.`;

      const move: Move = {
        type: 'CLAIM', timestamp: new Date().toISOString(),
        playerName: claimer.name, details: moveDetails, success: teamHoldsAll,
      };

      // Build new state immutably instead of mutating the input
      const newHands: Record<string, Card[]> = {};
      for (const pid in state.hands) {
        newHands[pid] = state.hands[pid].filter((c: Card) => {
          return !hsCards.some((hc: Card) => hc.rank === c.rank && hc.suit === c.suit);
        });
      }

      const newBooks = [...state.books, { team: awardedTo, halfSuit }];
      const newScores = {
        teamA: state.scores.teamA + (awardedTo === 'TEAM_A' ? 1 : 0),
        teamB: state.scores.teamB + (awardedTo === 'TEAM_B' ? 1 : 0),
      };

      const maxBooks = state.players.length === 8 ? 8 : 9;
      const newPhase = newBooks.length >= maxBooks ? 'GAME_OVER' : state.phase;

      const newState: GameState = {
        ...state,
        phase: newPhase,
        lastMove: move,
        moveLog: [move, ...state.moveLog],
        hands: newHands,
        books: newBooks,
        scores: newScores,
      };

      return { state: newState };
    }

    default:
      return { state };
  }
}

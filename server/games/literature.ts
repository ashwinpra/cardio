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
      if (!data.test && state.players.length < 2) return { error: 'Need at least 2 players' };
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

      const result = LiteratureLogic.handleClaim(state, claimerId, halfSuit);
      if (result.error) return { error: result.error };
      return { state: result.state };
    }

    default:
      return { state };
  }
}

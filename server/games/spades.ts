import * as SpadesLogic from '../../src/games/spades/logic.js';

import type { GameState, Card, Player } from '../../src/games/spades/types.js';

interface ActionData {
  type: string;
  actorId?: string;
  test?: boolean;
  bid?: number;
  card?: Card;
}

interface ActionResult {
  state?: GameState;
  error?: string;
}

export function handleAction(state: GameState, data: ActionData): ActionResult {
  const { actorId } = data;
  const actor = state.players.find((p: Player) => p.id === actorId);

  switch (data.type) {
    case 'START_GAME': {
      if (!data.test && state.players.length !== 4) {
        return { error: `Spades requires exactly 4 players (${state.players.length} present)` };
      }
      return { state: SpadesLogic.setupSpades(state) };
    }

    case 'PLACE_BID': {
      if (!actor || state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn to bid' };
      }

      const result = SpadesLogic.placeBid(state, actorId, data.bid);
      if (result.error) return result;

      const newState = result.state!;
      newState.lastMove = {
        type: 'BID',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} bid ${data.bid === 0 ? 'Nil' : data.bid + ' tricks'}`,
        success: true
      };

      return { state: newState };
    }

    case 'PLAY_CARD': {
      if (!actor || state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn to play' };
      }

      const result = SpadesLogic.playCard(state, actorId, data.card);
      if (result.error) return result;

      const newState = result.state!;
      newState.lastMove = {
        type: 'PLAY_CARD',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} played ${data.card.rank} of ${data.card.suit}s`,
        success: true
      };

      return { state: newState };
    }
  }

  return { state };
}

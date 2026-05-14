import * as HanabiLogic from '../../src/games/hanabi/logic.js';

export function handleAction(state: any, data: any, broadcastState: (sid: string) => void) {
  const { actorId } = data;
  const actor = state.players.find((p: any) => p.id === actorId);

  if (!actor) return { state };

  switch (data.type) {
    case 'START_GAME': {
      if (!data.test && (state.players.length < 2 || state.players.length > 5)) {
        return { error: `Need 2-5 players to start Hanabi (${state.players.length} present)` };
      }
      return { state: HanabiLogic.setupHanabi(state) };
    }

    case 'PLAY_CARD': {
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn' };
      }
      const result = HanabiLogic.playCard(state, actorId, data.cardIndex);
      if (result.error) return result;
      
      const newState = result.state!;
      newState.lastMove = {
        type: 'PLAY_CARD',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} played a card. Score: ${newState.score}/25, Mistakes: ${newState.mistakeTokens}/3`,
        success: true
      };
      return { state: newState };
    }

    case 'DISCARD_CARD': {
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn' };
      }
      const result = HanabiLogic.discardCard(state, actorId, data.cardIndex);
      if (result.error) return result;

      const newState = result.state!;
      newState.lastMove = {
        type: 'DISCARD_CARD',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} discarded a card. Hint tokens: ${newState.hintTokens}/8`,
        success: true
      };
      return { state: newState };
    }

    case 'GIVE_HINT': {
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn' };
      }
      const result = HanabiLogic.giveHint(state, actorId, data.targetPlayerId, data.hintType, data.hintValue);
      if (result.error) return result;

      const newState = result.state!;
      const target = state.players.find((p: any) => p.id === data.targetPlayerId);
      newState.lastMove = {
        type: 'GIVE_HINT',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} gave a hint to ${target?.name}: ${data.hintType} is ${data.hintValue}`,
        success: true
      };
      return { state: newState };
    }
  }

  return { state };
}

import * as HanabiLogic from '../../src/games/hanabi/logic.js';

export function handleAction(state: any, data: any, broadcastState: (sid: string) => void) {
  const { actorId } = data;
  const actor = state.players.find((p: any) => p.id === actorId);

  if (!actor) return { state };

  switch (data.type) {
    case 'START_GAME':
      if (!data.test && (state.players.length < 2 || state.players.length > 5)) {
        return { error: `Need 2-5 players to start Hanabi (${state.players.length} present)` };
      }
      return { state: HanabiLogic.setupHanabi(state) };

    case 'PLAY_CARD':
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn' };
      }
      HanabiLogic.playCard(state, actorId, data.cardIndex);
      state.lastMove = {
        type: 'PLAY_CARD',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} played a card. Score: ${state.score}/25, Mistakes: ${state.mistakeTokens}/3`,
        success: true
      };
      HanabiLogic.advancePhase(state);
      break;

    case 'DISCARD_CARD':
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn' };
      }
      HanabiLogic.discardCard(state, actorId, data.cardIndex);
      state.lastMove = {
        type: 'DISCARD_CARD',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} discarded a card. Hint tokens: ${state.hintTokens}/8`,
        success: true
      };
      HanabiLogic.advancePhase(state);
      break;

    case 'GIVE_HINT':
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn' };
      }
      if (state.hintTokens < 1) {
        return { error: 'No hint tokens available' };
      }
      HanabiLogic.giveHint(state, actorId, data.targetPlayerId, data.hintType, data.hintValue);
      const target = state.players.find((p: any) => p.id === data.targetPlayerId);
      state.lastMove = {
        type: 'GIVE_HINT',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} gave a hint to ${target?.name}: ${data.hintType} is ${data.hintValue}`,
        success: true
      };
      HanabiLogic.advancePhase(state);
      break;
  }

  if (state.phase === 'GAME_OVER') {
    state.winner = state.score >= 25 ? 'ALL' : 'NONE';
  }

  return { state };
}

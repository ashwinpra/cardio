import * as SpadesLogic from '../../src/games/spades/logic.js';

export function handleAction(state: any, data: any, broadcastState: (sid: string) => void) {
  const { actorId } = data;
  const actor = state.players.find((p: any) => p.id === actorId);

  if (!actor) return { state };

  switch (data.type) {
    case 'START_GAME':
      if (!data.test && state.players.length !== 4) {
        return { error: `Spades requires exactly 4 players (${state.players.length} present)` };
      }
      return { state: SpadesLogic.setupSpades(state) };

    case 'PLACE_BID':
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn to bid' };
      }

      SpadesLogic.placeBid(state, actorId, data.bid);
      state.lastMove = {
        type: 'BID',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} bid ${data.bid} tricks`,
        success: true
      };

      if (!state.allPlayersBid) {
        state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
      }
      break;

    case 'PLAY_CARD':
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn to play' };
      }

      const success = SpadesLogic.playCard(state, actorId, data.card);
      if (!success) {
        return { error: 'Invalid card play' };
      }

      state.lastMove = {
        type: 'PLAY_CARD',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} played ${data.card.rank} of ${data.card.suit}s`,
        success: true
      };

      if (state.currentTrick.cards.length < 4) {
        state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
      }
      break;
  }

  return { state };
}

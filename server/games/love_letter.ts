import * as LoveLetterLogic from '../../src/games/love_letter/logic.js';

export function handleAction(state: any, data: any, broadcastState: (sid: string) => void) {
  const { actorId } = data;
  const actor = state.players.find((p: any) => p.id === actorId);

  if (!actor) return { state };

  switch (data.type) {
    case 'START_GAME':
      if (state.players.length < 2 || state.players.length > 4) {
        return { error: `Need 2-4 players to start Love Letter (${state.players.length} present)` };
      }
      return { state: LoveLetterLogic.setupLoveLetter(state) };

    case 'PLAY_CARD':
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn' };
      }

      // Play the card
      LoveLetterLogic.playCard(state, actorId, data.cardRole);

      // Handle card effects
      if (data.targetPlayerId) {
        LoveLetterLogic.handleCardEffect(
          state,
          actorId,
          data.cardRole,
          data.targetPlayerId,
          data.guessedRole
        );
      } else if (data.cardRole === 'COUNTESS') {
        // Countess has no effect
      } else if (data.cardRole !== 'PRINCESS') {
        // Cards that don't need targets or have passive effects
        LoveLetterLogic.handleCardEffect(state, actorId, data.cardRole);
      }

      state.lastMove = {
        type: 'PLAY_CARD',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} played ${data.cardRole}`,
        success: true
      };

      // Check if round ended
      if (LoveLetterLogic.checkRoundEnd(state)) {
        LoveLetterLogic.endRound(state);
      } else {
        state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
      }
      break;
  }

  return { state };
}

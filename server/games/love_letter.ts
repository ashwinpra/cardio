import * as LoveLetterLogic from '../../src/games/love_letter/logic.js';

export function handleAction(state: any, data: any, broadcastState: (sid: string) => void) {
  const { actorId } = data;
  const actor = state.players.find((p: any) => p.id === actorId);

  if (!actor) return { state };

  switch (data.type) {
    case 'START_GAME': {
      if (!data.test && (state.players.length < 2 || state.players.length > 4)) {
        return { error: `Need 2-4 players to start Love Letter (${state.players.length} present)` };
      }
      return { state: LoveLetterLogic.setupLoveLetter(state) };
    }

    case 'PLAY_CARD': {
      if (state.activePlayerIndex !== state.players.indexOf(actor)) {
        return { error: 'Not your turn' };
      }

      const result = LoveLetterLogic.playCard(
        state,
        actorId,
        data.cardRole,
        data.targetPlayerId,
        data.guessedRole
      );

      if (result.error) return result;

      const newState = result.state!;
      newState.lastMove = {
        type: 'PLAY_CARD',
        timestamp: new Date().toISOString(),
        playerName: actor.name,
        details: `${actor.name} played ${data.cardRole}${data.targetPlayerId ? ' on ' + state.players.find((p: any) => p.id === data.targetPlayerId)?.name : ''}`,
        success: true
      };

      return { state: newState };
    }
  }

  return { state };
}

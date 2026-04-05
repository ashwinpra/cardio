import * as CoupLogic from '../../src/games/coup/logic.js';

export function handleAction(state: any, data: any, broadcastState: (sid: string) => void) {
  const { actorId } = data;
  const actor = state.players.find((p: any) => p.id === actorId);

  switch (data.type) {
    case 'START_GAME':
      if (state.players.length < 1) return { error: 'Need at least 1 player to test' };
      if (state.players.length > 6) return { error: 'Maximum 6 players allowed' };
      return { state: CoupLogic.setupCoup(state) };

    case 'COUP_ACTION': {
      const { actionType, targetId } = data;

      // 1. Basic Instant Actions (Income, Coup)
      if (['INCOME', 'COUP'].includes(actionType)) {
        return { state: CoupLogic.handleBasicAction(state, actorId, actionType, targetId) };
      }

      // 2. Character Actions (Starting Challenge Window)
      if (['TAX', 'ASSASSINATE', 'STEAL', 'EXCHANGE', 'FOREIGN_AID'].includes(actionType)) {
        if (!actor) return { state };

        // Cost Checks
        if (actionType === 'ASSASSINATE' && actor.coins < 3) return { error: 'Not enough coins for Assassination' };
        if (actionType === 'ASSASSINATE') actor.coins -= 3;

        const serverTimestamp = Date.now();
        state.phase = 'WAITING_FOR_CHALLENGE';
        state.pendingAction = {
          actorId,
          type: actionType,
          targetId,
          challengers: [], // IDs of players who decided not to challenge
          timestamp: serverTimestamp,
        };

        const targetName = targetId ? state.players.find((p: any) => p.id === targetId)?.name : '';
        const actionLabel = CoupLogic.formatActionName(actionType);
        state.lastMove = {
          type: actionType,
          timestamp: new Date().toISOString(),
          playerName: actor.name,
          details: `${actor.name} is choosing to ${actionLabel}${targetName ? ' on ' + targetName : ''}. Waiting for responses...`,
          success: true
        };
        state.moveLog = [state.lastMove, ...state.moveLog];

        // Start a 10s timer to resolve if no one challenges
        const sessionId = state.sessionId;
        setTimeout(() => {
          // Verify we're still in the same action
          if (state.pendingAction && state.pendingAction.timestamp === serverTimestamp && state.phase === 'WAITING_FOR_CHALLENGE') {
            resolveAction(state, broadcastState);
          }
        }, 10000);

        return { state };
      }

      // 3. Challenge Action
      if (actionType === 'CHALLENGE') {
        if (!state.pendingAction || state.phase !== 'WAITING_FOR_CHALLENGE') return { state };

        const action = state.pendingAction;
        const requiredRole = CoupLogic.getRequiredRole(action.type);
        const challengedActor = state.players.find((p: any) => p.id === action.actorId);
        const hasRole = challengedActor.influences.some((i: any) => !i.isRevealed && i.role === requiredRole);

        if (hasRole) {
          // Challenger loses influence
          state.phase = 'SELECT_INFLUENCE_TO_LOSE';
          state.loserId = actorId; // The challenger
          state.resolution = 'CHALLENGE_FAILED'; // Actor was telling the truth

          // Actor swaps the card
          const roleIndex = challengedActor.influences.findIndex((i: any) => !i.isRevealed && i.role === requiredRole);
          const oldRole = challengedActor.influences[roleIndex].role;
          state.deck.push(oldRole);
          CoupLogic.shuffle(state.deck);
          challengedActor.influences[roleIndex].role = state.deck.shift();

          state.lastMove.details = `${challengedActor.name} showed their ${requiredRole}! ${actor.name} must lose an influence.`;
        } else {
          // Actor loses influence
          state.phase = 'SELECT_INFLUENCE_TO_LOSE';
          state.loserId = action.actorId; // The actor was bluffing
          state.resolution = 'CHALLENGE_SUCCESSFUL';
          const actionLabel = CoupLogic.formatActionName(action.type);
          state.lastMove.details = `${challengedActor.name} challenged ${challengedActor.name === actor.name ? 'themselves' : challengedActor.name}'s ${actionLabel}. They were bluffing! They don't have a ${requiredRole}.`;
        }
        return { state };
      }

      // 4. Pass Action (don't challenge)
      if (actionType === 'PASS') {
        if (!state.pendingAction || state.phase !== 'WAITING_FOR_CHALLENGE') return { state };
        if (!state.pendingAction.challengers.includes(actorId)) {
          state.pendingAction.challengers.push(actorId);
        }
        // If all other players passed, resolve immediately
        const othersCount = state.players.filter((p: any) => p.id !== state.pendingAction.actorId && p.influences.some((i: any) => !i.isRevealed)).length;
        if (state.pendingAction.challengers.length >= othersCount) {
          resolveAction(state, broadcastState);
        }
        return { state };
      }

      // 5. Select Influence to Lose
      if (actionType === 'LOSE_INFLUENCE') {
        if (state.phase !== 'SELECT_INFLUENCE_TO_LOSE' || state.loserId !== actorId) return { state };

        const { influenceIndex } = data;
        const loser = state.players.find((p: any) => p.id === actorId);
        if (loser.influences[influenceIndex].isRevealed) return { state };

        loser.influences[influenceIndex].isRevealed = true;

        // After influence is lost, check if we resolve the pending action
        if (state.resolution === 'CHALLENGE_FAILED') {
          // Actor was right, action resolves
          resolveAction(state, broadcastState);
        } else {
          // Action was blocked/challenged successfully, just move to next turn
          state.phase = 'PLAYING';
          state.pendingAction = null;
          moveToNextTurn(state);
        }
        return { state };
      }

      // 6. Select Exchange Cards
      if (actionType === 'FINALIZE_EXCHANGE') {
        if (state.phase !== 'SELECTING_EXCHANGE_CARDS' || state.activePlayerIndex !== state.players.findIndex((p: any) => p.id === actorId)) return { state };

        const { selectedRoles } = data;
        const actor = state.players.find((p: any) => p.id === actorId);
        const unrevealedCount = actor.influences.filter((i: any) => !i.isRevealed).length;

        if (selectedRoles.length !== unrevealedCount) return { error: `Must select exactly ${unrevealedCount} cards` };

        // 1. Return all non-selected cards to deck
        const currentOptions = [...state.exchangeOptions];
        selectedRoles.forEach((role: string) => {
          const idx = currentOptions.indexOf(role);
          if (idx > -1) currentOptions.splice(idx, 1);
        });

        state.deck.push(...currentOptions);
        CoupLogic.shuffle(state.deck);

        // 2. Update actor's unrevealed influences
        let selectedIdx = 0;
        actor.influences.forEach((inf: any) => {
          if (!inf.isRevealed) {
            inf.role = selectedRoles[selectedIdx++];
          }
        });

        // 3. Cleanup and move on
        state.exchangeOptions = [];
        state.phase = 'PLAYING';
        state.pendingAction = null;
        moveToNextTurn(state);
        return { state };
      }

      return { state };
    }

    default:
      return { state };
  }
}

function moveToNextTurn(state: any) {
  const alivePlayers = state.players.filter((p: any) => p.influences.some((i: any) => !i.isRevealed));

  if (alivePlayers.length <= 1) {
    state.phase = 'GAME_OVER';
    state.winner = alivePlayers[0]?.id;
    state.lastMove = {
      type: 'VICTORY',
      timestamp: new Date().toISOString(),
      playerName: alivePlayers[0]?.name || 'Unknown',
      details: `${alivePlayers[0]?.name || 'Nobody'} has won the game!`,
      success: true
    };
    return;
  }

  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  // skip dead
  while (!state.players[state.activePlayerIndex].influences.some((i: any) => !i.isRevealed)) {
    state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  }
}

function resolveAction(state: any, broadcastState: (sid: string) => void) {
  if (!state.pendingAction) return;

  const { type, actorId, targetId } = state.pendingAction;
  const actor = state.players.find((p: any) => p.id === actorId);

  const actionLabel = CoupLogic.formatActionName(type);
  const targetName = targetId ? state.players.find((p: any) => p.id === targetId)?.name : '';

  // Character Action Implementations
  if (type === 'TAX') {
    actor.coins += 3;
    state.lastMove.details = `${actor.name} successfully used Tax and gained 3 coins.`;
  }
  if (type === 'STEAL') {
    const target = state.players.find((p: any) => p.id === targetId);
    if (target) {
      const amount = Math.min(target.coins, 2);
      target.coins -= amount;
      actor.coins += amount;
      state.lastMove.details = `${actor.name} successfully stole ${amount} coins from ${target.name}.`;
    }
  }
  if (type === 'FOREIGN_AID') {
    actor.coins += 2;
    state.lastMove.details = `${actor.name} successfully used Foreign Aid and gained 2 coins.`;
  }
  if (type === 'ASSASSINATE') {
    const target = state.players.find((p: any) => p.id === targetId);
    if (target) {
      state.lastMove.details = `${actor.name}'s Assassination on ${target.name} was successful. ${target.name} must lose an influence.`;
      // Transition to target choosing card to lose
      state.phase = 'SELECT_INFLUENCE_TO_LOSE';
      state.loserId = targetId;
      state.resolution = 'ACTION_COMPLETE';
      state.pendingAction = null;
      broadcastState(state.sessionId);
      return;
    }
  }
  if (type === 'EXCHANGE') {
    const unrevealedRoles = actor.influences.filter((i: any) => !i.isRevealed).map((i: any) => i.role);
    const drawnRoles = [state.deck.shift(), state.deck.shift()];

    state.lastMove.details = `${actor.name} is performing an Exchange.`;
    state.exchangeOptions = [...unrevealedRoles, ...drawnRoles];
    state.phase = 'SELECTING_EXCHANGE_CARDS';
    state.pendingAction = null;
    broadcastState(state.sessionId);
    return;
  }

  state.phase = 'PLAYING';
  state.pendingAction = null;
  moveToNextTurn(state);
  broadcastState(state.sessionId);
}

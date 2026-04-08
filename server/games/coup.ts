import * as CoupLogic from '../../src/games/coup/logic.js';

export function handleAction(state: any, data: any, broadcastState: (sid: string) => void) {
  const { actorId } = data;
  const actor = state.players.find((p: any) => p.id === actorId);

  switch (data.type) {
    case 'START_GAME':
      if (state.players.length < 3) return { error: 'Need at least 3 players to start' };
      if (state.players.length > 6) return { error: 'Maximum 6 players allowed' };
      return { state: CoupLogic.setupCoup(state) };

    case 'COUP_ACTION': {
      const { actionType, targetId, roleClaimed } = data;

      // 1. Basic Instant Actions (Income, Coup)
      if (['INCOME', 'COUP'].includes(actionType)) {
        return { state: CoupLogic.handleBasicAction(state, actorId, actionType, targetId) };
      }

      // 2. Character Actions (Challengeable/Blockable)
      if (['TAX', 'ASSASSINATE', 'STEAL', 'EXCHANGE', 'FOREIGN_AID', 'BLOCK'].includes(actionType)) {
        if (!actor) return { state };

        // Blocking Action
        if (actionType === 'BLOCK') {
          if (!state.pendingAction || !roleClaimed) return { state };
          const serverTimestamp = Date.now();
          state.phase = 'WAITING_FOR_BLOCK_CHALLENGE';
          state.pendingAction.blocks = {
            blockerId: actorId,
            roleClaimed
          };
          state.pendingAction.challengers = []; // Reset passes for the new challenge window
          state.pendingAction.timestamp = serverTimestamp;

          state.lastMove.details = `${actor.name} is blocking with ${CoupLogic.formatRoleName(roleClaimed)}. Waiting for responses...`;
          state.moveLog = [{ ...state.lastMove, type: 'BLOCK' }, ...state.moveLog];

          startResolutionTimer(state, serverTimestamp, broadcastState);
          return { state };
        }

        // Standard Action Declaration
        if (actionType === 'ASSASSINATE' && actor.coins < 3) return { error: 'Not enough coins for Assassination' };
        if (actionType === 'ASSASSINATE') actor.coins -= 3;

        const serverTimestamp = Date.now();
        const actionLabel = CoupLogic.formatActionName(actionType);
        
        if (actionType === 'FOREIGN_AID') {
          state.phase = 'WAITING_FOR_BLOCK';
          state.lastMove = {
            type: actionType,
            timestamp: new Date().toISOString(),
            playerName: actor.name,
            details: `${actor.name} is taking Foreign Aid. Waiting for blocks...`,
            success: true
          };
        } else {
          state.phase = 'WAITING_FOR_CHALLENGE';
          const targetName = targetId ? (state.players.find((p: any) => p.id === targetId)?.name || 'someone') : '';
          state.lastMove = {
            type: actionType,
            timestamp: new Date().toISOString(),
            playerName: actor.name,
            details: `${actor.name} is choosing to ${actionLabel}${targetName ? ' on ' + targetName : ''}. Waiting for responses...`,
            success: true
          };
        }

        state.pendingAction = {
          actorId,
          type: actionType,
          targetId,
          challengers: [],
          timestamp: serverTimestamp,
          blocks: null
        };
        state.moveLog = [state.lastMove, ...state.moveLog];

        startResolutionTimer(state, serverTimestamp, broadcastState);
        return { state };
      }

      // 3. Challenge Action
      if (actionType === 'CHALLENGE') {
        if (!state.pendingAction) return { state };
        const isChallengingBlock = state.phase === 'WAITING_FOR_BLOCK_CHALLENGE';
        if (!isChallengingBlock && state.phase !== 'WAITING_FOR_CHALLENGE') return { state };

        const action = state.pendingAction;
        const challengedPlayerId = isChallengingBlock ? action.blocks!.blockerId : action.actorId;
        const requiredRole = isChallengingBlock ? action.blocks!.roleClaimed : CoupLogic.getRequiredRole(action.type);
        const challengedPlayer = state.players.find((p: any) => p.id === challengedPlayerId);
        
        const hasRole = challengedPlayer.influences.some((i: any) => !i.isRevealed && i.role === requiredRole);

        if (hasRole) {
          // Challenger loses influence
          state.phase = 'SELECT_INFLUENCE_TO_LOSE';
          state.loserId = actorId; // The challenger
          state.resolution = isChallengingBlock ? 'BLOCK_CHALLENGE_FAILED' : 'CHALLENGE_FAILED';

          // Truthful player swaps card
          swapPlayerCard(state, challengedPlayer, requiredRole as any);

          state.lastMove.details = `${challengedPlayer.name} showed their ${CoupLogic.formatRoleName(requiredRole)}! ${actor.name} must lose an influence.`;
        } else {
          // Challenged player loses influence
          state.phase = 'SELECT_INFLUENCE_TO_LOSE';
          state.loserId = challengedPlayerId; 
          state.resolution = isChallengingBlock ? 'BLOCK_CHALLENGE_SUCCESSFUL' : 'CHALLENGE_SUCCESSFUL';
          state.lastMove.details = `${actor.name} challenged ${challengedPlayer.name}'s ${isChallengingBlock ? 'block' : 'action'}. They were bluffing!`;
        }
        return { state };
      }

      // 4. Pass Action
      if (actionType === 'PASS') {
        if (!state.pendingAction) return { state };
        if (!state.pendingAction.challengers.includes(actorId)) {
          state.pendingAction.challengers.push(actorId);
        }
        
        const othersCount = state.players.filter((p: any) => p.influences.some((i: any) => !i.isRevealed)).length - 1;
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

        // Determine what happens next
        if (state.resolution === 'CHALLENGE_FAILED' || state.resolution === 'BLOCK_CHALLENGE_SUCCESSFUL') {
          // If block challenge was successful, the block is removed
          if (state.resolution === 'BLOCK_CHALLENGE_SUCCESSFUL') {
            state.pendingAction.blocks = null;
          }
          // If action challenge failed, or block challenge succeeded (blocker lying) -> Resolve the action
          resolveAction(state, broadcastState);
        } else {
          // If action challenge succeeded (truthful lying), or block challenge failed (blocker truthful)
          // -> Action fails, Next Turn
          state.phase = 'PLAYING';
          state.pendingAction = null;
          moveToNextTurn(state);
        }
        return { state };
      }

      // 6. Select Exchange Cards
      if (actionType === 'FINALIZE_EXCHANGE') {
        if (state.phase !== 'SELECTING_EXCHANGE_CARDS') return { state };
        const { selectedRoles } = data;
        const actor = state.players.find((p: any) => p.id === actorId);
        const unrevealedCount = actor.influences.filter((i: any) => !i.isRevealed).length;

        if (selectedRoles.length !== unrevealedCount) return { error: `Must select exactly ${unrevealedCount} cards` };

        const currentOptions = [...state.exchangeOptions];
        selectedRoles.forEach((role: string) => {
          const idx = currentOptions.indexOf(role);
          if (idx > -1) currentOptions.splice(idx, 1);
        });

        state.deck.push(...currentOptions);
        CoupLogic.shuffle(state.deck);

        let selectedIdx = 0;
        actor.influences.forEach((inf: any) => {
          if (!inf.isRevealed) {
            inf.role = selectedRoles[selectedIdx++];
          }
        });

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

function startResolutionTimer(state: any, timestamp: number, broadcastState: any) {
  setTimeout(() => {
    if (state.pendingAction && state.pendingAction.timestamp === timestamp && (state.phase === 'WAITING_FOR_CHALLENGE' || state.phase === 'WAITING_FOR_BLOCK' || state.phase === 'WAITING_FOR_BLOCK_CHALLENGE')) {
      resolveAction(state, broadcastState);
    }
  }, 10000);
}

function swapPlayerCard(state: any, player: any, role: string) {
  const roleIndex = player.influences.findIndex((i: any) => !i.isRevealed && i.role === role);
  if (roleIndex === -1) return;
  
  const oldRole = player.influences[roleIndex].role;
  state.deck.push(oldRole);
  CoupLogic.shuffle(state.deck);
  player.influences[roleIndex].role = state.deck.shift();
}

function moveToNextTurn(state: any) {
  const alivePlayers = state.players.filter((p: any) => p.influences.some((i: any) => !i.isRevealed));

  if (alivePlayers.length <= 1) {
    state.phase = 'GAME_OVER';
    state.winner = alivePlayers[0]?.id;
    return;
  }

  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  while (!state.players[state.activePlayerIndex].influences.some((i: any) => !i.isRevealed)) {
    state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  }
}

function resolveAction(state: any, broadcastState: (sid: string) => void) {
  if (!state.pendingAction) return;

  const { type, actorId, targetId, blocks } = state.pendingAction;
  
  // If we were waiting for challenge, and it's blockable, transition to block window
  if (state.phase === 'WAITING_FOR_CHALLENGE' && CoupLogic.isBlockable(type) && !blocks) {
    state.phase = 'WAITING_FOR_BLOCK';
    state.pendingAction.challengers = []; 
    const serverTimestamp = Date.now();
    state.pendingAction.timestamp = serverTimestamp;
    startResolutionTimer(state, serverTimestamp, broadcastState);
    broadcastState(state.sessionId);
    return;
  }

  // If the action was blocked and the block wasn't successfully challenged -> Action Fails
  if (blocks && state.phase !== 'SELECT_INFLUENCE_TO_LOSE') {
    state.lastMove.details = `Action was blocked by ${CoupLogic.formatRoleName(blocks.roleClaimed)}.`;
    state.phase = 'PLAYING';
    state.pendingAction = null;
    moveToNextTurn(state);
    broadcastState(state.sessionId);
    return;
  }

  // Otherwise, Execution
  const actor = state.players.find((p: any) => p.id === actorId);

  if (type === 'TAX') actor.coins += 3;
  if (type === 'FOREIGN_AID') actor.coins += 2;
  if (type === 'STEAL') {
    const target = state.players.find((p: any) => p.id === targetId);
    if (target) {
      const amount = Math.min(target.coins, 2);
      target.coins -= amount;
      actor.coins += amount;
    }
  }
  if (type === 'ASSASSINATE') {
    state.phase = 'SELECT_INFLUENCE_TO_LOSE';
    state.loserId = targetId;
    state.resolution = 'ACTION_COMPLETE';
    state.pendingAction = null;
    broadcastState(state.sessionId);
    return;
  }
  if (type === 'EXCHANGE') {
    const unrevealedRoles = actor.influences.filter((i: any) => !i.isRevealed).map((i: any) => i.role);
    const drawnRoles = [state.deck.shift(), state.deck.shift()];
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

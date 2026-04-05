import type { GameState, CoupRole, Player, Move } from './types';

export const ROLES: CoupRole[] = ['DUKE', 'ASSASSIN', 'CAPTAIN', 'AMBASSADOR', 'CONTESSA'];

export function formatActionName(type: string): string {
  switch (type) {
    case 'INCOME': return 'Income';
    case 'FOREIGN_AID': return 'Foreign Aid';
    case 'TAX': return 'Tax';
    case 'ASSASSINATE': return 'Assassinate';
    case 'STEAL': return 'Steal';
    case 'EXCHANGE': return 'Exchange';
    case 'COUP': return 'Coup';
    case 'CHALLENGE': return 'Challenge';
    case 'PASS': return 'Pass';
    default: return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
  }
}

export function createDeck(playerCount: number): CoupRole[] {
  const deck: CoupRole[] = [];
  // 3 players: 2 of each role (10 total)
  // 4 players: 3 of each role (15 total)
  // 5-6 players: 4 of each role (20 total) 
  let countPerRole = 3;
  if (playerCount <= 3) countPerRole = 2;
  else if (playerCount === 4) countPerRole = 3;
  else if (playerCount >= 5) countPerRole = 4;

  for (const role of ROLES) {
    for (let i = 0; i < countPerRole; i++) {
      deck.push(role);
    }
  }
  return shuffle(deck);
}

export function getRequiredRole(actionType: string): CoupRole | '' {
  switch (actionType) {
    case 'TAX': return 'DUKE';
    case 'ASSASSINATE': return 'ASSASSIN';
    case 'STEAL': return 'CAPTAIN';
    case 'EXCHANGE': return 'AMBASSADOR';
    case 'FOREIGN_AID': return ''; // Can be blocked by Duke, but doesn't require a role to perform
    default: return '';
  }
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function setupCoup(gameState: GameState): GameState {
  const deck = createDeck(gameState.players.length);
  const players = gameState.players.map(p => ({
    ...p,
    coins: 2,
    influences: [
      { role: deck.pop()!, isRevealed: false },
      { role: deck.pop()!, isRevealed: false }
    ]
  }));

  return {
    ...gameState,
    phase: 'PLAYING',
    players,
    deck,
    activePlayerIndex: 0,
    pendingAction: null,
    moveLog: []
  };
}

export function getAlivePlayers(players: Player[]): Player[] {
  return players.filter(p => p.influences?.some(i => !i.isRevealed));
}

// Basic action processing (Income, Foreign Aid, Coup)
// Character actions (Tax, Assassinate, Steal, Exchange) will initially mark a 'pending' state
export function handleBasicAction(state: GameState, actorId: string, type: any, targetId?: string): GameState {
  const newState = { ...state };
  const actor = newState.players.find(p => p.id === actorId);
  if (!actor) return state;

  let details = '';
  let success = true;
  const actionLabel = formatActionName(type);

  switch (type) {
    case 'INCOME':
      actor.coins += 1;
      details = `${actor.name} took ${actionLabel} (+1).`;
      break;
    case 'FOREIGN_AID':
      actor.coins += 2;
      details = `${actor.name} took ${actionLabel} (+2).`;
      break;
    case 'COUP':
      if (actor.coins < 7) return state;
      actor.coins -= 7;
      details = `${actor.name} performed a ${actionLabel} on ${newState.players.find(p => p.id === targetId)?.name}.`;
      break;
  }

  const move: Move = {
    type,
    timestamp: new Date().toISOString(),
    playerName: actor.name,
    details,
    success,
    targetId
  };

  newState.lastMove = move;
  newState.moveLog = [move, ...state.moveLog];

  if (type !== 'FOREIGN_AID') { // Foreign Aid is the only basic action that can be blocked
    newState.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
    // Skip dead players
    while (!newState.players[newState.activePlayerIndex].influences?.some(i => !i.isRevealed)) {
      newState.activePlayerIndex = (newState.activePlayerIndex + 1) % state.players.length;
    }
  }

  return newState;
}

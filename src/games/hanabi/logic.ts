import type { GameState, Card, HanabiColor, HanabiRank } from './types';

const COLORS: HanabiColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'WHITE'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const color of COLORS) {
    // 1 appears once, 2-4 appear twice, 5 appears once
    deck.push({ color, rank: 1 });
    for (let i = 0; i < 2; i++) {
      deck.push({ color, rank: 2 });
      deck.push({ color, rank: 3 });
      deck.push({ color, rank: 4 });
    }
    deck.push({ color, rank: 5 });
  }
  
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

export function setupHanabi(state: GameState): GameState {
  const playerCount = state.players.length;
  if (playerCount < 2 || playerCount > 5) {
    return state;
  }

  const deck = createDeck();
  const handSize = playerCount === 2 ? 5 : 4;

  // Deal cards
  for (let i = 0; i < state.players.length; i++) {
    state.players[i].hand = deck.splice(0, handSize);
  }

  state.deck = deck;
  state.playArea = { RED: 0 as HanabiRank, BLUE: 0 as HanabiRank, GREEN: 0 as HanabiRank, YELLOW: 0 as HanabiRank, WHITE: 0 as HanabiRank };
  state.discardPile = [];
  state.hintTokens = 8;
  state.mistakeTokens = 0;
  state.score = 0;
  state.phase = 'PLAYING';
  state.activePlayerIndex = 0;

  return state;
}

export function drawCard(state: GameState, playerId: string): void {
  const player = state.players.find(p => p.id === playerId);
  if (!player || state.deck.length === 0) return;

  player.hand.push(state.deck.shift()!);
}

export function playCard(state: GameState, playerId: string, cardIndex: number): void {
  const player = state.players.find(p => p.id === playerId);
  if (!player || cardIndex < 0 || cardIndex >= player.hand.length) return;

  const card = player.hand[cardIndex];
  const nextRank = (state.playArea[card.color] as number) + 1;

  if (card.rank === nextRank) {
    // Correct play
    state.playArea[card.color] = card.rank;
    state.score += 1;

    // Gain hint token if completed a suite
    if (card.rank === 5 && state.hintTokens < 8) {
      state.hintTokens += 1;
    }
  } else {
    // Mistake
    state.mistakeTokens += 1;
    state.discardPile.push(card);

    if (state.mistakeTokens >= 3) {
      state.phase = 'GAME_OVER';
    }
  }

  player.hand.splice(cardIndex, 1);
  drawCard(state, playerId);
}

export function discardCard(state: GameState, playerId: string, cardIndex: number): void {
  const player = state.players.find(p => p.id === playerId);
  if (!player || cardIndex < 0 || cardIndex >= player.hand.length) return;

  if (state.hintTokens < 8) {
    state.hintTokens += 1;
  }

  state.discardPile.push(player.hand[cardIndex]);
  player.hand.splice(cardIndex, 1);
  drawCard(state, playerId);
}

export function giveHint(
  state: GameState,
  _fromPlayerId: string,
  toPlayerId: string,
  _hintType: 'COLOR' | 'RANK',
  _hintValue: HanabiColor | HanabiRank
): void {
  if (state.hintTokens < 1) return;

  const targetPlayer = state.players.find(p => p.id === toPlayerId);
  if (!targetPlayer) return;

  state.hintTokens -= 1;

  // In a real implementation, return which cards match the hint
  // For now, we'll handle this on the frontend to track client-side hints
}

export function checkGameEnd(state: GameState): boolean {
  // Game ends if 3 mistakes
  if (state.mistakeTokens >= 3) {
    state.phase = 'GAME_OVER';
    return true;
  }

  // Game ends if all cards are played
  if (state.score === 25 && state.deck.length === 0) {
    state.phase = 'GAME_OVER';
    return true;
  }

  // Game ends if deck runs out
  if (state.deck.length === 0 && state.players.every(p => p.hand.length === 0)) {
    state.phase = 'GAME_OVER';
    return true;
  }

  return false;
}

export function advancePhase(state: GameState): void {
  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;

  if (checkGameEnd(state)) {
    state.phase = 'GAME_OVER';
  }
}

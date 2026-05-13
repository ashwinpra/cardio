import type { GameState, Card, LoveLetterRole } from './types';

const CARD_DECK: Array<{ role: LoveLetterRole; value: number }> = [
  { role: 'GUARD', value: 1 },
  { role: 'GUARD', value: 1 },
  { role: 'PRIEST', value: 2 },
  { role: 'PRIEST', value: 2 },
  { role: 'BARON', value: 3 },
  { role: 'BARON', value: 3 },
  { role: 'HANDMAID', value: 4 },
  { role: 'HANDMAID', value: 4 },
  { role: 'PRINCE', value: 5 },
  { role: 'PRINCE', value: 5 },
  { role: 'KING', value: 6 },
  { role: 'COUNTESS', value: 7 },
  { role: 'PRINCESS', value: 8 },
];

export function createDeck(): Card[] {
  const deck = [...CARD_DECK];

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function setupLoveLetter(state: GameState): GameState {
  const playerCount = state.players.length;
  if (playerCount < 2 || playerCount > 4) {
    return state;
  }

  // Clear one card from deck
  const deck = createDeck();
  deck.shift(); // Remove top card

  // Deal one card to each player
  for (let i = 0; i < state.players.length; i++) {
    state.players[i].hand = [deck.shift()!];
    state.players[i].isEliminated = false;
    state.players[i].tokens = 0;
  }

  state.deck = deck;
  state.discardPile = [];
  state.eliminatedThisRound = [];
  state.currentRound = 1;
  state.handmaidProtection = null;
  state.phase = 'ROUND_START';
  state.activePlayerIndex = 0;

  return state;
}

export function drawCard(state: GameState, playerId: string): Card | null {
  if (state.deck.length === 0) return null;

  const card = state.deck.shift()!;
  const player = state.players.find(p => p.id === playerId);
  if (player) {
    player.hand.push(card);
  }

  return card;
}

export function playCard(state: GameState, playerId: string, cardRole: LoveLetterRole): void {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  const cardIndex = player.hand.findIndex(c => c.role === cardRole);
  if (cardIndex === -1) return;

  const card = player.hand[cardIndex];
  state.discardPile.push(card);
  player.hand.splice(cardIndex, 1);

  // Draw a new card
  if (state.deck.length > 0) {
    drawCard(state, playerId);
  }
}

export function eliminatePlayer(state: GameState, playerId: string): void {
  const player = state.players.find(p => p.id === playerId);
  if (player) {
    player.isEliminated = true;
    state.eliminatedThisRound.push(playerId);
  }
}

export function handleCardEffect(
  state: GameState,
  playerId: string,
  cardRole: LoveLetterRole,
  targetId?: string,
  guessedRole?: LoveLetterRole
): void {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  const target = targetId ? state.players.find(p => p.id === targetId) : null;

  switch (cardRole) {
    case 'GUARD':
      // Guess a card
      if (target && guessedRole && !target.isEliminated && target.id !== state.handmaidProtection) {
        const targetCard = target.hand[0];
        if (targetCard.role === guessedRole) {
          eliminatePlayer(state, targetId!);
        }
      }
      break;

    case 'PRIEST':
      // Look at opponent's hand
      if (target && !target.isEliminated && target.id !== state.handmaidProtection) {
        // Client-side: reveal target's hand to player
      }
      break;

    case 'BARON':
      // Compare hands, lower is eliminated
      if (target && !target.isEliminated && target.id !== state.handmaidProtection) {
        const playerValue = player.hand[0]?.value || 0;
        const targetValue = target.hand[0]?.value || 0;
        if (playerValue > targetValue) {
          eliminatePlayer(state, targetId!);
        } else if (targetValue > playerValue) {
          eliminatePlayer(state, playerId);
        }
      }
      break;

    case 'HANDMAID':
      // Protection until next turn
      state.handmaidProtection = playerId;
      break;

    case 'PRINCE':
      // Target discards hand
      if (target && !target.isEliminated && target.id !== state.handmaidProtection) {
        const discardedCard = target.hand[0];
        if (discardedCard) {
          state.discardPile.push(discardedCard);
          target.hand = [];

          if (state.deck.length > 0) {
            drawCard(state, targetId!);
          } else {
            eliminatePlayer(state, targetId!);
          }
        }
      }
      break;

    case 'KING':
      // Swap hands
      if (target && !target.isEliminated && target.id !== state.handmaidProtection) {
        [player.hand, target.hand] = [target.hand, player.hand];
      }
      break;

    case 'COUNTESS':
      // Must play if King or Prince in hand
      break;

    case 'PRINCESS':
      // If discarded, player is eliminated
      eliminatePlayer(state, playerId);
      break;
  }
}

export function checkRoundEnd(state: GameState): boolean {
  const activePlayers = state.players.filter(p => !p.isEliminated);
  return activePlayers.length <= 1 || state.deck.length === 0;
}

export function endRound(state: GameState): void {
  const activePlayers = state.players.filter(p => !p.isEliminated);

  if (activePlayers.length === 1) {
    // Give winner a token
    activePlayers[0].tokens += 1;

    // Check if won
    const playerCount = state.players.length;
    const tokensNeeded = playerCount === 2 ? 7 : playerCount === 3 ? 5 : 4;

    if (activePlayers[0].tokens >= tokensNeeded) {
      state.phase = 'GAME_OVER';
      state.winner = activePlayers[0].id;
    } else {
      setupLoveLetter(state);
      state.currentRound += 1;
    }
  } else {
    // Highest card wins
    let highestPlayer = activePlayers[0];
    for (const p of activePlayers) {
      if ((p.hand[0]?.value || 0) > (highestPlayer.hand[0]?.value || 0)) {
        highestPlayer = p;
      }
    }

    highestPlayer.tokens += 1;

    const playerCount = state.players.length;
    const tokensNeeded = playerCount === 2 ? 7 : playerCount === 3 ? 5 : 4;

    if (highestPlayer.tokens >= tokensNeeded) {
      state.phase = 'GAME_OVER';
      state.winner = highestPlayer.id;
    } else {
      setupLoveLetter(state);
      state.currentRound += 1;
    }
  }
}

export function advancePhase(state: GameState): void {
  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  state.handmaidProtection = null; // Reset handmaid protection

  if (checkRoundEnd(state)) {
    endRound(state);
  }
}

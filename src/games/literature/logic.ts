import type { Card, GameState, HalfSuitName, Move, Rank, Suit, Team } from './types';

// Constants
export const SUITS: Suit[] = ['CLUB', 'DIAMOND', 'HEART', 'SPADE'];
export const LOW_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7'];
export const HIGH_RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];
export const EIGHTS_AND_JOKERS: { suit: Suit, rank: Rank }[] = [
  { suit: 'CLUB', rank: '8' },
  { suit: 'DIAMOND', rank: '8' },
  { suit: 'HEART', rank: '8' },
  { suit: 'SPADE', rank: '8' },
  { suit: 'JOKER', rank: 'Jk1' },
  { suit: 'JOKER', rank: 'Jk2' },
];

export function createDeck(is8Player: boolean): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of LOW_RANKS) {
      deck.push({ suit, rank });
    }
    for (const rank of HIGH_RANKS) {
      deck.push({ suit, rank });
    }
  }

  // Add Eights & Jokers for 6-player games
  if (!is8Player) {
    deck.push(...EIGHTS_AND_JOKERS);
  }

  return deck;
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getHalfSuit(card: Card): HalfSuitName {
  if (card.rank === '8' || card.suit === 'JOKER') {
    return 'EIGHTS_AND_JOKERS';
  }
  const isHigh = HIGH_RANKS.includes(card.rank);
  const prefix = isHigh ? 'HIGH_' : 'LOW_';
  return `${prefix}${card.suit}` as HalfSuitName;
}

export function getCardsInHalfSuit(halfSuit: HalfSuitName): Card[] {
  if (halfSuit === 'EIGHTS_AND_JOKERS') return EIGHTS_AND_JOKERS;
  
  const [level, suitStr] = halfSuit.split('_');
  const suit = suitStr as Suit;
  const ranks = level === 'HIGH' ? HIGH_RANKS : LOW_RANKS;
  return ranks.map(rank => ({ suit, rank }));
}

export function dealCards(gameState: GameState): GameState {
  const is8Player = gameState.players.length === 8;
  const deck = shuffle(createDeck(is8Player));
  
  const hands: Record<string, Card[]> = {};
  gameState.players.forEach(p => hands[p.id] = []);
  
  let i = 0;
  while (deck.length > 0) {
    const card = deck.pop()!;
    const player = gameState.players[i % gameState.players.length];
    hands[player.id].push(card);
    i++;
  }
  
  return {
    ...gameState,
    phase: 'PLAYING',
    hands,
    activePlayerIndex: 0, // In literature, dealer usually starts (index 0)
    books: [],
    moveLog: [],
    scores: { teamA: 0, teamB: 0 }
  };
}

// Ensure two cards match
export function isSameCard(c1: Card, c2: Card) {
  return c1.suit === c2.suit && c1.rank === c2.rank;
}

export function handleAsk(gameState: GameState, askerId: string, targetId: string, askedCard: Card): { state: GameState, success: boolean, error?: string } {
  // Validate basic conditions
  const asker = gameState.players.find(p => p.id === askerId);
  const target = gameState.players.find(p => p.id === targetId);
  
  if (!asker || !target) return { state: gameState, success: false, error: 'Invalid players' };
  if (asker.team === target.team) return { state: gameState, success: false, error: 'Cannot ask teammate' };
  
  const askerHand = gameState.hands[askerId] || [];
  const targetHand = gameState.hands[targetId] || [];
  
  // Rule: Asker must hold at least one card of the asked half-suit
  const askedHalfSuit = getHalfSuit(askedCard);
  const hasBaseCard = askerHand.some(c => getHalfSuit(c) === askedHalfSuit);
  if (!hasBaseCard) return { state: gameState, success: false, error: 'You do not hold a card from this half-suit' };
  
  // Rule: Asker cannot hold the card they are asking for
  const alreadyHolds = askerHand.some(c => isSameCard(c, askedCard));
  if (alreadyHolds) return { state: gameState, success: false, error: 'You already hold this card' };
  
  // Check if target has the card
  const targetHasCard = targetHand.some(c => isSameCard(c, askedCard));
  
  const move: Move = {
    type: 'ASK',
    timestamp: new Date().toISOString(),
    playerName: asker.name,
    details: targetHasCard 
      ? `${asker.name} asked ${target.name} for the ${askedCard.rank} of ${askedCard.suit} and received it.`
      : `${asker.name} asked ${target.name} for the ${askedCard.rank} of ${askedCard.suit}, but ${target.name} did not have it.`,
    success: targetHasCard
  };
  
  if (targetHasCard) {
    // Transfer card — build new hands object immutably
    const newHands = {
      ...gameState.hands,
      [targetId]: targetHand.filter(c => !isSameCard(c, askedCard)),
      [askerId]: [...askerHand, askedCard],
    };

    return {
      state: {
        ...gameState,
        lastMove: move,
        moveLog: [move, ...gameState.moveLog],
        hands: newHands,
      },
      success: true,
    };
  } else {
    // Turn passes to target
    return {
      state: {
        ...gameState,
        lastMove: move,
        moveLog: [move, ...gameState.moveLog],
        activePlayerIndex: gameState.players.findIndex(p => p.id === targetId),
      },
      success: false,
    };
  }
}

export function handleClaim(gameState: GameState, claimerId: string, halfSuit: HalfSuitName): { state: GameState, success: boolean, error?: string } {
  const claimer = gameState.players.find(p => p.id === claimerId);
  if (!claimer) return { state: gameState, success: false, error: 'Invalid player' };

  const claimingTeam = claimer.team;
  const hsCards = getCardsInHalfSuit(halfSuit);
  const teamPlayerIds = gameState.players
    .filter(p => p.team === claimingTeam)
    .map(p => p.id);

  // Check if the claiming team collectively holds every card in the half-suit
  const teamHoldsAll = hsCards.every(card =>
    teamPlayerIds.some(pid => {
      const hand = gameState.hands[pid] || [];
      return hand.some(c => isSameCard(c, card));
    })
  );

  const opponentTeam: Team = claimingTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
  const awardedTo: Team = teamHoldsAll ? claimingTeam : opponentTeam;

  const moveDetails = teamHoldsAll
    ? `${claimer.name} correctly claimed the ${halfSuit.replace(/_/g, ' ').toLowerCase()}!`
    : `${claimer.name} failed to claim the ${halfSuit.replace(/_/g, ' ').toLowerCase()} — the book goes to the opposing team.`;

  const move: Move = {
    type: 'CLAIM',
    timestamp: new Date().toISOString(),
    playerName: claimer.name,
    details: moveDetails,
    success: teamHoldsAll,
  };

  // Build new state immutably
  const newHands: Record<string, Card[]> = {};
  for (const pid in gameState.hands) {
    newHands[pid] = gameState.hands[pid].filter(c => !hsCards.some(hc => isSameCard(hc, c)));
  }

  const newBooks = [...gameState.books, { team: awardedTo, halfSuit }];
  const newScores = {
    teamA: gameState.scores.teamA + (awardedTo === 'TEAM_A' ? 1 : 0),
    teamB: gameState.scores.teamB + (awardedTo === 'TEAM_B' ? 1 : 0),
  };

  const maxBooks = gameState.players.length === 8 ? 8 : 9;

  return {
    state: {
      ...gameState,
      phase: newBooks.length >= maxBooks ? 'GAME_OVER' : gameState.phase,
      lastMove: move,
      moveLog: [move, ...gameState.moveLog],
      hands: newHands,
      books: newBooks,
      scores: newScores,
    },
    success: teamHoldsAll,
  };
}

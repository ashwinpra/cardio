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
  
  const newState = { ...gameState };
  newState.lastMove = move;
  newState.moveLog = [move, ...gameState.moveLog];
  
  if (targetHasCard) {
    // Transfer card
    newState.hands[targetId] = targetHand.filter(c => !isSameCard(c, askedCard));
    newState.hands[askerId] = [...askerHand, askedCard];
    // turn stays with asker
    
    // Auto-elimination check?
    // If target runs out of cards, they don't do anything special as turn stays with asker.
  } else {
    // Turn passes to target
    newState.activePlayerIndex = gameState.players.findIndex(p => p.id === targetId);
  }
  
  return { state: newState, success: targetHasCard };
}

// claim includes: Record<string, Card[]> which maps player names to the cards they are claimed to hold
export function handleClaim(gameState: GameState, claimerId: string, claimingTeam: Team, halfSuit: HalfSuitName, declarations: Record<string, Card[]>): { state: GameState, success: boolean, correctTeam: boolean, error?: string } {
  const claimer = gameState.players.find(p => p.id === claimerId);
  if (!claimer) return { state: gameState, success: false, correctTeam: false, error: 'Invalid player' };
  
  // Map declarations from player names back to hands to verify
  // A correct claim means EVERY card is placed correctly.
  
  let isCorrect = true;
  let opponentHoldsOne = false;
  
  const requiredCards = getCardsInHalfSuit(halfSuit);
  const actualHands = gameState.hands;
  
  for (const card of requiredCards) {
    // Find who was declared to have it
    let declaredOwnerName: string | null = null;
    for (const [name, cards] of Object.entries(declarations)) {
      if (cards.some(c => isSameCard(c, card))) {
        declaredOwnerName = name;
        break;
      }
    }
    
    // Find who actually has it
    let actualOwnerId: string | null = null;
    let actualOwnerTeam: Team | null = null;
    for (const [id, hand] of Object.entries(actualHands)) {
      if (hand.some(c => isSameCard(c, card))) {
        actualOwnerId = id;
        actualOwnerTeam = gameState.players.find(p => p.id === id)?.team || null;
        break;
      }
    }
    
    const declaredOwner = gameState.players.find(p => p.name === declaredOwnerName);
    
    if (actualOwnerTeam !== claimingTeam) {
      opponentHoldsOne = true;
    }
    
    if (declaredOwner?.id !== actualOwnerId) {
      isCorrect = false;
    }
  }
  
  // Rule outcomes:
  // Correct -> book awarded to claimer's team
  // Opponent holds one -> book awarded to opposing team
  // All cards held by claimer's team, but wrong distribution -> forfeited (nobody gets points)
  
  let awardedTeam: Team | 'FORFEITED' = 'FORFEITED';
  
  if (isCorrect) {
    awardedTeam = claimingTeam;
  } else if (opponentHoldsOne) {
    awardedTeam = claimingTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
  } else {
    awardedTeam = 'FORFEITED';
  }
  
  const move: Move = {
    type: 'CLAIM',
    timestamp: new Date().toISOString(),
    playerName: claimer.name,
    details: `${claimer.name} claimed ${halfSuit} and it was ${awardedTeam === 'FORFEITED' ? 'Forfeited' : `awarded to ${awardedTeam}`}.`,
    success: awardedTeam === claimingTeam
  };
  
  const newState = { ...gameState };
  newState.lastMove = move;
  newState.moveLog = [move, ...gameState.moveLog];
  
  // Remove cards from all players
  for (const id in newState.hands) {
    newState.hands[id] = newState.hands[id].filter(c => getHalfSuit(c) !== halfSuit);
  }
  
  if (awardedTeam !== 'FORFEITED') {
    newState.books.push({ team: awardedTeam, halfSuit });
    if (awardedTeam === 'TEAM_A') newState.scores.teamA++;
    else newState.scores.teamB++;
  }
  
  // Turn logic: 
  // If claimer has no cards left, turn must pass (unless we implement "pass turn on zero cards rules").
  // According to standard literature, if they successfully claim and drop to 0, they can pass to a teammate.
  // We'll require a follow-up action for that, for now let's just leave the active index or shift.
  
  return { state: newState, success: awardedTeam === claimingTeam, correctTeam: awardedTeam === claimingTeam };
}

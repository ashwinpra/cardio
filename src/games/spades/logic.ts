import type { GameState, Card, Suit, Rank } from './types';

const SUITS: Suit[] = ['SPADE', 'HEART', 'DIAMOND', 'CLUB'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function setupSpades(state: GameState): GameState {
  const playerCount = state.players.length;
  if (playerCount !== 4) {
    return state;
  }

  // Assign teams
  state.players[0].team = 'TEAM_A';
  state.players[1].team = 'TEAM_B';
  state.players[2].team = 'TEAM_A';
  state.players[3].team = 'TEAM_B';

  const deck = createDeck();

  // Deal 13 cards to each player
  for (let i = 0; i < state.players.length; i++) {
    state.players[i].hand = deck.splice(0, 13);
    state.players[i].bid = null;
    state.players[i].tricksTaken = 0;
    state.players[i].bags = 0;
  }

  state.deck = [];
  state.currentTrick = { leadSuit: 'SPADE', cards: [] };
  state.trickHistory = [];
  state.teamAScore = { tricks: 0, bags: 0, score: 0 };
  state.teamBScore = { tricks: 0, bags: 0, score: 0 };
  state.allPlayersBid = false;
  state.spadesBroken = false;
  state.phase = 'BIDDING';
  state.activePlayerIndex = 0;

  return state;
}

export function placeBid(state: GameState, playerId: string, bid: number): void {
  const player = state.players.find(p => p.id === playerId);
  if (player) {
    player.bid = Math.max(0, Math.min(bid, player.hand.length));
  }

  // Check if all players bid
  if (state.players.every(p => p.bid !== null)) {
    state.allPlayersBid = true;
    state.phase = 'PLAYING';
    state.currentTrick = { leadSuit: 'SPADE', cards: [] };
  }
}

export function playCard(state: GameState, playerId: string, card: Card): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;

  const cardIndex = player.hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
  if (cardIndex === -1) return false;

  // Validate play
  if (state.currentTrick.cards.length === 0) {
    // First card sets the lead suit
    if (card.suit !== 'SPADE' || state.spadesBroken) {
      state.currentTrick.leadSuit = card.suit;
    } else if (card.suit === 'SPADE' && !state.spadesBroken && !canOnlyPlaySpades(player)) {
      return false; // Can't lead spades unless broken
    }
  } else {
    // Must follow suit if possible
    const mustFollowSuit = player.hand.some(c => c.suit === state.currentTrick.leadSuit);
    if (mustFollowSuit && card.suit !== state.currentTrick.leadSuit) {
      return false;
    }
  }

  if (card.suit === 'SPADE') {
    state.spadesBroken = true;
  }

  state.currentTrick.cards.push({ playerId, card });
  player.hand.splice(cardIndex, 1);

  // Check if trick is complete
  if (state.currentTrick.cards.length === 4) {
    resolveTrick(state);
  }

  return true;
}

export function canOnlyPlaySpades(player: any): boolean {
  return player.hand.every((card: Card) => card.suit === 'SPADE');
}

export function resolveTrick(state: GameState): void {
  const leadSuit = state.currentTrick.leadSuit;
  let highestCard = state.currentTrick.cards[0];
  let hasSpade = state.currentTrick.cards.some(c => c.card.suit === 'SPADE');

  for (const play of state.currentTrick.cards) {
    if (hasSpade && play.card.suit === 'SPADE') {
      if (RANK_VALUES[play.card.rank] > RANK_VALUES[highestCard.card.rank]) {
        highestCard = play;
      }
    } else if (!hasSpade && play.card.suit === leadSuit) {
      if (RANK_VALUES[play.card.rank] > RANK_VALUES[highestCard.card.rank]) {
        highestCard = play;
      }
    }
  }

  const winner = state.players.find(p => p.id === highestCard.playerId);
  if (winner) {
    winner.tricksTaken += 1;
    state.currentTrick.winner = winner.id;
  }

  state.trickHistory.push(state.currentTrick);
  state.activePlayerIndex = state.players.findIndex(p => p.id === highestCard.playerId);
  state.currentTrick = { leadSuit: 'SPADE', cards: [] };

  // Check if round is over
  if (state.trickHistory.length === 13) {
    endRound(state);
  }
}

export function endRound(state: GameState): void {
  // Calculate scores
  for (const player of state.players) {
    if (!player.bid) return;

    const team = player.team;
    const score = team === 'TEAM_A' ? state.teamAScore : state.teamBScore;

    if (player.tricksTaken >= player.bid) {
      score.tricks += player.bid * 10;
      score.bags += player.tricksTaken - player.bid;
    } else {
      score.tricks -= player.bid * 10;
    }

    score.score = score.tricks + (score.bags % 10 > 0 ? 1 : 0);

    if (score.bags >= 10) {
      score.bags -= 10;
      score.score -= 100;
    }
  }

  // Check if game is over
  const MAX_SCORE = 500;
  if (state.teamAScore.score >= MAX_SCORE || state.teamBScore.score >= MAX_SCORE) {
    state.phase = 'GAME_OVER';
    if (state.teamAScore.score > state.teamBScore.score) {
      state.winner = state.players.find(p => p.team === 'TEAM_A')?.id;
    } else {
      state.winner = state.players.find(p => p.team === 'TEAM_B')?.id;
    }
  } else {
    setupSpades(state);
  }
}

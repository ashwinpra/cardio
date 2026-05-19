import { describe, it, expect } from 'vitest';
import { handleAction } from './spades';
import { setupSpades } from '../../src/games/spades/logic';
import type { GameState, Player } from '../../src/games/spades/types';

function makePlayer(id: string, name: string): Player {
  return { id, name, hand: [], bid: null, tricksTaken: 0, bags: 0, team: 'TEAM_A', isConnected: true } as any;
}

function makeLobbyState(players: Player[]): GameState {
  return {
    sessionId: 'TEST',
    gameType: 'SPADES',
    phase: 'LOBBY',
    players,
    activePlayerIndex: 0,
    deck: [],
    currentTrick: { leadSuit: 'SPADE', cards: [] },
    trickHistory: [],
    teamAScore: { tricks: 0, bags: 0, score: 0 },
    teamBScore: { tricks: 0, bags: 0, score: 0 },
    allPlayersBid: false,
    spadesBroken: false,
    moveLog: [],
    lastMove: null,
  } as any;
}

describe('Spades Server Handler Tests', () => {
  const P1 = makePlayer('p1', 'Alice');
  const P2 = makePlayer('p2', 'Bob');
  const P3 = makePlayer('p3', 'Carol');
  const P4 = makePlayer('p4', 'Dave');
  
  const broadcastMock = () => {};

  describe('START_GAME', () => {
    it('starts game with exactly 4 players', () => {
      const state = makeLobbyState([P1, P2, P3, P4]);
      const result = handleAction(state, { type: 'START_GAME' });
      expect(result.error).toBeUndefined();
      expect(result.state?.phase).toBe('BIDDING');
    });

    it('rejects start with less than 4 players', () => {
      const state = makeLobbyState([P1, P2, P3]);
      const result = handleAction(state, { type: 'START_GAME' });
      expect(result.error).toMatch(/Spades requires exactly 4 players/);
    });
  });

  describe('GAME_ACTION', () => {
    it('rejects action if not active player', () => {
      let state = setupSpades(makeLobbyState([P1, P2, P3, P4]));
      state.activePlayerIndex = 1; // Bob's turn
      
      const result = handleAction(state, { type: 'PLACE_BID', actorId: 'p1', bid: 3 });
      expect(result.error).toMatch(/Not your turn/);
    });

    it('handles PLACE_BID', () => {
      let state = JSON.parse(JSON.stringify(setupSpades(makeLobbyState([P1, P2, P3, P4]))));
      
      const result = handleAction(state, { type: 'PLACE_BID', actorId: 'p1', bid: 3 });
      expect(result.error).toBeUndefined();
      expect(result.state?.players[0].bid).toBe(3);
    });

    it('handles PLAY_CARD', () => {
      let state = JSON.parse(JSON.stringify(setupSpades(makeLobbyState([P1, P2, P3, P4]))));
      state.phase = 'PLAYING';
      state.currentTrick = { leadSuit: null, cards: [] };
      state.players[0].hand[0] = { suit: 'CLUB', rank: 'A' };
      
      const result = handleAction(state, { type: 'PLAY_CARD', actorId: 'p1', card: { suit: 'CLUB', rank: 'A' } });
      expect(result.error).toBeUndefined();
      expect(result.state?.currentTrick?.cards.length).toBe(1);
    });
  });
});

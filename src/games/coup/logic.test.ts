import { describe, it, expect } from 'vitest';
import {
  createDeck,
  setupCoup,
  handleBasicAction,
  getRequiredRole,
  isBlockable,
  getBlockingRoles,
} from './logic';
import type { GameState, Player } from './types';

function makePlayer(id: string, name: string): Player {
  return { id, name, coins: 0, influences: [], isConnected: true, seatIndex: 0, team: 'TEAM_A' };
}

function makeLobbyState(players: Player[]): GameState {
  return {
    sessionId: 'TEST',
    gameType: 'COUP',
    phase: 'LOBBY',
    players,
    activePlayerIndex: 0,
    deck: [],
    moveLog: [],
    lastMove: null,
    pendingAction: null,
  };
}

const P1 = makePlayer('p1', 'Alice');
const P2 = makePlayer('p2', 'Bob');
const P3 = makePlayer('p3', 'Carol');

describe('Coup Logic Tests', () => {
  describe('createDeck', () => {
    it('creates a deck with 10 cards for 3 players (2 of each)', () => {
      const deck = createDeck(3);
      expect(deck).toHaveLength(10);
      const dukes = deck.filter((r) => r === 'DUKE');
      expect(dukes).toHaveLength(2);
    });

    it('creates a deck with 15 cards for 4 players (3 of each)', () => {
      const deck = createDeck(4);
      expect(deck).toHaveLength(15);
      const dukes = deck.filter((r) => r === 'DUKE');
      expect(dukes).toHaveLength(3);
    });

    it('creates a deck with 20 cards for 5+ players (4 of each)', () => {
      const deck = createDeck(5);
      expect(deck).toHaveLength(20);
      const assassins = deck.filter((r) => r === 'ASSASSIN');
      expect(assassins).toHaveLength(4);
    });
  });

  describe('setupCoup', () => {
    it('initializes game state correctly', () => {
      const state = setupCoup(makeLobbyState([P1, P2, P3]));
      expect(state.phase).toBe('PLAYING');
      for (const p of state.players) {
        expect(p.coins).toBe(2);
        expect(p.influences).toHaveLength(2);
        expect(p.influences![0].isRevealed).toBe(false);
      }
      expect(state.deck).toHaveLength(4); // 10 - 6 = 4
      expect(state.activePlayerIndex).toBe(0);
    });
  });

  describe('handleBasicAction', () => {
    it('handles INCOME correctly', () => {
      const state = setupCoup(makeLobbyState([P1, P2, P3]));
      const nextState = handleBasicAction(state, 'p1', 'INCOME');
      expect(nextState.players[0].coins).toBe(3);
      expect(nextState.activePlayerIndex).toBe(1);
    });



    it('handles COUP correctly', () => {
      const state = setupCoup(makeLobbyState([P1, P2, P3]));
      state.players[0].coins = 7;
      const nextState = handleBasicAction(state, 'p1', 'COUP', 'p2');
      expect(nextState.players[0].coins).toBe(0);
      expect(nextState.phase).toBe('SELECT_INFLUENCE_TO_LOSE');
      expect(nextState.loserId).toBe('p2');
    });

    it('rejects COUP if not enough coins', () => {
      const state = setupCoup(makeLobbyState([P1, P2, P3]));
      state.players[0].coins = 6;
      const nextState = handleBasicAction(state, 'p1', 'COUP', 'p2');
      expect(nextState.players[0].coins).toBe(6);
      expect(nextState.phase).toBe('PLAYING');
    });
  });

  describe('Role Helpers', () => {
    it('returns correct required roles', () => {
      expect(getRequiredRole('TAX')).toBe('DUKE');
      expect(getRequiredRole('ASSASSINATE')).toBe('ASSASSIN');
      expect(getRequiredRole('INCOME')).toBe('');
    });

    it('identifies blockable actions', () => {
      expect(isBlockable('FOREIGN_AID')).toBe(true);
      expect(isBlockable('INCOME')).toBe(false);
      expect(isBlockable('COUP')).toBe(false);
      expect(isBlockable('ASSASSINATE')).toBe(true);
    });

    it('identifies blocking roles', () => {
      expect(getBlockingRoles('FOREIGN_AID')).toContain('DUKE');
      expect(getBlockingRoles('STEAL')).toContain('CAPTAIN');
      expect(getBlockingRoles('STEAL')).toContain('AMBASSADOR');
    });
  });
});

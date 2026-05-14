import { describe, it, expect } from 'vitest';
import {
  setupSecretHitler,
  canNominateChancellor,
  passPresident,
  countJa,
  enactPolicy,
  topDeckChaosPolicy,
  hitlerElectedAsChancellor,
  getAliveCount
} from './logic';
import type { SecretHitlerState, SecretHitlerPlayer } from './types';

function makePlayer(id: string, name: string): SecretHitlerPlayer {
  return { id, name, isAlive: true, role: 'LIBERAL', partyMembership: 'LIBERAL', isConnected: true };
}

function makeLobbyState(players: SecretHitlerPlayer[]): SecretHitlerState {
  return {
    sessionId: 'TEST',
    gameType: 'SECRET_HITLER',
    phase: 'LOBBY',
    players,
    drawPile: [],
    discardPile: [],
    liberalPolicies: 0,
    fascistPolicies: 0,
    electionTracker: 0,
    presidentId: null,
    nominatedChancellorId: null,
    chancellorId: null,
    previousPresidentId: null,
    previousChancellorId: null,
    presidentCards: [],
    chancellorCards: [],
    vetoRequested: false,
    votes: {},
    executiveAction: null,
    policyPeek: null,
    specialElectionReturnIndex: null,
    moveLog: [],
    lastMove: null,
  };
}

describe('Secret Hitler Logic Tests', () => {
  const players = [
    makePlayer('p1', 'Alice'),
    makePlayer('p2', 'Bob'),
    makePlayer('p3', 'Carol'),
    makePlayer('p4', 'Dave'),
    makePlayer('p5', 'Eve'),
  ];

  describe('setupSecretHitler', () => {
    it('initializes game for 5 players', () => {
      const state = setupSecretHitler(makeLobbyState(players));
      expect(state.phase).toBe('NOMINATE_CHANCELLOR');
      expect(state.drawPile).toHaveLength(17);
      expect(state.players.filter(p => p.role === 'FASCIST')).toHaveLength(1);
      expect(state.players.filter(p => p.role === 'HITLER')).toHaveLength(1);
      expect(state.players.filter(p => p.role === 'LIBERAL')).toHaveLength(3);
      expect(state.presidentId).toBe('p1');
    });
  });

  describe('canNominateChancellor', () => {
    it('allows valid nomination', () => {
      const state = setupSecretHitler(makeLobbyState(players));
      expect(canNominateChancellor(state, 'p1', 'p2')).toBeNull();
    });

    it('rejects self nomination', () => {
      const state = setupSecretHitler(makeLobbyState(players));
      expect(canNominateChancellor(state, 'p1', 'p1')).toContain('President cannot nominate themselves');
    });

    it('rejects previous chancellor', () => {
      const state = setupSecretHitler(makeLobbyState(players));
      state.previousChancellorId = 'p2';
      expect(canNominateChancellor(state, 'p1', 'p2')).toContain('Cannot nominate previous chancellor');
    });
  });

  describe('passPresident', () => {
    it('passes to next alive player', () => {
      const state = setupSecretHitler(makeLobbyState(players));
      const next = passPresident(state);
      expect(next.presidentId).toBe('p2');
    });
    
    it('skips dead players', () => {
      const state = setupSecretHitler(makeLobbyState(players));
      state.players[1].isAlive = false; // Bob is dead
      const next = passPresident(state);
      expect(next.presidentId).toBe('p3');
    });
  });

  describe('enactPolicy', () => {
    it('increases liberal policies and checks win', () => {
      const state = setupSecretHitler(makeLobbyState(players));
      state.liberalPolicies = 4;
      const next = enactPolicy(state, 'LIBERAL');
      expect(next.liberalPolicies).toBe(5);
      expect(next.phase).toBe('GAME_OVER');
      expect(next.winner).toBe('LIBERAL');
    });

    it('increases fascist policies and checks win', () => {
      const state = setupSecretHitler(makeLobbyState(players));
      state.fascistPolicies = 5;
      const next = enactPolicy(state, 'FASCIST');
      expect(next.fascistPolicies).toBe(6);
      expect(next.phase).toBe('GAME_OVER');
      expect(next.winner).toBe('FASCIST');
    });
  });
});

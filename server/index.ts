import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import * as LiteratureHandler from './games/literature.js';
import * as CoupHandler from './games/coup.js';
import * as SecretHitlerHandler from './games/secretHitler.js';
import * as HanabiHandler from './games/hanabi.js';
import * as LoveLetterHandler from './games/love_letter.js';
import * as SpadesHandler from './games/spades.js';
import type { GameState as LiteratureState } from '../src/games/literature/types.js';
import type { GameState as CoupState } from '../src/games/coup/types.js';
import type { SecretHitlerState } from '../src/games/secretHitler/types.js';
import type { BaseGameState, GameType } from '../src/shared/types.js';

type GameStateUnion = LiteratureState | CoupState | SecretHitlerState | BaseGameState;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

const PORT = process.env.PORT || 3001;

// ─── Constants ───────────────────────────────────────────
const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;
const SESSION_CLEANUP_DELAY_MS = 120_000; // 2 minutes after last client leaves

const MAX_PLAYERS: Record<string, number> = {
  LITERATURE: 8,
  COUP: 6,
  SECRET_HITLER: 10,
  HANABI: 5,
  LOVE_LETTER: 4,
  SPADES: 4,
};

// ─── Types ───────────────────────────────────────────────
interface Session {
  clients: Map<WebSocket, string>; // ws -> playerId
  state: GameStateUnion;
  gameType: GameType;
  hostPlayerId: string | null; // first player to join is host
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

// Track which WS is alive for heartbeat
const wsAliveMap = new WeakMap<WebSocket, boolean>();

const sessions: Record<string, Session> = {};

// ─── Helpers ─────────────────────────────────────────────

function generateSessionId(): string {
  let id: string;
  do {
    id = crypto.randomBytes(2).toString('hex').toUpperCase();
  } while (sessions[id]);
  return id;
}

function broadcastState(sessionId: string) {
  const session = sessions[sessionId];
  if (!session) return;
  
  for (const [client, playerId] of session.clients.entries()) {
    if (client.readyState === WebSocket.OPEN) {
      const sanitized = sanitizeStateForPlayer(session.state, playerId);
      client.send(JSON.stringify({ 
        type: 'STATE_UPDATE', 
        state: sanitized, 
        yourPlayerId: playerId,
        gameType: session.gameType 
      }));
    }
  }
}

/** Mark a player as connected/disconnected in game state */
function setPlayerConnected(session: Session, playerId: string, connected: boolean) {
  const player = session.state.players.find((p: any) => p.id === playerId);
  if (player) {
    (player as any).isConnected = connected;
  }
}

/** Check if any WS in the session is bound to this playerId and is still OPEN */
function isPlayerConnectedViaAnotherSocket(session: Session, playerId: string, excludeWs: WebSocket): boolean {
  for (const [ws, pid] of session.clients.entries()) {
    if (pid === playerId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      return true;
    }
  }
  return false;
}

/** Clean up dead/stale WebSocket entries from session clients */
function pruneDeadClients(session: Session) {
  const toDelete: WebSocket[] = [];
  for (const [ws] of session.clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
      toDelete.push(ws);
    }
  }
  for (const ws of toDelete) {
    session.clients.delete(ws);
  }
}

function sanitizeStateForPlayer(state: GameStateUnion, playerId: string): GameStateUnion {
  if (state.gameType === 'LITERATURE') {
    const cardCounts: Record<string, number> = {};
    for (const [id, hand] of Object.entries(state.hands || {})) {
      cardCounts[id] = (hand as any[]).length;
    }
    return {
      ...state,
      hands: { [playerId]: state.hands[playerId] || [] },
      cardCounts,
    };
  }
  
  if (state.gameType === 'COUP') {
    const players = state.players.map((p: any) => ({
      ...p,
      influences: (!p.influences || p.id === playerId)
        ? p.influences 
        : p.influences.map((i: any) => i.isRevealed ? i : { role: 'HIDDEN', isRevealed: false })
    }));
    return { ...state, players };
  }

  if (state.gameType === 'SECRET_HITLER') {
    const me = state.players.find((p: any) => p.id === playerId);
    const visiblePlayers = state.players.map((p: any) => ({
      ...p,
      role: p.id === playerId ? p.role : undefined,
      partyMembership: p.id === playerId ? p.partyMembership : undefined,
    }));

    const fascists = state.players.filter((p: any) => p.role === 'FASCIST');
    const hitler = state.players.find((p: any) => p.role === 'HITLER');
    if (me?.role === 'FASCIST') {
      for (const other of fascists) {
        const target = visiblePlayers.find((p: any) => p.id === other.id);
        if (target) target.role = other.role;
      }
      if (hitler) {
        const target = visiblePlayers.find((p: any) => p.id === hitler.id);
        if (target) target.role = 'HITLER';
      }
    } else if (me?.role === 'HITLER') {
      for (const fascist of fascists) {
        const target = visiblePlayers.find((p: any) => p.id === fascist.id);
        if (target) target.role = 'FASCIST';
      }
    }

    return {
      ...state,
      players: visiblePlayers,
      presidentCards: me?.id === state.presidentId ? state.presidentCards : [],
      chancellorCards: me?.id === state.nominatedChancellorId ? state.chancellorCards : [],
      policyPeek: me?.id === state.presidentId && state.executiveAction === 'POLICY_PEEK' ? state.policyPeek : null,
    };
  }

  return state;
}

function createEmptyState(sessionId: string, gameType: GameType): GameStateUnion {
  const base = {
    sessionId,
    gameType,
    phase: 'LOBBY',
    players: [],
    activePlayerIndex: 0,
    lastMove: null,
    moveLog: [],
  };

  if (gameType === 'LITERATURE') {
    return {
      ...base,
      hands: {},
      books: [],
      houseRules: {
        mandatory_declaration: false,
        announce_one_card: false,
        high_book_double: false,
        claim_any_turn: false,
        claim_passes_turn: false,
      },
      scores: { teamA: 0, teamB: 0 },
    };
  }

  if (gameType === 'COUP') {
    return {
      ...base,
      deck: [],
      pendingAction: null,
    };
  }

  if (gameType === 'SECRET_HITLER') {
    return {
      ...base,
      drawPile: [],
      discardPile: [],
      electionTracker: 0,
      liberalPolicies: 0,
      fascistPolicies: 0,
      presidentId: null,
      nominatedChancellorId: null,
      chancellorId: null,
      previousPresidentId: null,
      previousChancellorId: null,
      presidentCards: [],
      chancellorCards: [],
      votes: {},
      vetoRequested: false,
      executiveAction: null,
      policyPeek: null,
      specialElectionReturnIndex: null,
      winner: null,
      winnerReason: null,
      investigateResults: {},
    };
  }

  if (gameType === 'HANABI') {
    return {
      ...base,
      deck: [],
      playArea: { RED: 0, BLUE: 0, GREEN: 0, YELLOW: 0, WHITE: 0 },
      discardPile: [],
      hintTokens: 8,
      mistakeTokens: 0,
      score: 0,
    };
  }

  if (gameType === 'LOVE_LETTER') {
    return {
      ...base,
      deck: [],
      discardPile: [],
      eliminatedThisRound: [],
      currentRound: 1,
      handmaidProtection: null,
    };
  }

  if (gameType === 'SPADES') {
    return {
      ...base,
      deck: [],
      currentTrick: { leadSuit: 'SPADE', cards: [] },
      trickHistory: [],
      teamAScore: { tricks: 0, bags: 0, score: 0 },
      teamBScore: { tricks: 0, bags: 0, score: 0 },
      allPlayersBid: false,
      spadesBroken: false,
    };
  }

  return base;
}

// ─── Heartbeat ───────────────────────────────────────────
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (wsAliveMap.get(ws) === false) {
      // Missed the last pong — terminate
      console.log('Terminating unresponsive WebSocket');
      ws.terminate();
      return;
    }
    wsAliveMap.set(ws, false);
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => clearInterval(heartbeatInterval));

// ─── Connection Handler ──────────────────────────────────
wss.on('connection', (ws) => {
  console.log('Client connected');
  wsAliveMap.set(ws, true);
  let currentSessionId: string | null = null;
  let myPlayerId: string | null = null;

  ws.on('pong', () => {
    wsAliveMap.set(ws, true);
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      console.log('Received:', data.type);

      const session = currentSessionId ? sessions[currentSessionId] : null;

      switch (data.type) {
        case 'CREATE_SESSION': {
          const gameType = data.gameType || 'LITERATURE';
          const sessionId = generateSessionId();
          sessions[sessionId] = {
            clients: new Map([[ws, '']]),
            state: createEmptyState(sessionId, gameType),
            gameType,
            hostPlayerId: null,
            cleanupTimer: null,
          };
          currentSessionId = sessionId;
          ws.send(JSON.stringify({ type: 'SESSION_CREATED', sessionId, gameType }));
          break;
        }

        case 'JOIN_SESSION': {
          const sid = data.sessionId as string;
          if (!sessions[sid]) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Session not found' }));
            break;
          }

          // Cancel any pending cleanup if someone is reconnecting
          const targetSession = sessions[sid];
          if (targetSession.cleanupTimer) {
            clearTimeout(targetSession.cleanupTimer);
            targetSession.cleanupTimer = null;
          }

          targetSession.clients.set(ws, '');
          currentSessionId = sid;
          ws.send(JSON.stringify({ 
            type: 'SESSION_JOINED', 
            sessionId: sid, 
            gameType: targetSession.gameType 
          }));
          broadcastState(sid);
          break;
        }

        case 'JOIN_LOBBY': {
          if (!session || !currentSessionId) break;
          const player = data.player;

          // ── Validate player name ──
          const trimmedName = (player.name || '').trim();
          if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 20) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Name must be 1–20 characters.' }));
            break;
          }

          const existingPlayer = session.state.players.find((p: any) => p.id === player.id);
          
          if (existingPlayer) {
            // ── Reconnecting player ──
            // Close any old sockets bound to this player
            for (const [oldWs, oldPid] of session.clients.entries()) {
              if (oldPid === player.id && oldWs !== ws) {
                session.clients.delete(oldWs);
                try { oldWs.close(4001, 'Replaced by new connection'); } catch {}
              }
            }
            session.clients.set(ws, player.id);
            myPlayerId = player.id;
            setPlayerConnected(session, player.id, true);
            console.log(`Player ${existingPlayer.name} (${player.id}) reconnected to session ${currentSessionId}`);
          } else {
            // ── New player joining ──
            if (session.state.phase !== 'LOBBY') {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Game already in progress' }));
              break;
            }

            // Enforce max players
            const maxPlayers = MAX_PLAYERS[session.gameType] || 10;
            if (session.state.players.length >= maxPlayers) {
              ws.send(JSON.stringify({ type: 'ERROR', message: `Lobby is full (${maxPlayers} players max).` }));
              break;
            }

            // Reject duplicate names (case-insensitive)
            const nameLower = trimmedName.toLowerCase();
            if (session.state.players.some((p: any) => p.name.toLowerCase() === nameLower)) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'That name is already taken.' }));
              break;
            }

            // Check if someone with this exact player.id already exists (shouldn't happen, but guard)
            if (session.state.players.some((p: any) => p.id === player.id)) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Player ID collision. Please refresh and try again.' }));
              break;
            }

            session.state.players.push({ ...player, name: trimmedName, isConnected: true });
            session.clients.set(ws, player.id);
            myPlayerId = player.id;

            // First player to join becomes host
            if (!session.hostPlayerId) {
              session.hostPlayerId = player.id;
            }
          }
          broadcastState(currentSessionId!);
          break;
        }

        case 'START_GAME':
        case 'ASK_CARD':
        case 'CLAIM_BOOK':
        case 'COUP_ACTION':
        case 'SECRET_HITLER_ACTION':
        case 'GAME_ACTION': {
          if (!session || !currentSessionId) break;

          const dispatch = (actionData: any, sendError: boolean = false) => {
            if (!session || !currentSessionId) return;
            let result: { state?: any; error?: string } = {};

            if (session.gameType === 'LITERATURE') {
              result = LiteratureHandler.handleAction(session.state as any, actionData);
            } else if (session.gameType === 'COUP') {
              result = CoupHandler.handleAction(session.state as any, actionData, broadcastState, dispatch);
            } else if (session.gameType === 'SECRET_HITLER') {
              result = SecretHitlerHandler.handleAction(session.state as any, actionData);
            } else if (session.gameType === 'HANABI') {
              result = HanabiHandler.handleAction(session.state as any, actionData, broadcastState);
            } else if (session.gameType === 'LOVE_LETTER') {
              result = LoveLetterHandler.handleAction(session.state as any, actionData, broadcastState);
            } else if (session.gameType === 'SPADES') {
              result = SpadesHandler.handleAction(session.state as any, actionData, broadcastState);
            }

            if (result.error && sendError) {
              ws.send(JSON.stringify({ type: 'ERROR', message: result.error }));
            } else if (result.state) {
              session.state = result.state;
              broadcastState(currentSessionId);
            }
          };

          if (data.type === 'START_GAME') {
            if (session.hostPlayerId && myPlayerId !== session.hostPlayerId) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Only the host can start the game.' }));
              break;
            }
          }

          dispatch({ ...data, actorId: myPlayerId }, true);
          break;
        }


      }
    } catch (e) {
      console.error('Message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentSessionId && sessions[currentSessionId]) {
      const session = sessions[currentSessionId];
      const disconnectedPlayerId = session.clients.get(ws) || null;
      session.clients.delete(ws);

      // Mark player as disconnected (if not connected via another socket)
      if (disconnectedPlayerId && !isPlayerConnectedViaAnotherSocket(session, disconnectedPlayerId, ws)) {
        setPlayerConnected(session, disconnectedPlayerId, false);
        broadcastState(currentSessionId);
      }

      // Prune any other dead clients
      pruneDeadClients(session);

      // Schedule cleanup if no one is left
      if (session.clients.size === 0) {
        const sid = currentSessionId;
        session.cleanupTimer = setTimeout(() => {
          if (sessions[sid] && sessions[sid].clients.size === 0) {
            console.log(`Cleaning up abandoned session ${sid}`);
            delete sessions[sid];
          }
        }, SESSION_CLEANUP_DELAY_MS);
      }
    }
  });
});

app.get('/ping', (_req, res) => { res.send('pong'); });
app.use(express.static(path.join(__dirname, '../dist')));
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`Cardio server listening on port ${PORT}`);
});

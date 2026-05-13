import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import * as LiteratureHandler from './games/literature.js';
import * as CoupHandler from './games/coup.js';
import * as SecretHitlerHandler from './games/secretHitler.js';
import type { BaseGameState as GameState, GameType } from '../src/shared/types.js';

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

interface Session {
  clients: Map<WebSocket, string>; // ws -> playerId
  state: GameState;
  gameType: GameType;
}

const sessions: Record<string, Session> = {};

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

function sanitizeStateForPlayer(state: any, playerId: string): any {
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

function createEmptyState(sessionId: string, gameType: GameType): any {
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

  return base;
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  let currentSessionId: string | null = null;
  let myPlayerId: string | null = null;

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
          sessions[sid].clients.set(ws, '');
          currentSessionId = sid;
          ws.send(JSON.stringify({ 
            type: 'SESSION_JOINED', 
            sessionId: sid, 
            gameType: sessions[sid].gameType 
          }));
          broadcastState(sid);
          break;
        }

        case 'JOIN_LOBBY': {
          if (!session) break;
          const player = data.player;
          const existingPlayer = session.state.players.find((p: any) => p.id === player.id);
          
          if (existingPlayer) {
            // Player is rejoining or already exists
            session.clients.set(ws, player.id);
            myPlayerId = player.id;
            console.log(`Player ${player.name} (${player.id}) re-associated with session ${currentSessionId}`);
          } else {
            // New player joining - only allow if game hasn't started
            if (session.state.phase !== 'LOBBY') {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Game already in progress' }));
              break;
            }
            session.state.players.push(player);
            session.clients.set(ws, player.id);
            myPlayerId = player.id;
          }
          broadcastState(currentSessionId!);
          break;
        }

        case 'START_GAME':
        case 'ASK_CARD':
        case 'CLAIM_BOOK':
        case 'COUP_ACTION':
        case 'SECRET_HITLER_ACTION': {
          if (!session || !currentSessionId) break;
          
          let result: { state?: any; error?: string } = {};
          const actionData = { ...data, actorId: myPlayerId };

          if (session.gameType === 'LITERATURE') {
            result = LiteratureHandler.handleAction(session.state, actionData);
          } else if (session.gameType === 'COUP') {
            result = CoupHandler.handleAction(session.state, actionData, broadcastState);
          } else if (session.gameType === 'SECRET_HITLER') {
            result = SecretHitlerHandler.handleAction(session.state, actionData);
          }

          if (result.error) {
            ws.send(JSON.stringify({ type: 'ERROR', message: result.error }));
          } else if (result.state) {
            session.state = result.state;
            broadcastState(currentSessionId);
          }
          break;
        }
      }
    } catch (e) {
      console.error('Message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentSessionId && sessions[currentSessionId]) {
      sessions[currentSessionId].clients.delete(ws);
      if (sessions[currentSessionId].clients.size === 0) {
        const sid = currentSessionId;
        setTimeout(() => {
          if (sessions[sid] && sessions[sid].clients.size === 0) {
            delete sessions[sid];
          }
        }, 60000);
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

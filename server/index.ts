import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "./db.js";
import * as LiteratureHandler from "./games/literature.js";
import * as CoupHandler from "./games/coup.js";
import * as SecretHitlerHandler from "./games/secretHitler.js";
import * as HanabiHandler from "./games/hanabi.js";
import * as LoveLetterHandler from "./games/love_letter.js";
import * as SpadesHandler from "./games/spades.js";
import type { GameState as LiteratureState } from "../src/games/literature/types.js";
import type { GameState as CoupState } from "../src/games/coup/types.js";
import type { SecretHitlerState } from "../src/games/secretHitler/types.js";
import type { GameState as HanabiState } from "../src/games/hanabi/types.js";
import type { GameState as LoveLetterState } from "../src/games/love_letter/types.js";
import type { GameState as SpadesState } from "../src/games/spades/types.js";
import type { BaseGameState, GameType, Move } from "../src/shared/types.js";

type GameStateUnion =
  | LiteratureState
  | CoupState
  | SecretHitlerState
  | HanabiState
  | LoveLetterState
  | SpadesState
  | BaseGameState;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(
    request.url || "",
    `http://${request.headers.host}`,
  );
  if (pathname !== "/ws") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

const PORT = process.env.PORT || 3001;

// ─── Constants ───────────────────────────────────────────
const HEARTBEAT_INTERVAL_MS = 15_000;
const SESSION_CLEANUP_DELAY_MS = 120_000; // 2 minutes after last client leaves
const INACTIVITY_CHECK_INTERVAL_MS = 5_000;
const INACTIVITY_TIMEOUT_MS = 60_000;
const RATE_LIMIT_WINDOW_MS = 1_000;
const MAX_MESSAGES_PER_WINDOW = 20;
const MAX_WS_MESSAGE_BYTES = 64 * 1024;
const MAX_MOVE_LOG_ENTRIES = 50;

const MAX_PLAYERS: Record<string, number> = {
  LITERATURE: 8,
  COUP: 6,
  SECRET_HITLER: 10,
  HANABI: 5,
  LOVE_LETTER: 4,
  SPADES: 4,
};

const SUPPORTED_MESSAGE_TYPES = new Set([
  "CREATE_SESSION",
  "JOIN_SESSION",
  "JOIN_LOBBY",
  "START_GAME",
  "ASK_CARD",
  "CLAIM_BOOK",
  "COUP_ACTION",
  "SECRET_HITLER_ACTION",
  "PLACE_BID",
  "PLAY_CARD",
  "DISCARD_CARD",
  "GIVE_HINT",
  "MOVE_CARD",
  "GAME_ACTION",
  "HOST_ACTION",
] as const);

// ─── Types ───────────────────────────────────────────────
interface Session {
  clients: Map<WebSocket, string>; // ws -> playerId
  state: GameStateUnion;
  gameType: GameType;
  hostPlayerId: string | null; // first player to join is host
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  lastActionTimestamp: number;
}

interface ClientMessage {
  type: string;
  [key: string]: unknown;
}

// Track which WS is alive for heartbeat
const wsAliveMap = new WeakMap<WebSocket, boolean>();

const sessions: Record<string, Session> = {};

// Load persisted sessions on startup
const activeSessions = db.getAllSessions();
for (const s of activeSessions) {
  const state = s.state;
  if (state.players) {
    state.players.forEach((p: any) => (p.isConnected = false));
  }
  sessions[s.id] = {
    clients: new Map(),
    state: state,
    gameType: s.gameType as GameType,
    hostPlayerId: s.hostPlayerId,
    cleanupTimer: null,
    lastActionTimestamp: Date.now(),
  };
  ensureValidHost(sessions[s.id]);
}
console.log(`Loaded ${activeSessions.length} active sessions from DB.`);

// ─── Helpers ─────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidGameType(value: unknown): value is GameType {
  return typeof value === "string" && value in MAX_PLAYERS;
}

function isSupportedMessageType(value: string): boolean {
  return SUPPORTED_MESSAGE_TYPES.has(value as any);
}

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ERROR", message }));
  }
}

function capMoveLog(state: GameStateUnion): GameStateUnion {
  if (
    !Array.isArray(state.moveLog) ||
    state.moveLog.length <= MAX_MOVE_LOG_ENTRIES
  ) {
    return state;
  }

  return {
    ...state,
    moveLog: state.moveLog.slice(0, MAX_MOVE_LOG_ENTRIES),
  };
}

function createServerMove(
  details: string,
  playerName: string = "System",
): Move {
  return {
    type: "SYSTEM",
    timestamp: new Date().toISOString(),
    playerName,
    details,
    success: true,
  };
}

function prependServerMove(state: GameStateUnion, move: Move): GameStateUnion {
  return capMoveLog({
    ...state,
    lastMove: move,
    moveLog: [move, ...(state.moveLog ?? [])],
  });
}

function selectNextHostPlayerId(session: Session): string | null {
  const connectedPlayerIds = new Set<string>();
  for (const [client, playerId] of session.clients.entries()) {
    if (client.readyState === WebSocket.OPEN && playerId) {
      connectedPlayerIds.add(playerId);
    }
  }

  for (const player of session.state.players) {
    if (connectedPlayerIds.has(player.id) && player.isConnected !== false) {
      return player.id;
    }
  }

  return session.state.players[0]?.id ?? null;
}

function ensureValidHost(session: Session, previousHostId?: string | null) {
  const hostExists =
    !!session.hostPlayerId &&
    session.state.players.some((p) => p.id === session.hostPlayerId);
  if (hostExists && previousHostId === undefined) {
    return;
  }

  const shouldReassign =
    !hostExists ||
    (previousHostId !== undefined &&
      previousHostId !== null &&
      session.hostPlayerId === previousHostId);
  if (!shouldReassign) {
    return;
  }

  session.hostPlayerId = selectNextHostPlayerId(session);
}

function generateSessionId(): string {
  let id: string;
  let attempts = 0;
  do {
    if (attempts++ > 100)
      throw new Error("Could not generate unique session ID");
    id = crypto.randomBytes(2).toString("hex").toUpperCase();
  } while (sessions[id]);
  return id;
}

function broadcastState(sessionId: string) {
  const session = sessions[sessionId];
  if (!session) return;

  db.saveSession(
    sessionId,
    session.gameType,
    session.state,
    session.hostPlayerId,
  );

  for (const [client, playerId] of session.clients.entries()) {
    if (client.readyState === WebSocket.OPEN) {
      const sanitized = sanitizeStateForPlayer(session.state, playerId);
      client.send(
        JSON.stringify({
          type: "STATE_UPDATE",
          state: { ...sanitized, hostPlayerId: session.hostPlayerId },
          yourPlayerId: playerId,
          gameType: session.gameType,
        }),
      );
    }
  }
}

/** Mark a player as connected/disconnected in game state */
function setPlayerConnected(
  session: Session,
  playerId: string,
  connected: boolean,
) {
  session.state = {
    ...session.state,
    players: session.state.players.map((p: any) =>
      p.id === playerId ? { ...p, isConnected: connected } : p,
    ),
  };
}

/** Check if any WS in the session is bound to this playerId and is still OPEN */
function isPlayerConnectedViaAnotherSocket(
  session: Session,
  playerId: string,
  excludeWs: WebSocket,
): boolean {
  for (const [ws, pid] of session.clients.entries()) {
    if (
      pid === playerId &&
      ws !== excludeWs &&
      ws.readyState === WebSocket.OPEN
    ) {
      return true;
    }
  }
  return false;
}

/** Clean up dead/stale WebSocket entries from session clients */
function pruneDeadClients(session: Session) {
  const toDelete: WebSocket[] = [];
  for (const [ws] of session.clients.entries()) {
    if (
      ws.readyState !== WebSocket.OPEN &&
      ws.readyState !== WebSocket.CONNECTING
    ) {
      toDelete.push(ws);
    }
  }
  for (const ws of toDelete) {
    session.clients.delete(ws);
  }
}

function sanitizeStateForPlayer(
  state: GameStateUnion,
  playerId: string,
): GameStateUnion {
  if (state.gameType === "LITERATURE") {
    const cardCounts: Record<string, number> = {};
    for (const [id, hand] of Object.entries(state.hands || {})) {
      cardCounts[id] = (hand as any[]).length;
    }
    const { deck, ...rest } = state;
    return {
      ...rest,
      hands: { [playerId]: state.hands[playerId] || [] },
      cardCounts,
      playerCardCounts: cardCounts,
    } as any;
  }

  if (state.gameType === "COUP") {
    const players = state.players.map((p: any) => ({
      ...p,
      influences:
        !p.influences || p.id === playerId
          ? p.influences
          : p.influences.map((i: any) =>
              i.isRevealed ? i : { role: "HIDDEN", isRevealed: false },
            ),
    }));
    return { ...state, players };
  }

  if (state.gameType === "SECRET_HITLER") {
    const me = state.players.find((p: any) => p.id === playerId);
    const visiblePlayers = state.players.map((p: any) => ({
      ...p,
      role: p.id === playerId ? p.role : undefined,
      partyMembership: p.id === playerId ? p.partyMembership : undefined,
    }));

    const fascists = state.players.filter((p: any) => p.role === "FASCIST");
    const hitler = state.players.find((p: any) => p.role === "HITLER");
    if (me?.role === "FASCIST") {
      for (const other of fascists) {
        const target = visiblePlayers.find((p: any) => p.id === other.id);
        if (target) target.role = other.role;
      }
      if (hitler) {
        const target = visiblePlayers.find((p: any) => p.id === hitler.id);
        if (target) target.role = "HITLER";
      }
    } else if (me?.role === "HITLER") {
      const playerCount = state.players.length;
      if (playerCount <= 6) {
        for (const fascist of fascists) {
          const target = visiblePlayers.find((p: any) => p.id === fascist.id);
          if (target) target.role = "FASCIST";
        }
      }
    }

    return {
      ...state,
      players: visiblePlayers,
      presidentCards: me?.id === state.presidentId ? state.presidentCards : [],
      chancellorCards:
        me?.id === state.nominatedChancellorId ? state.chancellorCards : [],
      policyPeek:
        me?.id === state.presidentId && state.executiveAction === "POLICY_PEEK"
          ? state.policyPeek
          : null,
    };
  }

  if (state.gameType === "HANABI") {
    const me = state.players.find((p: any) => p.id === playerId);
    return {
      ...state,
      players: state.players.map((p: any) => ({
        ...p,
        // Hide hand from the player themselves
        hand:
          p.id === playerId
            ? p.hand.map((card: any) => ({
                id: card.id,
                color: "HIDDEN",
                rank: 0,
                hintedColor: card.hintedColor,
                hintedRank: card.hintedRank,
              }))
            : p.hand,
      })),
    };
  }

  if (state.gameType === "LOVE_LETTER") {
    return {
      ...state,
      deck: [], // Hide deck completely
      players: state.players.map((p: any) => ({
        ...p,
        hand:
          p.id === playerId
            ? p.hand
            : p.hand.map((card: any) => ({ role: "HIDDEN", value: 0 })),
      })),
      setAsideCard: state.setAsideCard ? { role: "HIDDEN", value: 0 } : null,
      priestPeeks: state.priestPeeks
        ? state.priestPeeks.filter((peek: any) => peek.viewerId === playerId)
        : [],
    };
  }

  if (state.gameType === "SPADES") {
    return {
      ...state,
      deck: [],
      players: state.players.map((p: any) => ({
        ...p,
        hand: p.id === playerId ? p.hand : [],
      })),
    };
  }

  return state;
}

function createEmptyState(
  sessionId: string,
  gameType: GameType,
): GameStateUnion {
  const base = {
    sessionId,
    gameType,
    phase: "LOBBY",
    players: [],
    activePlayerIndex: 0,
    lastMove: null,
    moveLog: [],
  };

  if (gameType === "LITERATURE") {
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

  if (gameType === "COUP") {
    return {
      ...base,
      deck: [],
      pendingAction: null,
    };
  }

  if (gameType === "SECRET_HITLER") {
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

  if (gameType === "HANABI") {
    return {
      ...base,
      deck: [],
      playArea: { RED: 0, BLUE: 0, GREEN: 0, YELLOW: 0, WHITE: 0 },
      discardPile: [],
      hintTokens: 8,
      mistakeTokens: 0,
      score: 0,
      turnsLeft: null,
    };
  }

  if (gameType === "LOVE_LETTER") {
    return {
      ...base,
      deck: [],
      setAsideCard: null,
      discardPile: [],
      eliminatedThisRound: [],
      currentRound: 1,
      handmaidProtections: [],
      priestPeeks: [],
    };
  }

  if (gameType === "SPADES") {
    return {
      ...base,
      deck: [],
      currentTrick: { leadSuit: "SPADE", cards: [] },
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
      console.log("Terminating unresponsive WebSocket");
      ws.terminate();
      return;
    }
    wsAliveMap.set(ws, false);
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on("close", () => clearInterval(heartbeatInterval));

// ─── Inactivity Timeout System ───────────────────────────
const inactivityInterval = setInterval(() => {
  const now = Date.now();
  for (const [sid, session] of Object.entries(sessions)) {
    if (session.state.phase !== "PLAYING") continue;
    if (!("activePlayerIndex" in session.state)) continue;
    if (session.clients.size === 0) continue;

    const activeIdx = (session.state as any).activePlayerIndex;
    if (activeIdx == null || !session.state.players[activeIdx]) continue;

    const lastAction = session.lastActionTimestamp || now;
    if (now - lastAction > INACTIVITY_TIMEOUT_MS) {
      session.state = prependServerMove(
        {
          ...session.state,
          activePlayerIndex: (activeIdx + 1) % session.state.players.length,
        },
        createServerMove("Turn auto-skipped due to inactivity."),
      );
      session.lastActionTimestamp = now;
      broadcastState(sid);
    }
  }
}, INACTIVITY_CHECK_INTERVAL_MS);

export { sanitizeStateForPlayer }; // Export for testing

wss.on("connection", (ws) => {
  console.log("Client connected");
  wsAliveMap.set(ws, true);
  let currentSessionId: string | null = null;
  let myPlayerId: string | null = null;

  let messageCount = 0;
  let windowStart = Date.now();

  ws.on("pong", () => {
    wsAliveMap.set(ws, true);
  });

  ws.on("message", (raw) => {
    const rawMessage = raw.toString();
    if (Buffer.byteLength(rawMessage, "utf8") > MAX_WS_MESSAGE_BYTES) {
      sendError(ws, "Payload too large.");
      ws.close(1009, "Payload too large");
      return;
    }

    const now = Date.now();
    if (now - windowStart >= RATE_LIMIT_WINDOW_MS) {
      messageCount = 1;
      windowStart = now;
    } else {
      messageCount++;
      if (messageCount > MAX_MESSAGES_PER_WINDOW) {
        sendError(ws, "Rate limit exceeded.");
        return;
      }
    }

    try {
      const parsed: unknown = JSON.parse(rawMessage);
      if (!isRecord(parsed) || typeof parsed.type !== "string") {
        sendError(ws, "Invalid message envelope.");
        return;
      }

      if (!isSupportedMessageType(parsed.type)) {
        sendError(ws, `Unsupported message type: ${parsed.type}`);
        return;
      }

      const data = parsed as ClientMessage;
      console.log("Received:", data.type);

      const session = currentSessionId ? sessions[currentSessionId] : null;

      switch (data.type) {
        case "CREATE_SESSION": {
          if (!isValidGameType(data.gameType)) {
            sendError(ws, "Invalid game type.");
            break;
          }

          const gameType = data.gameType;
          const sessionId = generateSessionId();
          sessions[sessionId] = {
            clients: new Map([[ws, ""]]),
            state: createEmptyState(sessionId, gameType),
            gameType,
            hostPlayerId: null,
            cleanupTimer: null,
            lastActionTimestamp: Date.now(),
          };
          currentSessionId = sessionId;
          ws.send(
            JSON.stringify({ type: "SESSION_CREATED", sessionId, gameType }),
          );
          broadcastState(sessionId);
          break;
        }

        case "JOIN_SESSION": {
          if (typeof data.sessionId !== "string") {
            sendError(ws, "Missing or invalid sessionId.");
            break;
          }

          const sid = data.sessionId.trim().toUpperCase();
          if (!/^[A-F0-9]{4}$/.test(sid)) {
            sendError(ws, "Invalid session code.");
            break;
          }

          if (!sessions[sid]) {
            const persisted = db.loadSession(sid);
            if (persisted) {
              const state = persisted.state;
              if (state.players) {
                state.players.forEach((p: any) => (p.isConnected = false));
              }
              sessions[sid] = {
                clients: new Map(),
                state: state,
                gameType: persisted.gameType as GameType,
                hostPlayerId: persisted.hostPlayerId,
                cleanupTimer: null,
                lastActionTimestamp: Date.now(),
              };
              ensureValidHost(sessions[sid]);
            } else {
              sendError(ws, "Session not found.");
              break;
            }
          }

          // Cancel any pending cleanup if someone is reconnecting
          const targetSession = sessions[sid];
          if (targetSession.cleanupTimer) {
            clearTimeout(targetSession.cleanupTimer);
            targetSession.cleanupTimer = null;
          }

          targetSession.clients.set(ws, "");
          ensureValidHost(targetSession);
          currentSessionId = sid;
          ws.send(
            JSON.stringify({
              type: "SESSION_JOINED",
              sessionId: sid,
              gameType: targetSession.gameType,
            }),
          );
          broadcastState(sid);
          break;
        }

        case "JOIN_LOBBY": {
          if (!session || !currentSessionId) {
            sendError(ws, "Join a session first.");
            break;
          }
          if (!isRecord(data.player)) {
            sendError(ws, "Invalid player payload.");
            break;
          }

          const player = data.player;
          if (typeof player.id !== "string" || typeof player.name !== "string") {
            sendError(ws, "Player id and name are required.");
            break;
          }
          if (player.id.length < 1 || player.id.length > 64) {
            sendError(ws, "Invalid player id.");
            break;
          }

          // ── Validate player name ──
          const trimmedName = (player.name || "").trim();
          if (
            !trimmedName ||
            trimmedName.length < 1 ||
            trimmedName.length > 20
          ) {
            sendError(ws, "Name must be 1–20 characters.");
            break;
          }

          const existingPlayer = session.state.players.find(
            (p: any) => p.id === player.id,
          );

          if (existingPlayer) {
            // ── Reconnecting player ──
            // Close any old sockets bound to this player
            for (const [oldWs, oldPid] of session.clients.entries()) {
              if (oldPid === player.id && oldWs !== ws) {
                session.clients.delete(oldWs);
                try {
                  oldWs.close(4001, "Replaced by new connection");
                } catch (closeError) {
                  console.error("Failed to close replaced socket:", closeError);
                }
              }
            }
            session.clients.set(ws, player.id);
            myPlayerId = player.id;
            setPlayerConnected(session, player.id, true);
            ensureValidHost(session);
            console.log(
              `Player ${existingPlayer.name} (${player.id}) reconnected to session ${currentSessionId}`,
            );
          } else {
            // ── New player joining ──
            if (session.state.phase !== "LOBBY") {
              sendError(ws, "Game already in progress.");
              break;
            }

            // Enforce max players
            const maxPlayers = MAX_PLAYERS[session.gameType] || 10;
            if (session.state.players.length >= maxPlayers) {
              sendError(ws, `Lobby is full (${maxPlayers} players max).`);
              break;
            }

            // Reject duplicate names (case-insensitive)
            const nameLower = trimmedName.toLowerCase();
            if (
              session.state.players.some(
                (p: any) => p.name.toLowerCase() === nameLower,
              )
            ) {
              sendError(ws, "That name is already taken.");
              break;
            }

            // Check if someone with this exact player.id already exists (shouldn't happen, but guard)
            if (session.state.players.some((p: any) => p.id === player.id)) {
              sendError(
                ws,
                "Player ID collision. Please refresh and try again.",
              );
              break;
            }

            const seatIndex =
              typeof player.seatIndex === "number"
                ? player.seatIndex
                : session.state.players.length;
            const team = player.team === "TEAM_B" ? "TEAM_B" : "TEAM_A";
            session.state = {
              ...session.state,
              players: [
                ...session.state.players,
                {
                  id: player.id,
                  name: trimmedName,
                  team,
                  seatIndex,
                  isConnected: true,
                },
              ],
            };
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

        case "START_GAME":
        case "ASK_CARD":
        case "CLAIM_BOOK":
        case "COUP_ACTION":
        case "SECRET_HITLER_ACTION":
        case "PLACE_BID":
        case "PLAY_CARD":
        case "DISCARD_CARD":
        case "GIVE_HINT":
        case "MOVE_CARD":
        case "GAME_ACTION": {
          if (!session || !currentSessionId) {
            sendError(ws, "Join a session first.");
            break;
          }
          if (!myPlayerId) {
            sendError(ws, "Join the lobby before sending actions.");
            break;
          }

          if (data.targetId !== undefined && typeof data.targetId !== "string") {
            sendError(ws, "Invalid targetId.");
            break;
          }
          if (data.actionType !== undefined && typeof data.actionType !== "string") {
            sendError(ws, "Invalid actionType.");
            break;
          }
          if (data.roleClaimed !== undefined && typeof data.roleClaimed !== "string") {
            sendError(ws, "Invalid roleClaimed.");
            break;
          }
          if (
            data.influenceIndex !== undefined &&
            typeof data.influenceIndex !== "number"
          ) {
            sendError(ws, "Invalid influenceIndex.");
            break;
          }

          const dispatch = (
            actionData: Record<string, unknown>,
            shouldSendError: boolean = false,
          ) => {
            const liveSession = currentSessionId
              ? sessions[currentSessionId]
              : null;
            if (!liveSession) return;
            let result: { state?: GameStateUnion; error?: string } = {};

            if (liveSession.gameType === "LITERATURE") {
              result = LiteratureHandler.handleAction(
                liveSession.state as any,
                actionData,
              );
            } else if (liveSession.gameType === "COUP") {
              result = CoupHandler.handleAction(
                liveSession.state as any,
                actionData,
                broadcastState,
                dispatch,
              );
            } else if (liveSession.gameType === "SECRET_HITLER") {
              result = SecretHitlerHandler.handleAction(
                liveSession.state as any,
                actionData,
              );
            } else if (liveSession.gameType === "HANABI") {
              result = HanabiHandler.handleAction(
                liveSession.state as any,
                actionData,
              );
            } else if (liveSession.gameType === "LOVE_LETTER") {
              result = LoveLetterHandler.handleAction(
                liveSession.state as any,
                actionData,
              );
            } else if (liveSession.gameType === "SPADES") {
              result = SpadesHandler.handleAction(
                liveSession.state as any,
                actionData,
              );
            }

            if (result.error && shouldSendError) {
              sendError(ws, result.error);
            } else if (result.state) {
              liveSession.state = capMoveLog(result.state);
              liveSession.lastActionTimestamp = Date.now();
              ensureValidHost(liveSession);
              broadcastState(currentSessionId!);
            }
          };

          if (data.type === "START_GAME") {
            if (session.hostPlayerId && myPlayerId !== session.hostPlayerId) {
              sendError(ws, "Only the host can start the game.");
              break;
            }
          }

          dispatch({ ...data, actorId: myPlayerId }, true);
          break;
        }

        case "HOST_ACTION": {
          if (!session || !currentSessionId) {
            sendError(ws, "Join a session first.");
            break;
          }
          if (myPlayerId !== session.hostPlayerId) {
            sendError(ws, "Only the host can perform administrative actions.");
            break;
          }
          if (typeof data.action !== "string") {
            sendError(ws, "Invalid host action.");
            break;
          }

          const action = data.action;
          if (action === "END_GAME") {
            db.deleteSession(currentSessionId);
            for (const clientWs of session.clients.keys()) {
              clientWs.send(
                JSON.stringify({
                  type: "ERROR",
                  message: "The host has ended the game.",
                }),
              );
              clientWs.close(1000, "Game ended by host");
            }
            delete sessions[currentSessionId];
          } else if (action === "KICK_PLAYER") {
            if (typeof data.targetId !== "string") {
              sendError(ws, "Invalid targetId.");
              break;
            }
            const targetId = data.targetId;
            if (targetId === myPlayerId) {
              sendError(ws, "Host cannot kick themselves.");
              break;
            }

            const removedIndex = session.state.players.findIndex(
              (p: any) => p.id === targetId,
            );
            if (removedIndex === -1) {
              sendError(ws, "Player not found.");
              break;
            }

            const nextPlayers = session.state.players.filter(
              (p: any) => p.id !== targetId,
            );
            let nextActivePlayerIndex = session.state.activePlayerIndex;
            if (nextPlayers.length === 0) {
              nextActivePlayerIndex = 0;
            } else if (removedIndex < nextActivePlayerIndex) {
              nextActivePlayerIndex -= 1;
            } else if (removedIndex === nextActivePlayerIndex) {
              nextActivePlayerIndex =
                nextActivePlayerIndex % nextPlayers.length;
            }
            session.state = {
              ...session.state,
              players: nextPlayers,
              activePlayerIndex: Math.max(nextActivePlayerIndex, 0),
            };

            // Disconnect the kicked player
            for (const [clientWs, pid] of session.clients.entries()) {
              if (pid === targetId) {
                clientWs.send(
                  JSON.stringify({
                    type: "ERROR",
                    message: "You have been kicked by the host.",
                  }),
                );
                clientWs.close(1000, "Kicked by host");
                session.clients.delete(clientWs);
              }
            }

            ensureValidHost(session, targetId);
            session.state = prependServerMove(
              session.state,
              createServerMove("Host removed a player from the session.", "Host"),
            );
            session.lastActionTimestamp = Date.now();
            broadcastState(currentSessionId);
          } else if (action === "FORCE_SKIP") {
            if (
              "activePlayerIndex" in session.state &&
              session.state.players.length > 0
            ) {
              const currentIdx = session.state.activePlayerIndex;
              session.state = prependServerMove(
                {
                  ...session.state,
                  activePlayerIndex:
                    (currentIdx + 1) % session.state.players.length,
                },
                createServerMove("Host forced a turn skip.", "Host"),
              );
              session.lastActionTimestamp = Date.now();
              broadcastState(currentSessionId);
            }
          } else if (action === "REASSIGN_SEAT") {
            sendError(
              ws,
              "Seat reassignment is disabled because it can corrupt game state. Ask the player to reconnect with their original ID.",
            );
          } else {
            sendError(ws, `Unsupported host action: ${action}`);
          }
          break;
        }
      }
    } catch (e) {
      console.error("Message error:", e);
    }
  });

  ws.on("close", () => {
    if (currentSessionId && sessions[currentSessionId]) {
      const session = sessions[currentSessionId];
      const disconnectedPlayerId = session.clients.get(ws) || null;
      session.clients.delete(ws);

      // Mark player as disconnected (if not connected via another socket)
      if (
        disconnectedPlayerId &&
        !isPlayerConnectedViaAnotherSocket(session, disconnectedPlayerId, ws)
      ) {
        setPlayerConnected(session, disconnectedPlayerId, false);
        ensureValidHost(session, disconnectedPlayerId);
        broadcastState(currentSessionId);
      }

      // Prune any other dead clients
      pruneDeadClients(session);

      // Schedule cleanup if no one is left
      if (session.clients.size === 0) {
        const sid = currentSessionId;
        session.cleanupTimer = setTimeout(() => {
          if (sessions[sid] && sessions[sid].clients.size === 0) {
            console.log(
              `Unloading idle session ${sid} from memory (persisted to DB)`,
            );
            delete sessions[sid];
          }
        }, SESSION_CLEANUP_DELAY_MS);
      }
    }
  });
});

function persistAllSessions() {
  for (const [sessionId, session] of Object.entries(sessions)) {
    db.saveSession(sessionId, session.gameType, session.state, session.hostPlayerId);
  }
}

let isShuttingDown = false;
function shutdownGracefully(signal: string) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`Received ${signal}. Persisting active sessions before shutdown...`);

  clearInterval(heartbeatInterval);
  clearInterval(inactivityInterval);
  for (const session of Object.values(sessions)) {
    if (session.cleanupTimer) {
      clearTimeout(session.cleanupTimer);
      session.cleanupTimer = null;
    }
  }

  persistAllSessions();
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 5_000).unref();
}

process.on("SIGINT", () => shutdownGracefully("SIGINT"));
process.on("SIGTERM", () => shutdownGracefully("SIGTERM"));

app.get("/ping", (_req, res) => {
  res.send("pong");
});
app.use(express.static(path.join(__dirname, "../dist")));
app.get("/*splat", (_req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

server.listen(PORT, () => {
  console.log(`Cardio server listening on port ${PORT}`);
});

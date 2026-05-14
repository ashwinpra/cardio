# Architecture Reference

Deep-dive on the server internals, WebSocket protocol, and shared systems. Read CLAUDE.md first for orientation.

---

## Server: `server/index.ts`

### Session Object

```typescript
interface Session {
  clients: Map<WebSocket, string>;  // ws → playerId
  state: GameState;                  // authoritative state (any shape)
  gameType: GameType;
  hostPlayerId: string | null;       // first player to JOIN_LOBBY
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}
```

Sessions live in `const sessions: Record<string, Session>`.  
Session IDs: 4-char uppercase hex, collision-resistant.  
Player IDs: 8-char UUID fragment, generated client-side in `Lobby.tsx`.

### MAX_PLAYERS per game

```
LITERATURE: 8 | COUP: 6 | SECRET_HITLER: 10 | HANABI: 5 | LOVE_LETTER: 4 | SPADES: 4
```

### Heartbeat (WebSocket keep-alive)

- Server sends `ws.ping()` every 15 s.
- Clients must respond with pong within 10 s or are terminated.
- Tracked via `wsAliveMap: WeakMap<WebSocket, boolean>`.

### Reconnection Flow

1. Client disconnect → player marked `isConnected: false` → state broadcast.
2. If no clients remain in session, cleanup timer starts (120 s).
3. Client reconnects → sends `JOIN_SESSION` + `JOIN_LOBBY` with same playerId.
4. Server matches playerId, cancels cleanup timer, updates socket mapping.
5. `GameContext.tsx` auto-reconnects from `localStorage` (`cardio_sessionId`, `cardio_playerId`, `cardio_playerName`). Uses exponential backoff, max 8 attempts.

---

## WebSocket Message Protocol

### Client → Server

| Type | Payload | Notes |
|------|---------|-------|
| `CREATE_SESSION` | `{gameType}` | Server responds with `SESSION_CREATED` |
| `JOIN_SESSION` | `{sessionId}` | Server responds with `SESSION_JOINED` + broadcasts state |
| `JOIN_LOBBY` | `{player: {id, name, team?, seatIndex?}}` | Adds or reconnects player |
| `START_GAME` | `{}` | Host only; delegates to game handler |
| `ASK_CARD` | `{askerId, targetId, card}` | Literature only |
| `CLAIM_BOOK` | `{claimerId, halfSuit}` | Literature only |
| `COUP_ACTION` | varies | Coup-specific |
| `SECRET_HITLER_ACTION` | varies | Secret Hitler-specific |
| `GAME_ACTION` | `{actorId, ...}` | Generic action for all games |

### Server → Client

| Type | Payload |
|------|---------|
| `SESSION_CREATED` | `{sessionId, gameType}` |
| `SESSION_JOINED` | `{sessionId, gameType}` |
| `STATE_UPDATE` | `{state (sanitized), yourPlayerId, gameType}` |
| `ERROR` | `{message}` |

`actorId: myPlayerId` is injected by `server/index.ts` before dispatching to every handler.

---

## State Sanitization

`sanitizeStateForPlayer(state, playerId)` in `server/index.ts` runs before every `STATE_UPDATE` send.

| Game | What is hidden |
|------|---------------|
| Literature | All other players' hands; exposes `cardCounts: Record<string, number>` at top level |
| Coup | Other players' unrevealed influences shown as `{role: 'HIDDEN', isRevealed: false}` |
| Secret Hitler | Roles/party hidden except for: self always visible; Fascists see each other + Hitler; Hitler sees Fascists; `presidentCards`/`chancellorCards` shown only to active role; `policyPeek` shown only during POLICY_PEEK action |
| Hanabi, Love Letter, Spades | No sanitization (pass-through) |

When adding private state to a game, add a branch in `sanitizeStateForPlayer`.

---

## Game Handler Interface

Every game handler in `server/games/` exports:

```typescript
export function handleAction(
  state: GameState,
  data: ActionData,
  broadcastState?: (sessionId: string) => void  // optional, for async mid-action broadcasts
): { state?: GameState; error?: string }
```

- Return `{ error }` to send an `ERROR` message to the client; state is unchanged.
- Return `{ state }` to persist new state and broadcast to all clients.
- The `broadcastState` callback is only needed for games that broadcast intermediate state mid-action (Coup's challenge/block resolution, Hanabi's end-of-turn, etc.).
- `data.actorId` is always the playerId of the WS that sent the message (injected by server).

---

## `createEmptyState` Defaults

`server/index.ts` initializes a blank state for each game type. The base shape for all games:

```typescript
{
  sessionId, gameType, phase: 'LOBBY',
  players: [], activePlayerIndex: 0, lastMove: null, moveLog: []
}
```

Game-specific fields are added on top. If you add new required fields to a game's `GameState`, add defaults here.

---

## Frontend: GameContext

`src/context/GameContext.tsx` — the single WebSocket client for the app.

**Exposed API (via `useGame()`):**

| Property/Method | Purpose |
|----------------|---------|
| `gameState` | Sanitized state from last `STATE_UPDATE` |
| `myPlayerId` | This client's player ID |
| `cardCounts` | Literature card counts (set from `state.cardCounts`) |
| `connectionStatus` | `'connected' \| 'disconnected' \| 'reconnecting'` |
| `createLANSession(gameType)` | Opens WS + sends `CREATE_SESSION` |
| `connectToLAN(sessionId)` | Opens WS + sends `JOIN_SESSION` |
| `sendMessage(msg)` | Send any message; queues if not connected |
| `sendAction(action)` | Wraps action in `{type: 'GAME_ACTION', actorId, ...action}` |
| `clearSession()` | Clears localStorage + closes WS intentionally |

`state` and `playerId` are aliases for `gameState` and `myPlayerId` (backward compat).

---

## Frontend: App Routing

`src/App.tsx` phase-based routing:

```
No gameState    → <LandingPage />
phase === LOBBY → <Lobby />
otherwise       → renderBoard() based on gameState.gameType
```

Boards: `LiteratureBoard | CoupBoard | SecretHitlerBoard | HanabiBoard | LoveLetterBoard | SpadesBoard`

---

## Shared Base Types (`src/shared/types.ts`)

```typescript
type GameType = 'LITERATURE' | 'COUP' | 'SECRET_HITLER' | 'HANABI' | 'LOVE_LETTER' | 'SPADES';

interface Player { id, name, seatIndex, isConnected, team: 'TEAM_A' | 'TEAM_B' }
interface Move { type, timestamp (ISO), playerName, details, success }
interface BaseGameState { sessionId, gameType, phase, players, activePlayerIndex, lastMove, moveLog, winner? }
```

**Rule:** Do not add game-specific fields to `BaseGameState` or `Player`. Extend in each game's own `types.ts`.

---

## Adding a Game

1. **Types** — create `src/games/<name>/types.ts` extending `BaseGameState`.
2. **Logic** — create `src/games/<name>/logic.ts` with pure, isomorphic functions.
3. **Board** — create `src/games/<name>/Board.tsx`.
4. **Server handler** — create `server/games/<name>.ts` exporting `handleAction`.
5. **Wire up server** — in `server/index.ts`:
   - Import handler.
   - Add `GameType` literal to `src/shared/types.ts`.
   - Add `MAX_PLAYERS` entry.
   - Add `createEmptyState` branch.
   - Add sanitization branch in `sanitizeStateForPlayer` (if needed).
   - Add handler dispatch in `START_GAME` and action case blocks.
6. **Wire up client** — in `src/App.tsx` add a `renderBoard()` branch.
7. **Rules** — add an entry to `src/constants/rules.ts`.

---

## Testing

Tests live co-located with the modules they test:
- `src/games/literature/logic.test.ts` — 47 unit tests for pure game logic
- `server/games/literature.test.ts` — 12 integration tests for the server handler

Target pure functions in `logic.ts` for unit tests. Handler tests should verify validation, happy path, and edge cases (turn enforcement, missing fields, game-over).

```bash
npm test           # single run
npm run test:watch # watch mode
```

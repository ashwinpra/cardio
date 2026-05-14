# Coup — Agent Context

## Overview

2–6 player social deduction/bluffing game. Each player has 2 hidden character cards (influences). Last player with influence wins.

**Players:** 2–6  
**Teams:** None (free-for-all)

---

## File Map

| File | Role |
|------|------|
| `src/games/coup/types.ts` | All game-specific types |
| `src/games/coup/logic.ts` | Pure helper functions |
| `src/games/coup/Board.tsx` | Full game UI |
| `server/games/coup.ts` | Server action handler (receives `broadcastState` callback) |

---

## State Shape

```typescript
interface GameState extends BaseGameState {
  gameType: 'COUP';
  deck: CoupRole[];
  players: CoupPlayer[];  // extends Player with { coins, influences: Influence[] }
  pendingAction: PendingAction | null;
  exchangeOptions?: CoupRole[];
  loserId?: string;
  resolution?: string;
  winner?: string;
}
```

---

## Phases

```
LOBBY → ACTION_DECLARATION → WAITING_FOR_CHALLENGE → WAITING_FOR_BLOCK
      → WAITING_FOR_BLOCK_CHALLENGE → RESOLUTION → SELECTING_EXCHANGE_CARDS
      → SELECT_INFLUENCE_TO_LOSE → PLAYING → GAME_OVER
```

---

## Actions (COUP_ACTION or GAME_ACTION)

Core actions: `INCOME`, `FOREIGN_AID`, `TAX`, `ASSASSINATE`, `STEAL`, `EXCHANGE`, `COUP`  
Responses: `BLOCK`, `CHALLENGE`, `PASS`, `REVEAL`

---

## State Sanitization

Other players' unrevealed influences shown as `{ role: 'HIDDEN', isRevealed: false }`. Revealed influences show the real role.

---

## Handler Notes

- `server/games/coup.ts` receives `broadcastState` and may call it during multi-step resolution (challenges, blocks).
- The `broadcastState` parameter is `(sessionId: string) => void` — pass `currentSessionId` when calling.
- Coup has complex async resolution; state transitions span multiple round-trips.

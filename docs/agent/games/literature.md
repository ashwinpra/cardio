# Literature — Agent Context

## Overview

6 or 8 player team-based deduction game. Two teams race to claim "books" (half-suits of 6 cards each).

**Players:** 6 (with Eights & Jokers, 9 books) or 8 (without, 8 books)  
**Teams:** TEAM_A vs TEAM_B (player-selected in lobby)

---

## File Map

| File | Role |
|------|------|
| `src/games/literature/types.ts` | All game-specific types |
| `src/games/literature/logic.ts` | Pure game logic (shared client+server) |
| `src/games/literature/logic.test.ts` | 47 unit tests |
| `src/games/literature/Board.tsx` | Full game UI |
| `server/games/literature.ts` | Server action handler |
| `server/games/literature.test.ts` | 12 server-handler tests |

---

## State Shape

```typescript
interface GameState extends BaseGameState {
  gameType: 'LITERATURE';
  hands: Record<string, Card[]>;         // playerId → cards (sanitized to own hand only)
  books: ClaimedBook[];                  // { team, halfSuit }[]
  houseRules: HouseRules;                // all fields present but NONE enforced
  scores: { teamA: number; teamB: number };
}
```

`cardCounts: Record<string, number>` is injected at the top level by `sanitizeStateForPlayer()` — not part of `GameState` itself.

---

## Half-Suit Composition

| Half-Suit | Cards |
|-----------|-------|
| LOW_{SUIT} | 2 3 4 5 6 7 of that suit |
| HIGH_{SUIT} | 9 10 J Q K A of that suit |
| EIGHTS_AND_JOKERS | 8♣ 8♦ 8♥ 8♠ Jk1 Jk2 |

8-player: 48 cards, no EIGHTS_AND_JOKERS, `maxBooks = 8`.  
6-player: 54 cards, includes EIGHTS_AND_JOKERS, `maxBooks = 9`.

---

## Actions

### ASK_CARD
```
Client → { type: 'ASK_CARD', askerId, targetId, card: { suit, rank } }
```
Validation (server handler + logic.ts):
- Asker must be the active player.
- Asker and target must be on opposing teams.
- Asker must hold at least one card in the asked half-suit.
- Asker must NOT already hold the asked card.

Outcome: card transfers (turn stays) or no card (turn passes to target).

### CLAIM_BOOK
```
Client → { type: 'CLAIM_BOOK', claimerId, halfSuit }
```
Validation:
- Claimer must be the active player.

Outcome: if claiming team collectively holds ALL cards in the half-suit → book awarded to them; otherwise → book awarded to opponents. Cards removed from all hands. Game ends when `books.length >= maxBooks`.

---

## Invariants

**Enforced server-side:**
- Turn order (asker/claimer must be active player).
- Cannot ask a teammate.
- Must hold a card from the half-suit to ask.
- Cannot ask for a card you already hold.

**NOT enforced:**
- Team balance (players self-select).
- Player count (only min 2 enforced; 6/8 are conventions, not hard limits).
- `HouseRules` fields — all defined but none read.

---

## logic.ts Exports

```
createDeck(is8Player)          → Card[]
shuffle<T>(array)              → T[]
getHalfSuit(card)              → HalfSuitName
getCardsInHalfSuit(halfSuit)   → Card[]
isSameCard(c1, c2)             → boolean
dealCards(state)               → GameState
handleAsk(state, askerId, targetId, card)  → { state, success, error? }
handleClaim(state, claimerId, halfSuit)    → { state, success, error? }
```

`handleClaim` in `logic.ts` and the inline claim logic in `server/games/literature.ts` implement the same semantics (unified). The server handler does NOT call `logic.handleClaim` — it inlines equivalent logic directly.

---

## UI Components (Board.tsx exports)

- `GameBoard` (default export) — main orchestrator
- `PlayingCard` — renders a single card
- `PlayerSeat` — other players around the table (name initial, card count, team color, active indicator)
- `AskModal` — two-step: pick opponent → pick askable card (grouped by half-suit)
- `ClaimModal` — grid of half-suits to claim
- `GameOverScreen` — winner display + new game button (page reload)

---

## Change Checklist

When modifying Literature:

1. Does `server/games/literature.ts` need updating?
2. Does `src/games/literature/logic.ts` need updating?
3. Does `sanitizeStateForPlayer()` in `server/index.ts` need updating?
4. Does `createEmptyState()` need new defaults?
5. Does `Board.tsx` need to reflect/trigger the change?
6. Are all state mutations immutable (spreading, not direct mutation)?
7. Run `npm test` — all 59 tests must pass.

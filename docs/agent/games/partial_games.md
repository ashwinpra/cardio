# Hanabi, Love Letter, Spades — Agent Context

These three games have frontend boards and basic server handlers, but their logic layers are partially stubbed. They are playable shells awaiting full implementation.

---

## Hanabi

**Players:** 2–5 | **Type:** Cooperative  
**Objective:** Collectively play cards 1–5 in each of 5 colors for a max score of 25.

### Files
| File | Role |
|------|------|
| `src/games/hanabi/types.ts` | Types |
| `src/games/hanabi/logic.ts` | Logic (`setupHanabi`, `playCard`, `discardCard`, `giveHint`, `advancePhase`) |
| `src/games/hanabi/Board.tsx` | UI |
| `server/games/hanabi.ts` | Handler — `PLAY_CARD`, `DISCARD_CARD`, `GIVE_HINT` |

### State (key fields)
```
deck, playArea: { RED/BLUE/GREEN/YELLOW/WHITE: 0–5 },
discardPile, hintTokens (0–8), mistakeTokens (0–3), score (0–25)
```

### Sanitization
No sanitization (pass-through). **Note:** Hanabi requires players to NOT see their own hand — this constraint is not currently enforced by sanitization. Hands are fully visible to all clients. This is a known gap.

### Handler Notes
- Mutates `state` directly (not immutable). Deviates from Literature's pattern.
- Uses `broadcastState` callback parameter (passed but may not be called yet).

---

## Love Letter

**Players:** 2–4 | **Type:** Competitive rounds  
**Objective:** Hold the highest-value card at round end, or be the last player standing.

### Files
| File | Role |
|------|------|
| `src/games/love_letter/types.ts` | Types |
| `src/games/love_letter/logic.ts` | Logic |
| `src/games/love_letter/Board.tsx` | UI |
| `server/games/love_letter.ts` | Handler |

### State (key fields)
```
deck, discardPile, eliminatedThisRound, currentRound (int), handmaidProtection (playerId | null)
```

---

## Spades

**Players:** 4 (fixed) | **Type:** Partnership trick-taking  
**Objective:** Accurately bid tricks per round; reach 500 points.

### Files
| File | Role |
|------|------|
| `src/games/spades/types.ts` | Types |
| `src/games/spades/logic.ts` | Logic |
| `src/games/spades/Board.tsx` | UI |
| `server/games/spades.ts` | Handler |

### State (key fields)
```
deck, currentTrick: { leadSuit, cards }, trickHistory,
teamAScore/teamBScore: { tricks, bags, score },
allPlayersBid (bool), spadesBroken (bool)
```

### Scoring
- Make bid: 10 pts × bid.
- Overtricks ("bags"): 1 pt each; 10 bags = −100 pts.
- Miss bid: −10 pts × bid.

---

## Shared Implementation Notes for These Games

- All three use `broadcastState` in their handler signatures.
- None have test suites yet.
- When implementing logic, follow the immutable pattern established in Literature (return new state objects, don't mutate input state).

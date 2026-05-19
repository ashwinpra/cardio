# Hanabi — Agent Context

**Players:** 2–5 | **Type:** Cooperative  
**Objective:** Collectively play cards 1–5 in each of 5 colors (Red, Blue, Green, Yellow, White) for a max score of 25 before making 3 mistakes or running out of cards.

## Key Mechanisms
- **Inverse Visibility**: Players cannot see their own hands. Sanitization is strictly enforced in `server/index.ts` where a player's own hand is scrubbed and assigned `{ color: 'HIDDEN', rank: 0 }`.
- **Hints**: Players spend hint tokens to reveal either color or rank of cards in another player's hand. The server models this accurately with `hintedColor` and `hintedRank` tracking.
- **Tokens**: 8 hint tokens (regained on discard or successful 5-play) and 3 mistake tokens (game over on 3rd).
- **End Game**: When the deck runs out, each player gets one final turn (tracked via `turnsLeft` state field). The game ends in victory (25 points), defeat (3 mistakes), or partial victory (deck empty, out of turns).

## Files
| File | Role |
|------|------|
| `src/games/hanabi/types.ts` | Types (`GameState`, `Card`, `HintToken`, etc.) |
| `src/games/hanabi/logic.ts` | Isomorphic pure logic for setup, play, discard, hint |
| `src/games/hanabi/Board.tsx` | React UI |
| `server/games/hanabi.ts` | Server handler mapping WS actions to pure logic |

## Architecture Notes
- Strictly follows the immutable state-update pattern. Functions return entirely new game states on every action.
- Uses `crypto`-free string generation for `Card.id` to allow safe isomorphic execution on both client and server.

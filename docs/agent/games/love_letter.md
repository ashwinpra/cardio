# Love Letter — Agent Context

**Players:** 2–4 | **Type:** Competitive deduction / elimination rounds  
**Objective:** Hold the highest-value card at round end, or be the last player standing.

## Key Mechanisms
- **Cards**: A 16-card deck with varied abilities. One card is drawn and played each turn.
- **Countess Enforcement**: The `COUNTESS` must be played if the player also holds a `KING` or `PRINCE`. The logic explicitly validates this constraint.
- **Priest Peek**: Playing a Priest allows viewing an opponent's card. This is modeled via an array of `priestPeeks` in the state. The server sanitization securely ensures only the peering player receives this information.
- **Handmaid Protection**: Modeled as an array of protected player IDs (`handmaidProtections`). The protection automatically lifts strictly at the start of that player's next turn.
- **Set-aside Card**: At the start of a round, one card is set aside face-down. This card is only drawn if the deck runs out and a player is forced to draw (typically due to a `PRINCE` action).

## Files
| File | Role |
|------|------|
| `src/games/love_letter/types.ts` | Types (`GameState`, `LoveLetterRole`, `Card`) |
| `src/games/love_letter/logic.ts` | Pure isomorphic game logic covering all 8 card interactions |
| `src/games/love_letter/Board.tsx` | React UI |
| `server/games/love_letter.ts` | Action dispatcher |

## Architecture Notes
- Sanitization scrubs the deck, set-aside card, and opponent hands to strictly enforce hidden information.
- Turn progression skips eliminated players seamlessly.
- State is fully immutable and utilizes pure functions returning explicit `{ state, error }` tuples for error propagation.

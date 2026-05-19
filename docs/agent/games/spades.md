# Spades — Agent Context

**Players:** 4 (fixed) | **Type:** Partnership trick-taking  
**Objective:** Accurately bid tricks per round; reach 500 points.

## Key Mechanisms
- **Team Play**: Players sit N/S and E/W, formalized as `TEAM_A` and `TEAM_B`. Scoring and bag thresholds are aggregated at the team level, not individually.
- **Nil Bids**: Bidding 0 is treated as a Nil bid. It succeeds (+100) if 0 tricks are taken, and fails (-100) if 1+ tricks are taken. Any tricks taken by a failed Nil bidder count as bags for their team.
- **Spades Broken**: Spades cannot be led until broken, unless the player only holds Spades.
- **Bags (Over-tricks)**: Taking more tricks than bid yields 1 point per over-trick. Accumulating 10 bags incurs a massive 100-point penalty and resets the bag count.

## Files
| File | Role |
|------|------|
| `src/games/spades/types.ts` | Typings (`GameState`, `Trick`, `TeamScore`) |
| `src/games/spades/logic.ts` | Isomorphic pure game loop for tricks, bids, and round resolution |
| `src/games/spades/Board.tsx` | React UI |
| `server/games/spades.ts` | Server action handler |

## Architecture Notes
- The state fully scrubs opponent hands and the deck.
- Trick resolution evaluates the lead suit and highest spades appropriately.
- Round progression is automated: upon taking the 13th trick, the round ends, teams are scored simultaneously, and either the game concludes or a new round is immediately set up.

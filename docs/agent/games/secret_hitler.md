# Secret Hitler — Agent Context

## Overview

5–10 player hidden-role political game. Liberals and Fascists enact policies; Fascists try to elect Hitler as Chancellor.

**Players:** 5–10  
**Teams:** LIBERAL vs FASCIST (hidden)

---

## File Map

| File | Role |
|------|------|
| `src/games/secretHitler/types.ts` | All game-specific types |
| `src/games/secretHitler/logic.ts` | Game logic |
| `src/games/secretHitler/Board.tsx` | Full game UI |
| `server/games/secretHitler.ts` | Server action handler |

---

## State Shape (key fields)

```typescript
interface SecretHitlerState extends BaseGameState {
  gameType: 'SECRET_HITLER';
  phase: SecretHitlerPhase;
  players: SecretHitlerPlayer[];  // extends Player with { isAlive, role?, partyMembership? }
  drawPile / discardPile: Policy[];
  electionTracker: number;        // 0–3; resets on successful government
  liberalPolicies: number;        // 0–5; 5 → Liberals win
  fascistPolicies: number;        // 0–6; 6 → Fascists win
  presidentId / nominatedChancellorId / chancellorId: string | null;
  previousPresidentId / previousChancellorId: string | null;  // ineligible next round
  presidentCards / chancellorCards: Policy[];  // shown only to active role
  votes: Record<string, 'JA' | 'NEIN'>;
  vetoRequested: boolean;
  executiveAction: ExecutiveActionType | null;
  policyPeek: Policy[] | null;
  specialElectionReturnIndex: number | null;
  winner?: Party; winnerReason?: string;
  investigateResults: Record<string, { targetName, party } | null>;
}
```

---

## Phases

```
LOBBY → NOMINATE_CHANCELLOR → VOTING → LEGISLATIVE_PRESIDENT
      → LEGISLATIVE_CHANCELLOR → VETO_RESPONSE → EXECUTIVE_ACTION → GAME_OVER
```

---

## State Sanitization (critical)

- All players' `role` and `partyMembership` are hidden by default.
- **Fascists** see each other's roles + Hitler's role.
- **Hitler** sees Fascists (but not as Hitler, only as FASCIST).
- `presidentCards` shown only to current president.
- `chancellorCards` shown only to nominated chancellor.
- `policyPeek` shown only to president during `POLICY_PEEK` executive action.

If modifying role-reveal logic, update `sanitizeStateForPlayer()` in `server/index.ts` carefully — this is the information-security boundary.

---

## Win Conditions

- Liberals: enact 5 liberal policies OR assassinate Hitler.
- Fascists: enact 6 fascist policies OR elect Hitler as Chancellor after ≥ 3 fascist policies.

# docs/agent/ — Machine-Oriented Documentation Index

This directory contains structured context for AI coding agents working in the Cardio repository.

## Navigation

| File | What it covers |
|------|---------------|
| [`/CLAUDE.md`](../../CLAUDE.md) | **Start here.** Repo overview, tech stack, dev commands, core patterns |
| [`architecture.md`](./architecture.md) | Server internals, WebSocket protocol, sanitization, handler interface, adding a game |
| [`games/literature.md`](./games/literature.md) | Literature: state shape, actions, invariants, change checklist |
| [`games/coup.md`](./games/coup.md) | Coup: state shape, phases, sanitization |
| [`games/secretHitler.md`](./games/secretHitler.md) | Secret Hitler: state shape, phases, role-reveal rules |
| [`games/partial_games.md`](./games/partial_games.md) | Hanabi, Love Letter, Spades: current status, state shapes, known gaps |

## When to read what

- **Fixing a bug or adding a feature in one game** → CLAUDE.md + that game's file.
- **Adding a new game** → CLAUDE.md + architecture.md (see "Adding a Game" section).
- **Modifying shared infrastructure** (server, GameContext, shared types) → architecture.md.
- **Understanding the WebSocket protocol** → architecture.md (Message Protocol section).
- **Understanding state visibility rules** → architecture.md (State Sanitization section).

## Maintenance

- Update the relevant game file when its state shape, actions, or invariants change.
- Update `architecture.md` when `server/index.ts` changes structurally.
- Update `CLAUDE.md` game table (status/player count) when a game's implementation status changes.
- Do not duplicate information across files — cross-link instead.

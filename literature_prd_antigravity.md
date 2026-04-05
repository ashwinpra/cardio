# Task: Build a Web-Based Local Multiplayer Implementation of Literature (Card Game)

## Overview

Build a browser-based implementation of **Literature** (also known as Canadian Fish / Russian Fish), a team card game for 6 or 8 players. The application must support local multiplayer in two modes: **hot-seat** (all players share one device) and **LAN session** (players connect from separate devices on the same Wi-Fi/LAN network). No installation, no sign-up, and no internet connection should be required to play.

---

## Tech Stack

- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS
- **Game Logic:** Pure TypeScript state machine (no external game library)
- **Networking (LAN mode):** WebSockets via a lightweight Node.js + `ws` server bundled with the app
- **Hot-seat mode:** No networking; all state managed in-browser
- **Card assets:** Open-source SVG playing card sprite sheet (e.g. `svg-cards`)
- **Build tool:** Vite

---

## Game Rules to Enforce

### Deck & Setup
- Standard 52-card deck **plus 2 jokers**, with the four 8s **kept in** → 54 cards total
- 9 books of 6 cards each:
  - Low Clubs (A,2,3,4,5,6,7♣), High Clubs (9,10,J,Q,K♣)
  - Low Diamonds, High Diamonds
  - Low Hearts, High Hearts
  - Low Spades, High Spades
  - **Eights & Jokers** (8♣, 8♦, 8♥, 8♠, Joker 1, Joker 2)
- **6 players:** use all 54 cards → 9 cards each, 9 books (including Eights & Jokers)
- **8 players:** remove the Eights & Jokers book (set aside all four 8s and both jokers) → 48 cards, 6 cards each, 8 books (Low/High of each suit only)
- Players sit in alternating team order (Team A, Team B, Team A, …)
- First dealer chosen at random; dealer goes first

### Turn Mechanics
- Active player asks **one specific card** from any **opponent** (not a teammate)
- Player must hold at least one card from the **same half-suit** as the requested card
- Player may not ask for a card they already hold
- If the opponent holds the card → card is transferred, asker gets another turn
- If the opponent does not hold the card → turn passes to that opponent

### Claiming a Book
- Can only be claimed on the active player's turn
- Player declares which teammate holds each of the 6 cards in the half-suit
- **Correct claim (right team, right distribution):** Claiming team scores the book
- **Opponent holds a card:** Opposing team scores the book
- **Wrong distribution (all cards on claiming team but wrongly assigned):** Book is forfeited (no score)
- A player does not need to personally hold any card in the book to claim it

### Information Rules
- Any player may ask what the last question and answer was
- Any player may ask how many cards another player holds
- No written records; the UI must not expose more than the last move in a searchable way

### Elimination & End Game
- Player with 0 cards is eliminated unless they just made a successful claim (in that case, they may pass the turn to any teammate with cards)
- When a whole team runs out of cards, their opponents must claim all remaining books
- Game ends when all 9 books are claimed; team with more books wins — a tie is **impossible** with an odd number of books

---

## Application Screens & Features

### 1. Landing Page
- Two large CTAs: **"Host Game"** and **"Join Game"**
- Option for hot-seat mode visible on the Host flow

### 2. Lobby (Host)
- Select player count: **6** or **8**
- Toggle **Hot-seat** vs **LAN session**
- LAN session: display a **4-character session code** and a **QR code** for easy joining
- Each player enters a display name (max 20 characters)
- Host assigns players to **Team A** or **Team B** (or enables random assignment)
- Lobby shows all connected players + team assignments in real time
- "Start Game" button enabled only when all seats are filled

### 3. Hot-Seat Pass Screen
- Shown before each player's turn: **"Pass device to [Player Name]"** with a 5-second countdown
- Player taps **"Show My Hand"** to reveal cards — screen is hidden until then

### 4. Game Board
- Central table area with player avatars arranged in alternating team order
- **Team A** and **Team B** colour-coded throughout (e.g. blue vs red)
- Always-visible score panel: books won by each team
- Claimed books panel: each captured half-suit shown as a face-up card group with team attribution
- Active player turn indicator (animated highlight)
- For LAN mode: non-active players see a waiting overlay + move log

### 5. Player Hand
- Cards grouped by half-suit
- Only visible to the owning player (own device in LAN; after pass-screen in hot-seat)
- Cards eligible for a complete-team claim highlighted

### 6. Ask Flow
1. Active player selects an **opponent** to ask
2. Selects a **half-suit** (only half-suits the player holds ≥1 card in are selectable)
3. Selects a **specific card** from that half-suit (only cards not already held are shown)
4. Confirmation prompt: *"Ask [Name] for the [Card]?"*
5. Animated result: card slides between players or turn-passed indicator
6. Move log entry added

### 7. Claim Flow
1. Active player clicks **"Claim Book"**
2. Claim wizard: select the half-suit, then drag/assign each of the 6 cards to a team member
3. Submit → cards revealed → animated result with explanation:
   - ✅ Correct → book awarded to claiming team
   - ❌ Opponent had a card → book awarded to opponent
   - ⚠️ Wrong distribution → book forfeited

### 8. Move Log
- Scrollable panel recording every ask and claim event
- Most recent move shown prominently at the top
- Older history accessible by scrolling (no search/filter per rules)

### 9. Information Panel
- Tap any player avatar → see their current card count
- **"Last Move"** button → popover showing last question + answer

### 10. End-Game Screen
- Final score, winning team, book-by-book breakdown
- **Rematch** (same players, re-deal) and **New Game** (back to lobby) buttons

### 11. Settings / House Rules (pre-game panel)
Implement as toggles, all **off** by default:

| ID | House Rule | Description |
|----|-----------|-------------|
| `mandatory_declaration` | Mandatory Declaration | Must claim as soon as one player holds all 6 cards |
| `announce_one_card` | Announce One Card | Player must announce holding exactly 1 card |
| `high_book_double` | High Book Double Points | High half-suits score 2 pts |
| `claim_any_turn` | Claim Any Turn | Any player may claim on any turn |
| `claim_passes_turn` | Claim Passes Turn | Successful claim lets team choose next asker |


---

## Game State Model

The canonical `GameState` TypeScript interface must include at minimum:

```ts
interface GameState {
  sessionId: string;
  phase: 'LOBBY' | 'DEALING' | 'PLAYING' | 'GAME_OVER';
  players: Player[];          // ordered by seat index
  hands: Record<PlayerId, Card[]>;  // server-side only; client receives own hand only
  books: ClaimedBook[];       // won books with owning team
  activePlayerIndex: number;
  lastMove: Move | null;
  houseRules: HouseRules;
  scores: { teamA: number; teamB: number };
}
```

---

## Architecture Notes

- **All rule validation happens server-side** (or in a single source-of-truth module in hot-seat mode). The client sends *intents*; the server validates and applies state changes.
- In LAN mode, the **host device** runs the Node.js WebSocket server. Other devices connect via the host's local IP + session code.
- The client **never** receives opponents' hands — only card counts and public events.
- Use a **state machine** pattern (e.g. XState or a hand-rolled reducer) to manage game phase transitions.

---

## Non-Functional Requirements

- Game state updates (card transfer, turn change) must reflect on all LAN devices within **500 ms**
- Initial page load under **3 seconds** on LAN
- Support latest Chrome, Firefox, Safari, Edge
- Minimum screen width: **768 px** (tablet landscape)
- Keyboard-navigable interactions
- Cards and team indicators must not rely on colour alone — use icons or patterns too
- No personal data collected or sent outside the local network
- If a LAN player disconnects, preserve game state for **60 seconds** to allow reconnection

---

## Deliverables Expected from Agent

1. Full project scaffold (Vite + React + TypeScript + Tailwind)
2. Core game logic module with full rule enforcement and unit tests
3. WebSocket server (Node.js) for LAN mode
4. All screens and components listed above
5. Responsive CSS layout (768 px+)
6. README with local setup instructions (`npm install && npm run dev`)
7. Basic E2E test covering a full 6-player game turn cycle

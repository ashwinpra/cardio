# Cardio 🂡

[![Deployed on Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=flat-square&logo=render)](https://cardio-5uu3.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A beautiful, modern, web-based multiplayer card game suite designed with elegant UI and real-time synchronization. Cardio runs entirely in-process with a custom Server-Authoritative WebSocket architecture, requiring no database.

![Cardio Banner](./public/favicon.svg)

**[🎮 Play live at cardio-5uu3.onrender.com](https://cardio-5uu3.onrender.com)**

---

## 🎲 Games Included

Cardio currently features six fully-implemented multiplayer games, all managed within a single monorepo:

| Game | Players | Description |
| :--- | :--- | :--- |
| **Literature** | 6 or 8 | A classic team-based deduction and memory game where players collect sets of cards. |
| **Coup** | 2–6 | A dystopian universe game of bluffing, challenges, and blocking. |
| **Secret Hitler** | 5–10 | A dramatic game of political intrigue, hidden roles, and legislative rounds set in 1930s Germany. |
| **Hanabi** | 2–5 | A cooperative game of logic and fireworks where you can see everyone's cards but your own. |
| **Love Letter** | 2–4 | A fast-paced game of risk, single-card elimination, and luck to deliver your letter to the Princess. |
| **Spades** | 4 | A classic trick-taking partnership game where spades are always trump. |

## 🚀 Architecture & Tech Stack

Cardio is built for speed, responsiveness, and seamless real-time syncing. It uses a **Server Authority** model: all state mutations happen on the backend, are validated, and then broadcasted to clients as pure, sanitized state updates over WebSockets. Shared game logic runs isomorphically on both the client and server.

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Backend**: Express 5, `ws` (WebSockets), Node.js + `tsx` runtime
- **Testing**: Vitest for pure logic and state transitions
- **Deployment**: Render

## 🛠 Getting Started

To run Cardio locally, ensure you have Node.js installed.

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   This single command concurrently starts the Vite frontend (port `5173`) and the Node.js websocket server (port `3001`).
   ```bash
   npm run dev
   ```

3. **Play**
   Navigate to `http://localhost:5173` in your browser. 
   
   *(Pro tip: You can use the "Debug UI" option in the game lobby to test game boards by yourself without needing multiple browser windows!)*

### Other Useful Commands

```bash
npm run build      # Build frontend and compile server TypeScript
npm run start      # Run production server
npm test           # Run Vitest test suite
npm run kill-ports # Clean up ports 3001/5173 if they get stuck
```

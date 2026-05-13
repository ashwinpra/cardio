# Cardio 🂡

A beautiful, modern, web-based multiplayer card game suite designed with elegant UI and real-time synchronization.

![Cardio Banner](./public/favicon.svg)

## 🎲 Games Included

Cardio currently supports a variety of classic and modern deduction card games:

- **Literature**: A classic team-based deduction and memory game where players collect sets of cards.
- **Coup**: A dystopian universe game of bluffing, deception, and calling bluffs.
- **Hanabi**: A cooperative game of logic and fireworks where you can see everyone's cards but your own.
- **Secret Hitler**: A dramatic game of political intrigue and betrayal set in 1930s Germany.
- **Love Letter**: A fast-paced game of risk, deduction, and luck to deliver your letter to the Princess.
- **Spades**: A classic trick-taking partnership game where spades are always trump.

## 🚀 Tech Stack

Cardio is built for speed, responsiveness, and aesthetic excellence:

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **UI Design**: Material Design 3-inspired, custom CSS, elegant typography
- **Backend**: Node.js + WebSockets (custom game loop handling)

## 🛠 Getting Started

To run Cardio locally, ensure you have Node.js installed.

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   This single command concurrently starts the Vite frontend and the Node.js websocket server.
   ```bash
   npm run dev
   ```

3. **Play**
   Navigate to `http://localhost:5173` in your browser. 
   *(Note: You can use the "Debug UI" option in the game lobby to test game boards by yourself without needing multiple players to join!)*

## 🎨 Design

The styling is handled via a unified set of Tailwind CSS variables (`src/index.css`) that enforce a sleek, dark-mode-first aesthetic with dynamic theming. 

## 📝 License

MIT

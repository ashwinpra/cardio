import { useState } from 'react';
import { useGame } from '../context/GameContext';
import type { GameType } from '../shared/types';

type GameInstructions = {
  title: string;
  blurb: string;
  players: string;
  objective: string;
  duration: string;
  steps: string[];
  complete: {
    section: string;
    points: string[];
  }[];
};

const GAME_INSTRUCTIONS: Record<GameType, GameInstructions> = {
  LITERATURE: {
    title: 'Literature',
    blurb: 'Team deduction with memory and communication pressure.',
    players: '6 players (3 vs 3)',
    objective: 'Complete more full sets than the opposing team.',
    duration: '20-35 min',
    steps: [
      'Ask specific opponents for exact cards only if your team holds at least one card from that set.',
      'If they have it, they must hand it over and you continue your turn.',
      'If they do not, turn passes to them.',
      'Lock complete sets at the right time to score.',
    ],
    complete: [
      {
        section: 'Setup',
        points: [
          'Players split into two teams of three with teammates alternating around the table.',
          'The deck is distributed and each player starts with a hidden hand.',
          'Sets are predefined groups of related cards that teams try to fully collect.',
        ],
      },
      {
        section: 'Turn Flow',
        points: [
          'On your turn, ask one specific opponent for one specific card.',
          'Your team must hold at least one card from that set to make that request.',
          'Successful requests let you continue asking; failed requests pass turn control.',
        ],
      },
      {
        section: 'Scoring And End',
        points: [
          'When your team controls all cards of a set, call and lock the set for points.',
          'A wrong set call can award that set to the opposing team.',
          'Game ends when all sets are claimed; the higher score wins.',
        ],
      },
    ],
  },
  COUP: {
    title: 'Coup',
    blurb: 'A short bluffing duel where confidence is everything.',
    players: '2-6 players',
    objective: 'Be the last player with influence remaining.',
    duration: '10-20 min',
    steps: [
      'Take actions by claiming roles, whether or not you truly have them.',
      'Other players can challenge or block your claims.',
      'Lose influence when caught bluffing or when targeted successfully.',
      'Eliminate all opponents to win the game.',
    ],
    complete: [
      {
        section: 'Core Idea',
        points: [
          'Each player has hidden influence cards and coins.',
          'You can claim role actions even if you do not actually hold that role.',
          'Any claim can be challenged by other players.',
        ],
      },
      {
        section: 'Turn Flow',
        points: [
          'Choose one action each turn: income, foreign aid, coup, or role-based action.',
          'Opponents may block certain actions based on role claims.',
          'If challenged, the loser reveals an influence card.',
        ],
      },
      {
        section: 'Winning',
        points: [
          'A player with no influence is eliminated from the match.',
          'Forced coups become mandatory once coin thresholds are reached.',
          'Last player with influence remaining wins.',
        ],
      },
    ],
  },
  SECRET_HITLER: {
    title: 'Secret Hitler',
    blurb: 'Hidden roles, votes, and escalating political chaos.',
    players: '5-10 players',
    objective: 'Liberals pass 5 liberal policies or eliminate Hitler.',
    duration: '30-45 min',
    steps: [
      'Each round elect a government and vote it in.',
      'President and Chancellor pass one policy from hidden options.',
      'Use table talk to infer who is lying and who is aligned.',
      'Fascists win by passing 6 fascist policies or electing Hitler late game.',
    ],
    complete: [
      {
        section: 'Roles',
        points: [
          'Players are secretly assigned Liberal, Fascist, or Hitler roles.',
          'Liberals are majority but do not know identities; Fascists coordinate secretly.',
          'Hitler must avoid detection while helping Fascists progress policies.',
        ],
      },
      {
        section: 'Government Cycle',
        points: [
          'A President nominates a Chancellor candidate each round.',
          'All players vote; successful vote forms government and draws policy cards.',
          'President discards one card, Chancellor enacts one policy publicly.',
        ],
      },
      {
        section: 'Win Conditions',
        points: [
          'Liberals win by enacting five liberal policies or assassinating Hitler.',
          'Fascists win by enacting six fascist policies.',
          'After enough fascist policies, electing Hitler as Chancellor also wins for Fascists.',
        ],
      },
    ],
  },
  HANABI: {
    title: 'Hanabi',
    blurb: 'A cooperative puzzle where you see everyone else’s hand but not your own.',
    players: '2-5 players',
    objective: 'Build the highest possible fireworks display by color from 1 to 5.',
    duration: '20-30 min',
    steps: [
      'On your turn, play a card, discard a card, or give a hint.',
      'Hints spend shared hint tokens and can reveal color or rank.',
      'Wrong plays consume mistake tokens; three mistakes ends the game.',
      'Coordinate with limited information to maximize final score.',
    ],
    complete: [
      {
        section: 'Hidden Information',
        points: [
          'You hold your cards facing outward so teammates can see them, but you cannot.',
          'Everyone works together using limited communication through legal hints only.',
          'Cards must be played in ascending order for each color stack.',
        ],
      },
      {
        section: 'Turn Options',
        points: [
          'Play a card if you believe it is currently legal for a fireworks stack.',
          'Discard a card to recover one hint token.',
          'Give a color or rank hint to a teammate, consuming one hint token.',
        ],
      },
      {
        section: 'End And Scoring',
        points: [
          'Three failed plays end the game immediately.',
          'Game also ends after deck exhaustion and final turns.',
          'Final score is the sum of top cards across all color stacks.',
        ],
      },
    ],
  },
  LOVE_LETTER: {
    title: 'Love Letter',
    blurb: 'Quick rounds of deduction and targeted card effects.',
    players: '2-4 players',
    objective: 'Win rounds to collect enough favor tokens first.',
    duration: '10-20 min',
    steps: [
      'Draw one card and play one card each turn.',
      'Card effects let you guess, compare, protect, swap, or force discards.',
      'If eliminated, you are out for the round.',
      'Round ends when one player remains or deck runs out.',
    ],
    complete: [
      {
        section: 'Round Structure',
        points: [
          'Each round starts with one card in hand and a shared deck.',
          'On your turn, draw one card then choose one of your two cards to play.',
          'Played card effects resolve immediately and can alter player states.',
        ],
      },
      {
        section: 'Elimination And Safety',
        points: [
          'Some effects eliminate opponents directly when conditions are met.',
          'Handmaid-style protection can block targeting for a turn.',
          'Discarding or revealing Princess can eliminate the active player.',
        ],
      },
      {
        section: 'Winning The Match',
        points: [
          'If deck empties, highest-value remaining hand wins the round.',
          'Round winner gains one favor token.',
          'First player to target token threshold wins the match.',
        ],
      },
    ],
  },
  SPADES: {
    title: 'Spades',
    blurb: 'Classic partnership trick-taking with bidding stakes.',
    players: '4 players (2 vs 2)',
    objective: 'Your team reaches the target score through accurate bids and tricks.',
    duration: '25-45 min',
    steps: [
      'Each player bids how many tricks they expect to take this hand.',
      'Follow suit when possible; spades trump other suits.',
      'Win tricks strategically to meet your team bid.',
      'Scoring rewards accurate bids and penalizes misses.',
    ],
    complete: [
      {
        section: 'Partnerships And Bids',
        points: [
          'Four players form two fixed teams of two.',
          'Before play, each player bids expected trick count.',
          'Team bid is the sum of partner bids for the hand.',
        ],
      },
      {
        section: 'Playing Tricks',
        points: [
          'Lead suit defines what others must follow if possible.',
          'If a player cannot follow suit, they may play another suit or a spade.',
          'Highest card of lead suit wins unless a spade is played; highest spade then wins.',
        ],
      },
      {
        section: 'Scoring',
        points: [
          'Meeting team bid gives positive points based on contract.',
          'Missing bid applies a penalty for that hand.',
          'Extra tricks may count as overtricks depending on scoring settings.',
        ],
      },
    ],
  },
};

export default function LandingPage() {
  const { createLANSession, connectToLAN } = useGame();
  const [sessionCode, setSessionCode] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType>('LITERATURE');
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionMode, setInstructionMode] = useState<'quick' | 'complete'>('quick');
  const gameTitle =
    selectedGame === 'LITERATURE' ? 'Literature' : selectedGame === 'COUP' ? 'Coup' : selectedGame === 'SECRET_HITLER' ? 'Secret Hitler' : selectedGame === 'HANABI' ? 'Hanabi' : selectedGame === 'LOVE_LETTER' ? 'Love Letter' : 'Spades';
  const selectedGameInfo = GAME_INSTRUCTIONS[selectedGame];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-8 bg-[#f8f9fa]">
      {/* Title */}
      <div className="text-center mb-8 md:mb-14">
        <h1 className="text-5xl md:text-7xl font-black text-[#191c1d] mb-2 md:mb-3 tracking-[-0.04em] uppercase italic">
          Cardio
        </h1>
        <p className="text-sm md:text-base text-[#6c7a71] max-w-sm mx-auto leading-relaxed font-medium px-4">
          The ultimate heart-racing card studio
        </p>
      </div>

      {/* Cards */}
      <div className="flex flex-col md:flex-row gap-5 w-full max-w-2xl">
        {/* Host */}
        <div className="flex-1 p-7 rounded-3xl bg-white flex flex-col justify-between shadow-[0_2px_32px_rgba(25,28,29,0.04)] border border-[#edeeef]">
          <div>
            <h2 className="text-lg font-semibold text-[#191c1d] mb-1.5">Host a Game</h2>
            <p className="text-sm text-[#6c7a71] mb-6 leading-relaxed">
              Choose a game type to start a new session.
            </p>

            <div className="space-y-2 mb-8">
              <button
                onClick={() => setSelectedGame('LITERATURE')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedGame === 'LITERATURE' ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#f3f4f5] grayscale opacity-60'}`}
              >
                <div className="font-bold text-sm text-[#191c1d]">Literature</div>
                <div className="text-[11px] text-[#6c7a71]">Team-based strategy & deduction</div>
              </button>
              <button
                onClick={() => setSelectedGame('COUP')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedGame === 'COUP' ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#f3f4f5] grayscale opacity-60'}`}
              >
                <div className="font-bold text-sm text-[#191c1d]">Coup</div>
                <div className="text-[11px] text-[#6c7a71]">Bluffing, influence & assassination</div>
              </button>
              <button
                onClick={() => setSelectedGame('SECRET_HITLER')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedGame === 'SECRET_HITLER' ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#f3f4f5] grayscale opacity-60'}`}
              >
                <div className="font-bold text-sm text-[#191c1d]">Secret Hitler</div>
                <div className="text-[11px] text-[#6c7a71]">Hidden roles, voting & policy deduction</div>
              </button>
              <button
                onClick={() => setSelectedGame('HANABI')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedGame === 'HANABI' ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#f3f4f5] grayscale opacity-60'}`}
              >
                <div className="font-bold text-sm text-[#191c1d]">Hanabi</div>
                <div className="text-[11px] text-[#6c7a71]">Cooperative card play with hints</div>
              </button>
              <button
                onClick={() => setSelectedGame('LOVE_LETTER')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedGame === 'LOVE_LETTER' ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#f3f4f5] grayscale opacity-60'}`}
              >
                <div className="font-bold text-sm text-[#191c1d]">Love Letter</div>
                <div className="text-[11px] text-[#6c7a71]">Quick bluffing & deduction game</div>
              </button>
              <button
                onClick={() => setSelectedGame('SPADES')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedGame === 'SPADES' ? 'border-emerald-500 bg-emerald-50/50' : 'border-[#f3f4f5] grayscale opacity-60'}`}
              >
                <div className="font-bold text-sm text-[#191c1d]">Spades</div>
                <div className="text-[11px] text-[#6c7a71]">Team-based trick-taking with bidding</div>
              </button>
            </div>

            <button
              onClick={() => {
                setInstructionMode('quick');
                setShowInstructions(true);
              }}
              className="w-full mb-3 py-3 rounded-2xl border border-[#d8e9e0] text-[#0a6f4b] text-sm font-semibold bg-[#f2faf7] hover:bg-[#e9f7f1] transition-colors"
            >
              How to Play {gameTitle}
            </button>

            <div className="rounded-2xl border border-[#eef0ef] bg-[#fbfcfc] px-4 py-3 mb-8">
              <div className="text-[11px] tracking-wide uppercase text-[#6c7a71] mb-1">Quick Overview</div>
              <div className="text-sm font-semibold text-[#191c1d] mb-1">{selectedGameInfo.title}</div>
              <div className="text-xs text-[#6c7a71] leading-relaxed">{selectedGameInfo.blurb}</div>
            </div>
          </div>
          <button
            onClick={() => createLANSession(selectedGame)}
            className="w-full py-4 rounded-full text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
            style={{ background: 'linear-gradient(180deg, #10b981, #006c49)' }}
          >
            Create {gameTitle} Session
          </button>
        </div>

        {/* Join */}
        <div className="flex-1 p-7 rounded-3xl bg-white flex flex-col justify-between shadow-[0_2px_32px_rgba(25,28,29,0.04)] border border-[#edeeef]">
          <div>
            <h2 className="text-lg font-semibold text-[#191c1d] mb-1.5">Join a Game</h2>
            <p className="text-sm text-[#6c7a71] mb-5 leading-relaxed">
              Enter the 4-character code from the host.
            </p>
            <input
              type="text"
              maxLength={4}
              value={sessionCode}
              onChange={e => setSessionCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              className="w-full text-center text-3xl font-mono tracking-[0.3em] p-6 rounded-2xl outline-none transition-all text-[#191c1d] placeholder-[#d9dadb] bg-[#f3f4f5] focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
          <button
            disabled={sessionCode.length !== 4}
            onClick={() => connectToLAN(sessionCode)}
            className="w-full py-4 mt-8 bg-[#191c1d] text-white font-bold text-sm rounded-full disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#2e3132] active:scale-[0.98] transition-all"
          >
            Join Existing Session
          </button>
        </div>
      </div>

      <p className="mt-12 text-[11px] text-[#bbcabf] font-medium tracking-wide uppercase">Local Area Network Play Enabled</p>

      {showInstructions && (
        <div
          className="fixed inset-0 z-50 bg-[#111111]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-[#e8ece9] bg-white shadow-[0_20px_60px_rgba(17,24,22,0.22)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="max-h-[92vh] overflow-y-auto p-6 md:p-7">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs tracking-wide uppercase text-[#6c7a71] mb-1">How To Play</div>
                  <h3 className="text-2xl font-bold text-[#191c1d] leading-tight">{selectedGameInfo.title}</h3>
                </div>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#f1f3f2] text-[#191c1d] hover:bg-[#e6e8e7] transition-colors"
                >
                  Close
                </button>
              </div>

              <p className="text-sm text-[#465048] leading-relaxed mb-5">{selectedGameInfo.blurb}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
                <div className="rounded-xl bg-[#f6f8f7] px-3 py-2">
                  <div className="text-[10px] tracking-wide uppercase text-[#6c7a71] mb-1">Players</div>
                  <div className="text-xs font-semibold text-[#191c1d]">{selectedGameInfo.players}</div>
                </div>
                <div className="rounded-xl bg-[#f6f8f7] px-3 py-2">
                  <div className="text-[10px] tracking-wide uppercase text-[#6c7a71] mb-1">Duration</div>
                  <div className="text-xs font-semibold text-[#191c1d]">{selectedGameInfo.duration}</div>
                </div>
                <div className="rounded-xl bg-[#f6f8f7] px-3 py-2">
                  <div className="text-[10px] tracking-wide uppercase text-[#6c7a71] mb-1">Goal</div>
                  <div className="text-xs font-semibold text-[#191c1d]">{selectedGameInfo.objective}</div>
                </div>
              </div>

              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setInstructionMode('quick')}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    instructionMode === 'quick'
                      ? 'bg-[#191c1d] text-white'
                      : 'bg-[#f1f3f2] text-[#191c1d] hover:bg-[#e7e9e8]'
                  }`}
                >
                  Quick Steps
                </button>
                <button
                  onClick={() => setInstructionMode('complete')}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    instructionMode === 'complete'
                      ? 'bg-[#191c1d] text-white'
                      : 'bg-[#f1f3f2] text-[#191c1d] hover:bg-[#e7e9e8]'
                  }`}
                >
                  Complete Rules
                </button>
              </div>
              {instructionMode === 'quick' ? (
                <div className="rounded-2xl border border-[#eef0ef] p-4">
                  <div className="text-sm font-semibold text-[#191c1d] mb-2">Quick Steps</div>
                  <ol className="list-decimal pl-5 space-y-1.5 text-sm text-[#465048]">
                    {selectedGameInfo.steps.map((step, idx) => (
                      <li key={`${selectedGame}-${idx}`}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#eef0ef] p-4 space-y-3">
                  <div className="text-sm font-semibold text-[#191c1d]">Complete Rules</div>
                  {selectedGameInfo.complete.map(section => (
                    <div key={`${selectedGame}-${section.section}`} className="rounded-xl bg-[#f7f9f8] p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#2f3a33] mb-1.5">{section.section}</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-[#465048]">
                        {section.points.map(point => (
                          <li key={`${selectedGame}-${section.section}-${point}`}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

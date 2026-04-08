import { useState } from 'react';
import { useGame } from '../context/GameContext';
import type { GameType } from '../shared/types';

export default function LandingPage() {
  const { createLANSession, connectToLAN } = useGame();
  const [sessionCode, setSessionCode] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType>('LITERATURE');
  const gameTitle =
    selectedGame === 'LITERATURE' ? 'Literature' : selectedGame === 'COUP' ? 'Coup' : 'Secret Hitler';

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
    </div>
  );
}

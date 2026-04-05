import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import type { GameState as CoupGameState, Player, CoupRole } from './types';

// ─── Constants ───────────────────────────────────────────

const ROLE_ICONS: Record<string, string> = {
  DUKE: '👑', ASSASSIN: '🗡️', CAPTAIN: '🛡️', AMBASSADOR: '📜', CONTESSA: '🏰',
};

const ROLE_COLORS: Record<string, string> = {
  DUKE: '#f59e0b', ASSASSIN: '#ef4444', CAPTAIN: '#3b82f6', AMBASSADOR: '#10b981', CONTESSA: '#ec4899',
};

// ─── Components ──────────────────────────────────────────

function InfluenceCard({ role, isRevealed, size = 'normal' }: {
  role: CoupRole; isRevealed: boolean; size?: 'normal' | 'small'
}) {
  const isSmall = size === 'small';
  const isHidden = role === 'HIDDEN';
  
  if (isHidden) {
    return (
      <div className={`
        ${isSmall ? 'w-10 h-14' : 'w-14 h-20'} 
        bg-[#1f2937] rounded-xl shadow-lg flex items-center justify-center border border-white/10
        relative overflow-hidden
      `}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(45deg, #374151 25%, transparent 25%, transparent 50%, #374151 50%, #374151 75%, transparent 75%, transparent)',
          backgroundSize: '10px 10px'
        }} />
      </div>
    );
  }

  const roleColor = ROLE_COLORS[role as string] || '#333';
  const roleIcon = ROLE_ICONS[role as string] || '❓';

  return (
    <div className={`
      ${isSmall ? 'w-14 h-20' : 'w-24 h-32'} 
      bg-white rounded-xl shadow-md border-2 flex flex-col items-center justify-center relative transition-all duration-300
      ${!isRevealed ? 'border-gray-100' : ''}
    `} style={{ borderColor: isRevealed ? roleColor : undefined }}>
      <span className={isSmall ? 'text-2xl' : 'text-4xl'}>{roleIcon}</span>
      <span className={`${isSmall ? 'text-[7px]' : 'text-[10px]'} font-bold uppercase tracking-tighter mt-1 text-center px-1 break-words leading-tight`} style={{ color: roleColor }}>{role}</span>
      {!isRevealed && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white shadow-sm" title="Private" />
      )}
    </div>
  );
}

function PlayerSeat({ player, isActive, isSelf }: {
  player: Player; isActive: boolean; isSelf: boolean;
}) {
  const isAlive = player.influences?.some(i => !i.isRevealed) ?? true;

  return (
    <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${isActive ? 'scale-110' : ''} ${!isAlive ? 'opacity-30 grayscale blur-[0.5px]' : ''}`}>
      <div className="relative">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-bold bg-white shadow-2xl border-2 transition-all
          ${isActive ? 'border-indigo-500 ring-8 ring-indigo-500/10' : 'border-transparent'}
        `}>
          <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center text-gray-900 shadow-inner text-2xl font-black">
            {player.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[12px] font-bold px-3 py-1 rounded-xl shadow-xl border-2 border-white flex items-center gap-1">
          {player.coins}💰
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[12px] font-bold text-gray-900 uppercase tracking-wider bg-white/80 px-4 py-1 rounded-xl backdrop-blur-sm border border-white shadow-sm">
          {player.name} {isSelf ? '(You)' : ''}
        </span>
        <div className="flex gap-2 mt-3">
          {player.influences?.map((inf, i) => (
            <InfluenceCard key={i} role={inf.role} isRevealed={inf.isRevealed} size="small" />
          ))}
        </div>
      </div>
    </div>
  );
}

function RulesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const rules = [
    { role: 'Duke', action: 'Tax', effect: 'Gain 3 coins', counter: 'Blocks Foreign Aid', icon: '👑', color: '#f59e0b' },
    { role: 'Assassin', action: 'Assassinate', effect: 'Pay 3 coins, eliminate 1 influence', counter: '-', icon: '🗡️', color: '#ef4444' },
    { role: 'Captain', action: 'Steal', effect: 'Take 2 coins from a player', counter: 'Blocks Stealing', icon: '🛡️', color: '#3b82f6' },
    { role: 'Ambassador', action: 'Exchange', effect: 'Swap cards from deck', counter: 'Blocks Stealing', icon: '📜', color: '#10b981' },
    { role: 'Contessa', action: '-', effect: '-', counter: 'Blocks Assassination', icon: '🏰', color: '#ec4899' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-300 border border-gray-100">
        <div className="bg-gray-900 px-10 py-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white tracking-tight font-['Montserrat',_sans-serif]">Game Rules</h2>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-all">✕</button>
        </div>
        <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
          <div className="grid gap-5">
            {rules.map((r) => (
              <div key={r.role} className="flex items-center gap-6 p-5 bg-gray-50 rounded-3xl border border-gray-100 transition-hover hover:border-indigo-100">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm" style={{ backgroundColor: `${r.color}15` }}>
                  {r.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-xl text-gray-900">{r.role}</h3>
                    {r.action !== '-' && <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">Action: {r.action}</span>}
                  </div>
                  <p className="text-sm text-gray-600 font-medium mt-1">{r.effect}</p>
                  <p className="text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-wide">Defense: {r.counter}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 px-1">Common Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <span className="font-bold block text-emerald-800 text-sm">Income</span>
                <span className="text-[12px] text-emerald-700/80">Take 1 coin. Cannot be blocked or challenged.</span>
              </div>
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <span className="font-bold block text-indigo-800 text-sm">Foreign Aid</span>
                <span className="text-[12px] text-indigo-700/80">Take 2 coins. Can be blocked by the Duke.</span>
              </div>
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                <span className="font-bold block text-rose-800 text-sm">Coup</span>
                <span className="text-[12px] text-rose-700/80">Spend 7 coins to force a player to lose 1 card.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExchangeSelectionOverlay({ options, count, onConfirm }: {
  options: CoupRole[]; count: number; onConfirm: (selected: CoupRole[]) => void;
}) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const toggleSelection = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      setSelectedIndices(prev => prev.filter(i => i !== idx));
    } else if (selectedIndices.length < count) {
      setSelectedIndices(prev => [...prev, idx]);
    }
  };

  const isConfirmedDisabled = selectedIndices.length !== count;

  return (
    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="max-w-xl w-full bg-white rounded-[48px] p-12 shadow-2xl border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight font-['Montserrat',_sans-serif]">Card Exchange</h2>
        <p className="text-gray-500 mb-10 font-medium">Choose <span className="font-bold text-indigo-600">{count}</span> cards to keep in your hand.</p>
        
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {options.map((role, idx) => {
            const isSelected = selectedIndices.includes(idx);
            return (
              <div 
                key={idx}
                className={`
                  cursor-pointer transition-all duration-300 transform
                  ${isSelected ? 'scale-110 -translate-y-2' : 'hover:scale-105 opacity-80'}
                `}
                onClick={() => toggleSelection(idx)}
              >
                <div className={`relative ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-4 rounded-xl' : ''}`}>
                  <InfluenceCard role={role} isRevealed={true} />
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm border-4 border-white shadow-lg font-bold">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button 
          disabled={isConfirmedDisabled}
          onClick={() => onConfirm(selectedIndices.map(i => options[i]))}
          className={`
            w-full py-6 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-xl
            ${isConfirmedDisabled 
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
              : 'bg-gray-900 text-white hover:bg-black'}
          `}
        >
          Finalize Selection
        </button>
      </div>
    </div>
  );
}

// ─── Main Board ──────────────────────────────────────────

export default function CoupBoard() {
  const { gameState: baseState, myPlayerId, sendMessage, clearSession } = useGame();
  const gameState = baseState as CoupGameState & { pendingAction?: any };
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  useEffect(() => {
    if (gameState.phase === 'WAITING_FOR_CHALLENGE' && gameState.pendingAction) {
      const elapsed = (Date.now() - gameState.pendingAction.timestamp) / 1000;
      const initial = Math.max(0, 10 - elapsed);
      setTimeLeft(Math.ceil(initial));

      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.phase, gameState.pendingAction]);

  if (!gameState || !myPlayerId) return null;

  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === myPlayerId;
  const isExchangePhase = gameState.phase === 'SELECTING_EXCHANGE_CARDS' && isMyTurn;
  const isChallengePhase = gameState.phase === 'WAITING_FOR_CHALLENGE';
  const isLossPhase = gameState.phase === 'SELECT_INFLUENCE_TO_LOSE';
  const isGameOver = gameState.phase === 'GAME_OVER';
  const isLoser = gameState.loserId === myPlayerId;
  const isActor = gameState.pendingAction?.actorId === myPlayerId;
  const hasPassed = gameState.pendingAction?.challengers?.includes(myPlayerId);

  const handleAction = (type: string, targetId?: string, extra?: any) => {
    sendMessage({ type: 'COUP_ACTION', actionType: type, targetId, ...extra, timestamp: Date.now() });
    setSelectedTarget(null);
  };

  // Wide-channel staggered distribution to avoid center North/South axis overlap
  const seatPositions = [
    { top: '12%', left: '20%' },               // North-West
    { top: '12%', right: '20%', left: 'auto' }, // North-East
    { top: '48%', left: '5%', transform: 'translateY(-50%)' },  // West
    { top: '48%', right: '5%', left: 'auto', transform: 'translateY(-50%)' }, // East
    { bottom: '40%', left: '20%' },            // South-West
    { bottom: '40%', right: '20%', left: 'auto' }, // South-East
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 font-['Inter',_sans-serif]">
      {/* Header */}
      <div className="px-10 py-6 bg-white flex items-center justify-between shadow-sm z-20 border-b border-gray-100">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white shadow-xl">
             <span className="font-black text-xl">C</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase font-['Montserrat',_sans-serif]">Coup</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">Live Table</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsRulesModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-900 font-bold text-sm transition-all border border-gray-100 flex items-center gap-2"
          >
            <span>Rules</span> 📜
          </button>
          <button 
            onClick={() => confirm('Exit game and return to lobby?') && clearSession()}
            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-all border border-rose-100"
          >
            Exit
          </button>
          <div className="font-mono text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
            {gameState.sessionId}
          </div>
        </div>
      </div>

      <RulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />

      {/* Table Area */}
      <div className="relative flex-1 bg-white overflow-hidden">
        {/* Subtle grid background for modern feel */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Improved Table Bounds */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[65%] bg-gray-50/50 rounded-[100px] border border-gray-100 pointer-events-none" />

        {isExchangePhase && gameState.exchangeOptions && (
          <ExchangeSelectionOverlay 
            options={gameState.exchangeOptions} 
            count={myPlayer?.influences?.filter(i => !i.isRevealed).length || 0}
            onConfirm={(selected) => sendMessage({ type: 'COUP_ACTION', actionType: 'FINALIZE_EXCHANGE', selectedRoles: selected })}
          />
        )}

        {isGameOver && (
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-700">
            <div className="max-w-md w-full bg-white rounded-[56px] p-16 shadow-2xl text-center border border-gray-100">
              <div className="text-7xl mb-8">🏆</div>
              <h2 className="text-5xl font-black text-gray-900 mb-4 tracking-tight font-['Montserrat',_sans-serif]">Winner!</h2>
              <p className="text-xl text-gray-500 mb-12 font-medium">
                <span className="text-indigo-600 font-black uppercase text-2xl">
                  {gameState.players.find(p => p.id === gameState.winner)?.name}
                </span> has claimed the table.
              </p>
              <button 
                onClick={() => sendMessage({ type: 'RESET_GAME' })}
                className="w-full bg-gray-900 text-white py-6 rounded-2xl font-black text-lg hover:bg-black transition-all active:scale-95 shadow-2xl"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Center Indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
          {isChallengePhase ? (
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="72" cy="72" r="60" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                <circle cx="72" cy="72" r="60" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray={377} strokeDashoffset={377 * (1 - timeLeft / 10)} className="transition-all duration-1000 linear" strokeLinecap="round" />
              </svg>
              <div className="bg-white rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-2xl border border-gray-50">
                <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Time</p>
                <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">{timeLeft}</p>
              </div>
            </div>
          ) : isLossPhase ? (
            <div className="px-14 py-10 rounded-[48px] bg-white border border-gray-100 shadow-2xl flex flex-col items-center animate-pulse">
              <span className="text-5xl mb-4">⚠️</span>
              <p className="text-[11px] text-rose-500 font-bold uppercase tracking-widest mb-1">Elimination Phase</p>
              <p className="text-2xl font-black text-gray-900">
                {isLoser ? 'Choose a card to lose' : `${gameState.players.find(p => p.id === gameState.loserId)?.name} is choosing...`}
              </p>
            </div>
          ) : (
            <div className="px-8 py-5 rounded-[32px] bg-white/90 backdrop-blur-xl border border-gray-100 shadow-2xl relative overflow-hidden">
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Current Turn</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight leading-none h-8 flex items-center justify-center">{activePlayer?.name || 'Waiting'}</p>
              {isMyTurn && <div className="mt-2 h-1 w-10 bg-indigo-600 mx-auto rounded-full animate-bounce" />}
            </div>
          )}
        </div>

        {/* Player Seats */}
        {gameState.players.filter(p => p.id !== myPlayerId).map((p, i) => (
          <div 
            key={p.id} 
            className={`absolute transition-all duration-500 z-10 ${selectedTarget === p.id ? 'scale-110 translate-y-[-10px]' : ''} ${!isChallengePhase && !isLossPhase && isMyTurn ? 'cursor-pointer hover:translate-y-[-5px]' : ''}`} 
            style={seatPositions[i % seatPositions.length] as React.CSSProperties}
            onClick={() => !isChallengePhase && !isLossPhase && isMyTurn && setSelectedTarget(p.id)}
          >
             {selectedTarget === p.id && (
               <div className="absolute -inset-6 bg-indigo-500/5 rounded-3xl animate-pulse border border-indigo-500/20" />
             )}
            <PlayerSeat player={p} isActive={activePlayer?.id === p.id} isSelf={false} />
          </div>
        ))}

        {/* Move Filter Log */}
        {gameState.lastMove && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-6">
            <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-2xl flex items-start gap-5 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white text-xl shadow-lg flex-shrink-0">
                💬
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Move Details</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">
                  {gameState.lastMove.details}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="px-10 py-10 bg-white border-t border-gray-100 shadow-2xl z-20">
        <div className="flex items-end gap-16 max-w-7xl mx-auto w-full">
          {/* My Hand */}
          <div className="hidden lg:flex flex-col gap-5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">My Cards</span>
              <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100 shadow-sm">{myPlayer?.coins}💰</span>
            </div>
            <div className="flex gap-4">
              {myPlayer?.influences?.map((inf, i) => (
                <div 
                  key={i} 
                  className={`
                    transition-all duration-300
                    ${isLossPhase && isLoser && !inf.isRevealed ? 'cursor-pointer hover:scale-110 hover:translate-y-[-10px] ring-4 ring-rose-500/10 rounded-2xl' : ''}
                  `}
                  onClick={() => isLossPhase && isLoser && !inf.isRevealed && handleAction('LOSE_INFLUENCE', undefined, { influenceIndex: i })}
                >
                  <InfluenceCard role={inf.role} isRevealed={inf.isRevealed} />
                </div>
              ))}
            </div>
          </div>

          {/* Action Grid */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center gap-5">
               <div className="h-[1px] flex-1 bg-gray-100" />
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.4em] px-4">
                {isChallengePhase ? 'Responses' : isLossPhase ? 'Select Loss' : 'Available Actions'}
              </span>
               <div className="h-[1px] flex-1 bg-gray-100" />
            </div>

            {isChallengePhase ? (
              <div className="flex gap-8 max-w-2xl mx-auto w-full">
                {isActor ? (
                  <div className="flex-1 py-10 bg-gray-50 border border-gray-100 rounded-3xl text-center shadow-inner">
                    <p className="text-lg font-bold text-gray-400 animate-pulse">Waiting for responses to your claim...</p>
                  </div>
                ) : hasPassed ? (
                  <div className="flex-1 py-10 bg-gray-50 border border-gray-100 rounded-3xl text-center shadow-inner">
                    <p className="text-lg font-bold text-gray-300">You have passed.</p>
                  </div>
                ) : (
                  <>
                    <ActionButton label="Challenge" onClick={() => handleAction('CHALLENGE')} color="rose" className="flex-1 py-8 text-lg" />
                    <ActionButton label="Pass" onClick={() => handleAction('PASS')} color="default" className="flex-1 py-8 text-lg" />
                  </>
                )}
              </div>
            ) : isLossPhase ? (
              <div className="flex-1 py-10 bg-rose-50/50 border border-rose-100 rounded-3xl text-center shadow-inner">
                <p className="text-xl font-black text-rose-600 uppercase tracking-widest">
                  {isLoser ? 'Select an influence to eliminate' : `${gameState.players.find(p => p.id === gameState.loserId)?.name} is discarding...`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 h-full">
                <ActionButton label="Income (+1)" onClick={() => handleAction('INCOME')} disabled={!isMyTurn} color="emerald" icon="💰" />
                <ActionButton label="Foreign Aid (+2)" onClick={() => handleAction('FOREIGN_AID')} disabled={!isMyTurn} color="emerald" icon="🚢" />
                <ActionButton label="Coup (-7)" onClick={() => handleAction('COUP', selectedTarget!)} disabled={!isMyTurn || (myPlayer?.coins || 0) < 7 || !selectedTarget} color="rose" icon="🔥" />
                <ActionButton label="Tax (+3)" onClick={() => handleAction('TAX')} disabled={!isMyTurn} icon="👑" color="indigo" />
                <ActionButton label="Assassinate (-3)" onClick={() => handleAction('ASSASSINATE', selectedTarget!)} disabled={!isMyTurn || (myPlayer?.coins || 0) < 3 || !selectedTarget} icon="🗡️" color="indigo" />
                <ActionButton label="Steal (+2)" onClick={() => handleAction('STEAL', selectedTarget!)} disabled={!isMyTurn || !selectedTarget} icon="🛡️" color="indigo" />
                <ActionButton label="Exchange" onClick={() => handleAction('EXCHANGE')} disabled={!isMyTurn} icon="📜" color="indigo" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, disabled, color = 'emerald', icon, className }: {
  label: string; onClick: () => void; disabled?: boolean; color?: 'emerald' | 'rose' | 'default' | 'indigo'; icon?: string; className?: string;
}) {
  const styles = {
    emerald: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20',
    rose: 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20',
    indigo: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20',
    default: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm'
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        px-4 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-3 shadow-xl active:scale-95
        ${disabled
          ? 'bg-gray-50 text-gray-200 border-none cursor-not-allowed opacity-50'
          : styles[color]
        }
        ${className}
      `}
    >
      {icon && <span className="text-2xl leading-none">{icon}</span>}
      <span className="text-center leading-none inline-block">{label}</span>
    </button>
  );
}

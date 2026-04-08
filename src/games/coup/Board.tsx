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
  
  // Custom fluid dimensions using clamp
  // Custom fluid dimensions using clamp - Shrink significantly to gain space
  const widthClass = isSmall ? 'w-[clamp(2rem,3vw,2.8rem)]' : 'w-[clamp(3.5rem,6vw,5rem)]';
  const heightClass = isSmall ? 'h-[clamp(2.8rem,5vw,4rem)]' : 'h-[clamp(5rem,9vw,7rem)]';

  if (isHidden) {
    return (
      <div className={`
        ${widthClass} ${heightClass}
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
      ${widthClass} ${heightClass}
      bg-white rounded-xl shadow-md border-2 flex flex-col items-center justify-center relative transition-all duration-300
      ${!isRevealed ? 'border-gray-100' : ''}
    `} style={{ borderColor: isRevealed ? roleColor : undefined }}>
      <span className={isSmall ? 'text-[clamp(0.8rem,1.5vw,1.2rem)]' : 'text-[clamp(1.5rem,3vw,2.2rem)]'}>{roleIcon}</span>
      <span className={`${isSmall ? 'text-[clamp(5.5px,0.7vw,7px)]' : 'text-[clamp(7px,0.8vw,9px)]'} font-bold uppercase tracking-tighter mt-1 text-center px-1 break-words leading-tight`} style={{ color: roleColor }}>{role}</span>
      {!isRevealed && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white shadow-sm" title="Private" />
      )}
    </div>
  );
}

function PlayerSeat({ player, isActive, isSelf, size = 'normal' }: {
  player: Player; isActive: boolean; isSelf: boolean; size?: 'normal' | 'compact'
}) {
  const isAlive = player.influences?.some(i => !i.isRevealed) ?? true;
  const isCompact = size === 'compact';

  return (
    <div className={`flex ${isCompact ? 'flex-row' : 'flex-col'} items-center gap-2 md:gap-4 transition-all duration-500 ${isActive ? 'scale-105' : ''} ${!isAlive ? 'opacity-30 grayscale blur-[0.5px]' : ''}`}>
      <div className="relative">
        <div className={`
          ${isCompact ? 'w-12 h-12 rounded-xl' : 'w-[clamp(3.5rem,8vw,4.5rem)] h-[clamp(3.5rem,8vw,4.5rem)] rounded-2xl'} 
          flex items-center justify-center text-xl font-bold bg-white shadow-2xl border-2 transition-all
          ${isActive ? 'border-indigo-500 ring-4 md:ring-6 ring-indigo-500/10' : 'border-transparent'}
        `}>
          <div className={`${isCompact ? 'w-10 h-10 rounded-lg text-lg' : 'w-[clamp(2.5rem,6vw,3.5rem)] h-[clamp(2.5rem,6vw,3.5rem)] rounded-xl text-[clamp(1rem,2vw,1.5rem)]'} bg-gray-50 flex items-center justify-center text-gray-900 shadow-inner font-black`}>
            {player.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className={`absolute -bottom-1 -right-1 bg-emerald-500 text-white font-bold px-1.5 md:px-2 py-0.5 rounded-lg shadow-xl border-2 border-white flex items-center gap-1 ${isCompact ? 'text-[9px]' : 'text-[clamp(9px,1vw,11px)]'}`}>
          {player.coins}💰
        </div>
      </div>
      <div className={`flex flex-col ${isCompact ? 'items-start' : 'items-center'}`}>
        <span className={`${isCompact ? 'text-[10px]' : 'text-[clamp(10px,1vw,12px)]'} font-bold text-gray-900 uppercase tracking-wider bg-white/80 px-2 md:px-3 py-0.5 rounded-lg backdrop-blur-sm border border-white shadow-sm truncate max-w-[80px] md:max-w-none`}>
          {player.name} {isSelf ? '(You)' : ''}
        </span>
        {!isCompact && (
          <div className="flex gap-1 mt-2">
            {player.influences?.map((inf, i) => (
              <InfluenceCard key={i} role={inf.role} isRevealed={inf.isRevealed} size="small" />
            ))}
          </div>
        )}
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
    const activePhase = ['WAITING_FOR_CHALLENGE', 'WAITING_FOR_BLOCK', 'WAITING_FOR_BLOCK_CHALLENGE'].includes(gameState.phase);
    if (activePhase && gameState.pendingAction) {
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
  const isBlockPhase = gameState.phase === 'WAITING_FOR_BLOCK';
  const isBlockChallengePhase = gameState.phase === 'WAITING_FOR_BLOCK_CHALLENGE';
  const isLossPhase = gameState.phase === 'SELECT_INFLUENCE_TO_LOSE';
  const isGameOver = gameState.phase === 'GAME_OVER';
  const isLoser = gameState.loserId === myPlayerId;
  const isActor = gameState.pendingAction?.actorId === myPlayerId;
  const isTarget = gameState.pendingAction?.targetId === myPlayerId;
  const hasPassed = gameState.pendingAction?.challengers?.includes(myPlayerId);
  const isBlocker = gameState.pendingAction?.blocks?.blockerId === myPlayerId;
  
  const isResponsePhase = isChallengePhase || isBlockPhase || isBlockChallengePhase;

  const handleAction = (type: string, targetId?: string, extra?: any) => {
    sendMessage({ type: 'COUP_ACTION', actionType: type, targetId, ...extra, timestamp: Date.now() });
    setSelectedTarget(null);
  };

  // Wide-channel staggered distribution to avoid center North/South axis overlap
  const seatPositions = [
    { top: '10%', left: '15%' },               // North-West
    { top: '10%', right: '15%', left: 'auto' }, // North-East
    { top: '45%', left: '4%', transform: 'translateY(-50%)' },  // West
    { top: '45%', right: '4%', left: 'auto', transform: 'translateY(-50%)' }, // East
    { bottom: '38%', left: '15%' },            // South-West
    { bottom: '38%', right: '15%', left: 'auto' }, // South-East
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 font-['Inter',_sans-serif]">
      {/* Header - Made smaller per user request */}
      <div className="px-6 md:px-10 py-2 md:py-3 bg-white flex items-center justify-between shadow-sm z-20 border-b border-gray-100">
        <div className="flex items-center gap-3 md:gap-5">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:xl bg-gray-900 flex items-center justify-center text-white shadow-xl">
             <span className="font-black text-base md:lg">C</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-none uppercase font-['Montserrat',_sans-serif]">Coup</h1>
            <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-0.5">Live Table</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setIsRulesModalOpen(true)}
            className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-900 font-bold text-[9px] md:text-xs transition-all border border-gray-100 flex items-center gap-2"
          >
            <span className="hidden xs:inline">Rules</span> 📜
          </button>
          <button 
            onClick={() => confirm('Exit game and return to lobby?') && clearSession()}
            className="px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[9px] md:text-xs transition-all border border-rose-100"
          >
            Exit
          </button>
          <div className="hidden md:block font-mono text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
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
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[65%] bg-gray-50/50 rounded-[100px] border border-gray-100 pointer-events-none" />

        {/* Mobile Opponent Carousel */}
        <div className="md:hidden flex overflow-x-auto px-6 py-6 gap-4 no-scrollbar border-b border-gray-50 bg-white/50">
          {gameState.players.filter(p => p.id !== myPlayerId).map((p) => (
            <div 
              key={p.id} 
              className={`flex-shrink-0 transition-all duration-300 ${selectedTarget === p.id ? 'scale-105 ring-2 ring-indigo-500 ring-offset-4 rounded-xl' : ''}`}
              onClick={() => !isResponsePhase && !isLossPhase && isMyTurn && setSelectedTarget(p.id)}
            >
              <PlayerSeat player={p} isActive={activePlayer?.id === p.id} isSelf={false} size="compact" />
            </div>
          ))}
        </div>

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
        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 w-full px-8 pointer-events-none">
          {isResponsePhase ? (
            <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto flex items-center justify-center bg-white/80 backdrop-blur-xl rounded-full shadow-2xl border border-white">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#6366f1" strokeWidth="3" 
                  strokeDasharray="264" 
                  strokeDashoffset={264 * (1 - timeLeft / 10)} 
                  className="transition-all duration-1000 linear" 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Time</p>
                <p className="text-2xl md:text-3xl font-black text-gray-900 tabular-nums leading-none">{timeLeft}</p>
              </div>
            </div>
          ) : isLossPhase ? (
            <div className="px-6 md:px-10 py-5 md:py-8 rounded-[32px] bg-white border border-gray-100 shadow-2xl flex flex-col items-center animate-pulse mx-auto max-w-sm">
              <span className="text-2xl md:text-4xl mb-2">⚠️</span>
              <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mb-1">Elimination</p>
              <p className="text-[clamp(14px,1.5vw,18px)] font-black text-gray-900">
                {isLoser ? 'Discard a card' : `${gameState.players.find(p => p.id === gameState.loserId)?.name} is discarding...`}
              </p>
            </div>
          ) : (
            <div className="px-5 md:px-6 py-2.5 md:py-3.5 rounded-[20px] md:rounded-[24px] bg-white/90 backdrop-blur-xl border border-gray-100 shadow-2xl relative overflow-hidden inline-block mx-auto min-w-[120px]">
              <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Turn</p>
              <p className="text-[clamp(16px,1.8vw,22px)] font-black text-gray-900 tracking-tight leading-none flex items-center justify-center">
                {activePlayer ? (activePlayer.name.length > 12 ? activePlayer.name.substring(0, 10) + '...' : activePlayer.name) : 'Waiting'}
              </p>
              {isMyTurn && <div className="mt-1 h-0.5 w-6 bg-indigo-600 mx-auto rounded-full animate-bounce" />}
            </div>
          )}
        </div>

        {/* Desktop Player Seats */}
        <div className="hidden md:block">
          {gameState.players.filter(p => p.id !== myPlayerId).map((p, i) => (
            <div 
              key={p.id} 
              className={`absolute transition-all duration-500 z-10 ${selectedTarget === p.id ? 'scale-110 translate-y-[-10px]' : ''} ${!isResponsePhase && !isLossPhase && isMyTurn ? 'cursor-pointer hover:translate-y-[-5px]' : ''}`} 
              style={seatPositions[i % seatPositions.length] as React.CSSProperties}
              onClick={() => !isResponsePhase && !isLossPhase && isMyTurn && setSelectedTarget(p.id)}
            >
              {selectedTarget === p.id && (
                <div className="absolute -inset-6 bg-indigo-500/5 rounded-3xl animate-pulse border border-indigo-500/20" />
              )}
              <PlayerSeat player={p} isActive={activePlayer?.id === p.id} isSelf={false} />
            </div>
          ))}
        </div>

        {/* Move Filter Log - Improved for overflow and readability */}
        {gameState.lastMove && (
          <div className="absolute bottom-6 right-6 z-40 w-full max-w-[320px] px-2 pointer-events-none">
            <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-[24px] p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-right-4 duration-500 pointer-events-auto">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-base shadow-inner flex-shrink-0 mt-0.5">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] md:text-xs font-medium text-white/90 leading-relaxed break-words line-clamp-3">
                  <span className="font-black text-indigo-400 mr-1">{gameState.lastMove.details.split(' ')[0]}</span>
                  {gameState.lastMove.details.substring(gameState.lastMove.details.indexOf(' '))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="px-6 md:px-10 py-6 md:py-10 bg-white border-t border-gray-100 shadow-2xl z-20">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-6 md:gap-10 lg:gap-16 max-w-7xl mx-auto w-full">
          {/* My Info (Mobile/Desktop) */}
          <div className="flex flex-col gap-4 md:gap-5">
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">My Identity</span>
                <span className="text-xs font-bold text-gray-900">{myPlayer?.name}</span>
              </div>
              <span className="text-xs md:text-sm font-black text-emerald-600 bg-emerald-50 px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-emerald-100 shadow-sm">{myPlayer?.coins}💰</span>
            </div>
            <div className="flex gap-2 md:gap-3 overflow-hidden py-2">
              {myPlayer?.influences?.map((inf, i) => (
                <div 
                  key={i} 
                  className={`
                    transition-all duration-300 flex-shrink-0
                    ${isLossPhase && isLoser && !inf.isRevealed ? 'cursor-pointer scale-105 ring-4 ring-rose-500/10 rounded-2xl' : ''}
                  `}
                  onClick={() => isLossPhase && isLoser && !inf.isRevealed && handleAction('LOSE_INFLUENCE', undefined, { influenceIndex: i })}
                >
                  <InfluenceCard role={inf.role} isRevealed={inf.isRevealed} size={window.innerWidth < 768 ? 'small' : 'normal'} />
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
              <div className="flex flex-col sm:flex-row gap-4 md:gap-8 max-w-2xl mx-auto w-full">
                {isActor ? (
                  <div className="flex-1 py-6 md:py-10 bg-gray-50 border border-gray-100 rounded-3xl text-center shadow-inner">
                    <p className="text-sm md:text-lg font-bold text-gray-400 animate-pulse">Waiting for challenges...</p>
                  </div>
                ) : hasPassed ? (
                  <div className="flex-1 py-6 md:py-10 bg-gray-50 border border-gray-100 rounded-3xl text-center shadow-inner">
                    <p className="text-sm md:text-lg font-bold text-gray-300">You have passed.</p>
                  </div>
                ) : (
                  <>
                    <ActionButton label="Challenge" onClick={() => handleAction('CHALLENGE')} color="rose" className="flex-1 py-6 md:py-8 text-base md:text-lg" />
                    <ActionButton label="Pass" onClick={() => handleAction('PASS')} color="default" className="flex-1 py-6 md:py-10 text-base md:text-lg" />
                  </>
                )}
              </div>
            ) : isBlockPhase ? (
              <div className="flex flex-col sm:flex-row gap-4 md:gap-8 max-w-2xl mx-auto w-full">
               {(isTarget || (gameState.pendingAction?.type === 'FOREIGN_AID' && !isActor)) ? (
                  <>
                    {gameState.pendingAction?.type === 'STEAL' ? (
                      <>
                        <ActionButton label="Block (Captain)" onClick={() => handleAction('BLOCK', undefined, { roleClaimed: 'CAPTAIN' })} color="indigo" icon="🛡️" className="flex-1 py-6 md:py-8" />
                        <ActionButton label="Block (Ambassador)" onClick={() => handleAction('BLOCK', undefined, { roleClaimed: 'AMBASSADOR' })} color="emerald" icon="📜" className="flex-1 py-6 md:py-8" />
                      </>
                    ) : (
                      <ActionButton 
                        label={`Block (${gameState.pendingAction?.type === 'FOREIGN_AID' ? 'Duke' : 'Contessa'})`} 
                        onClick={() => handleAction('BLOCK', undefined, { roleClaimed: gameState.pendingAction?.type === 'FOREIGN_AID' ? 'DUKE' : 'CONTESSA' })} 
                        color="indigo" 
                        icon={gameState.pendingAction?.type === 'FOREIGN_AID' ? '👑' : '🏰'} 
                        className="flex-1 py-6 md:py-8" 
                      />
                    )}
                    <ActionButton label="Pass" onClick={() => handleAction('PASS')} color="default" className="flex-1 py-6 md:py-8" />
                  </>
                ) : (
                  <div className="flex-1 py-6 md:py-10 bg-gray-50 border border-gray-100 rounded-3xl text-center shadow-inner">
                    <p className="text-sm md:text-lg font-bold text-gray-400">Waiting for {isActor ? 'the target' : 'others'} to block...</p>
                  </div>
                )}
              </div>
            ) : isBlockChallengePhase ? (
              <div className="flex flex-col sm:flex-row gap-4 md:gap-8 max-w-2xl mx-auto w-full">
                {isBlocker ? (
                  <div className="flex-1 py-6 md:py-10 bg-gray-50 border border-gray-100 rounded-3xl text-center shadow-inner">
                    <p className="text-sm md:text-lg font-bold text-gray-400 animate-pulse">Waiting for challenges to your block...</p>
                  </div>
                ) : hasPassed ? (
                  <div className="flex-1 py-6 md:py-10 bg-gray-50 border border-gray-100 rounded-3xl text-center shadow-inner">
                    <p className="text-sm md:text-lg font-bold text-gray-300">You have passed.</p>
                  </div>
                ) : (
                  <>
                    <ActionButton label="Challenge Block" onClick={() => handleAction('CHALLENGE')} color="rose" className="flex-1 py-6 md:py-8 text-base md:text-lg" />
                    <ActionButton label="Pass" onClick={() => handleAction('PASS')} color="default" className="flex-1 py-6 md:py-8 text-base md:text-lg" />
                  </>
                )}
              </div>
            ) : isLossPhase ? (
              <div className="flex-1 py-6 md:py-10 bg-rose-50/50 border border-rose-100 rounded-3xl text-center shadow-inner">
                <p className="text-base md:text-xl font-black text-rose-600 uppercase tracking-widest">
                  {isLoser ? 'Select influence to lose' : `Waiting for ${gameState.players.find(p => p.id === gameState.loserId)?.name}...`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-4 h-full">
                <ActionButton label="Income" onClick={() => handleAction('INCOME')} disabled={!isMyTurn} color="emerald" icon="💰" />
                <ActionButton label="Foreign Aid" onClick={() => handleAction('FOREIGN_AID')} disabled={!isMyTurn} color="emerald" icon="🚢" />
                <ActionButton 
                  label="Coup" 
                  onClick={() => {
                    if (!selectedTarget) {
                      alert('Please select a target first!');
                      return;
                    }
                    handleAction('COUP', selectedTarget);
                  }} 
                  disabled={!isMyTurn || (myPlayer?.coins || 0) < 7} 
                  color="rose" 
                  icon="🔥" 
                />
                <ActionButton label="Tax" onClick={() => handleAction('TAX')} disabled={!isMyTurn} icon="👑" color="indigo" />
                <ActionButton 
                  label="Assassinate" 
                  onClick={() => {
                    if (!selectedTarget) {
                      alert('Please select a target first!');
                      return;
                    }
                    handleAction('ASSASSINATE', selectedTarget);
                  }} 
                  disabled={!isMyTurn || (myPlayer?.coins || 0) < 3} 
                  icon="🗡️" 
                  color="indigo" 
                />
                <ActionButton 
                  label="Steal" 
                  onClick={() => {
                    if (!selectedTarget) {
                      alert('Please select a target first!');
                      return;
                    }
                    handleAction('STEAL', selectedTarget);
                  }} 
                  disabled={!isMyTurn} 
                  icon="🛡️" 
                  color="indigo" 
                />
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
        px-2 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[9px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 shadow-xl active:scale-95
        ${disabled
          ? 'bg-gray-50 text-gray-200 border-none cursor-not-allowed opacity-50'
          : styles[color]
        }
        ${className}
      `}
    >
      {icon && <span className="text-lg md:text-xl leading-none">{icon}</span>}
      <span className="text-center leading-none inline-block truncate w-full">{label}</span>
    </button>
  );
}

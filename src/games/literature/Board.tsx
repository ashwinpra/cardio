import { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import type { Card, Player, HalfSuitName, GameState as LiteratureGameState } from './types';
import { getHalfSuit, getCardsInHalfSuit, isSameCard } from './logic';

// ─── Constants ───────────────────────────────────────────

const SUIT_SYMBOLS: Record<string, string> = {
  CLUB: '♣', DIAMOND: '♦', HEART: '♥', SPADE: '♠', JOKER: '★',
};

const HALF_SUIT_LABELS: Record<string, string> = {
  LOW_CLUB: 'Low Clubs', HIGH_CLUB: 'High Clubs',
  LOW_DIAMOND: 'Low Diamonds', HIGH_DIAMOND: 'High Diamonds',
  LOW_HEART: 'Low Hearts', HIGH_HEART: 'High Hearts',
  LOW_SPADE: 'Low Spades', HIGH_SPADE: 'High Spades',
  EIGHTS_AND_JOKERS: 'Eights & Jokers',
};

const ALL_HALF_SUITS: HalfSuitName[] = [
  'LOW_CLUB', 'HIGH_CLUB', 'LOW_DIAMOND', 'HIGH_DIAMOND',
  'LOW_HEART', 'HIGH_HEART', 'LOW_SPADE', 'HIGH_SPADE',
  'EIGHTS_AND_JOKERS',
];

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'Jk1', 'Jk2'];

function isRedSuit(suit: string) {
  return suit === 'HEART' || suit === 'DIAMOND';
}

function cardKey(c: Card) {
  return `${c.rank}-${c.suit}`;
}

// ─── Playing Card ────────────────────────────────────────

function PlayingCard({ card, selected, onClick, size = 'normal' }: {
  card: Card; selected?: boolean; onClick?: () => void; size?: 'normal' | 'small';
}) {
  const red = isRedSuit(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit] || '?';
  const rank = card.rank === 'Jk1' ? '★' : card.rank === 'Jk2' ? '★' : card.rank;
  const isSmall = size === 'small';
  const color = red ? '#dc2626' : '#000000';

  // Fluid dimensions using clamp
  const widthClass = isSmall ? 'w-[clamp(42px,5vw,52px)]' : 'w-[clamp(54px,7vw,64px)]';
  const heightClass = isSmall ? 'h-[clamp(60px,7vw,72px)]' : 'h-[clamp(76px,10vw,88px)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex-shrink-0 overflow-hidden bg-white
        ${widthClass} ${heightClass}
        rounded-lg cursor-pointer select-none
        transition-all duration-200 ease-out
        ${selected
          ? 'ring-2 ring-emerald-500 -translate-y-3 shadow-[0_8px_24px_rgba(16,185,129,0.25)]'
          : 'shadow-[0_1px_4px_rgba(25,28,29,0.1)] hover:-translate-y-1.5 hover:shadow-[0_4px_12px_rgba(25,28,29,0.12)]'}
      `}
    >
      {/* Top-left */}
      <div className={`absolute top-0.5 left-1 leading-none ${isSmall ? 'text-[9px]' : 'text-xs'} font-bold`} style={{ color }}>
        <div>{rank}</div>
        <div className={isSmall ? 'text-[8px]' : 'text-[9px]'}>{symbol}</div>
      </div>
      {/* Center */}
      <div className={`absolute inset-0 flex items-center justify-center ${isSmall ? 'text-base' : 'text-xl'}`} style={{ color }}>
        {symbol}
      </div>
      {/* Bottom-right */}
      <div className={`absolute bottom-0.5 right-1 leading-none rotate-180 ${isSmall ? 'text-[9px]' : 'text-xs'} font-bold`} style={{ color }}>
        <div>{rank}</div>
        <div className={isSmall ? 'text-[8px]' : 'text-[9px]'}>{symbol}</div>
      </div>
    </button>
  );
}

// ─── Player Seat ─────────────────────────────────────────

function PlayerSeat({ player, isActive, cardCount, isTeamA, size = 'normal' }: {
  player: Player; isActive: boolean; cardCount: number; isTeamA: boolean; size?: 'normal' | 'compact'
}) {
  const isCompact = size === 'compact';

  return (
    <div className={`flex ${isCompact ? 'flex-row' : 'flex-col'} items-center gap-1.5 md:gap-1 transition-all duration-300 ${isActive ? 'scale-105' : ''}`}>
      <div
        className={`
          ${isCompact ? 'w-8 h-8 text-xs' : 'w-[clamp(2.5rem,5vw,3rem)] h-[clamp(2.5rem,5vw,3rem)] text-[clamp(12px,1.2vw,16px)]'}
          rounded-full flex items-center justify-center font-bold
          ${isTeamA ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}
          ${isActive ? (isTeamA ? 'ring-2 ring-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.2)]' : 'ring-2 ring-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.2)]') : ''}
        `}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div className={`flex flex-col ${isCompact ? 'items-start' : 'items-center'} min-w-0`}>
        <span className={`${isCompact ? 'text-[10px]' : 'text-[clamp(10px,1vw,11px)]'} font-medium text-[#3c4a42] truncate max-w-[60px] md:max-w-[80px]`}>{player.name}</span>
        <span className={`text-[clamp(8px,0.8vw,10px)] px-1.5 py-0.5 rounded-full font-semibold ${isTeamA ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
          {cardCount}
        </span>
      </div>
    </div>
  );
}

// ─── Ask Modal ───────────────────────────────────────────

function AskModal({ opponents, myHand, onAsk, onClose }: {
  opponents: Player[]; myHand: Card[];
  onAsk: (targetId: string, card: Card) => void; onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [target, setTarget] = useState<Player | null>(null);

  const myHalfSuits = useMemo(() => {
    const s = new Set<HalfSuitName>();
    myHand.forEach(c => s.add(getHalfSuit(c)));
    return Array.from(s);
  }, [myHand]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl p-6 w-full mx-4 shadow-[0_8px_40px_rgba(25,28,29,0.12)] transition-all ${step === 1 ? 'max-w-md' : 'max-w-2xl'}`} onClick={e => e.stopPropagation()}>
        <p className="text-[10px] font-semibold text-[#6c7a71] uppercase tracking-[0.1em] mb-1">
          {step === 1 ? 'Step 1: Target' : 'Step 2: Choose Card'}
        </p>
        <h2 className="text-lg font-semibold text-[#191c1d] mb-4">
          {step === 1 ? 'Choose an Opponent' : `Asking ${target?.name}`}
        </h2>

        {step === 1 && (
          <div className="grid grid-cols-1 gap-2">
            {opponents.map(op => (
              <button key={op.id} onClick={() => { setTarget(op); setStep(2); }}
                className="w-full py-4 px-5 rounded-2xl text-left text-[#191c1d] bg-[#f3f4f5] hover:bg-[#edeeef] transition-all text-sm font-semibold flex items-center justify-between group">
                <span>{op.name}</span>
                <span className="text-[10px] text-[#bbcabf] group-hover:text-[#6c7a71]">Select →</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
            {myHalfSuits.map(hs => {
              const allCards = getCardsInHalfSuit(hs);
              return (
                <div key={hs} className="space-y-3">
                  <h3 className="text-[11px] font-bold text-[#6c7a71] uppercase tracking-wider border-b border-emerald-100 pb-1.5">{HALF_SUIT_LABELS[hs]}</h3>
                  <div className="flex flex-wrap gap-3">
                    {allCards.map(c => {
                      const isHeld = myHand.some(m => isSameCard(m, c));
                      return (
                        <div key={cardKey(c)} className="relative group">
                          <PlayingCard 
                            card={c} 
                            size="small"
                            onClick={() => !isHeld && target && onAsk(target.id, c)}
                          />
                          {isHeld && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg cursor-not-allowed">
                              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded uppercase tracking-tighter">Held</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {myHalfSuits.length === 0 && (
              <p className="text-sm text-[#6c7a71] text-center py-8">You don't hold any cards to start an ask!</p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl bg-[#f3f4f5] text-[#6c7a71] hover:bg-[#edeeef] text-sm font-medium transition-colors">
              ← Change Target
            </button>
          )}
          <button onClick={onClose} className={`py-2.5 rounded-xl bg-[#f3f4f5] text-[#6c7a71] hover:bg-[#edeeef] text-sm font-medium transition-colors ${step === 1 ? 'w-full' : 'flex-1'}`}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Claim Modal ─────────────────────────────────────────

function ClaimModal({ onClaim, onClose }: {
  onClaim: (halfSuit: HalfSuitName) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-xl w-full mx-4 shadow-[0_8px_60px_rgba(25,28,29,0.15)]" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-[0.2em] mb-1.5">Collection Claim</p>
          <h2 className="text-2xl font-bold text-[#191c1d]">Choose a Half-Suit</h2>
          <p className="text-sm text-[#6c7a71] mt-1">Select a book your team collectively holds.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {ALL_HALF_SUITS.map(hs => (
            <button key={hs} onClick={() => onClaim(hs)}
              className="group relative flex flex-col items-center justify-center p-4 rounded-2xl bg-[#f3f4f5] hover:bg-emerald-50 hover:ring-2 hover:ring-emerald-200 transition-all text-center">
              <span className="text-[11px] font-bold text-[#191c1d] group-hover:text-emerald-700 leading-tight">
                {HALF_SUIT_LABELS[hs]}
              </span>
              <div className="mt-2 flex -space-x-1 opacity-40 group-hover:opacity-100 transition-opacity">
                {[1,2,3].map(i => (
                  <div key={i} className="w-2.5 h-3.5 bg-white border border-[#d9dadb] rounded-[1px]" />
                ))}
              </div>
            </button>
          ))}
        </div>

        <button onClick={onClose} className="mt-8 w-full py-3 rounded-2xl bg-[#f3f4f5] text-[#6c7a71] hover:bg-[#edeeef] hover:text-[#191c1d] text-sm font-semibold transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Game Over ───────────────────────────────────────────

function GameOverScreen() {
  const { gameState: baseState } = useGame();
  const gameState = baseState as LiteratureGameState;
  if (!gameState) return null;
  const winner = gameState.scores.teamA > gameState.scores.teamB ? 'Team A' : 'Team B';
  const isA = gameState.scores.teamA > gameState.scores.teamB;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="text-center bg-white p-12 rounded-3xl shadow-[0_4px_40px_rgba(25,28,29,0.08)]">
        <p className="text-[11px] text-[#6c7a71] uppercase tracking-[0.15em] mb-2">Game Over</p>
        <h1 className={`text-4xl font-bold mb-4 ${isA ? 'text-emerald-600' : 'text-rose-500'}`}>
          {winner} Wins!
        </h1>
        <div className="flex gap-8 justify-center mb-8">
          <div><span className="text-3xl font-bold text-emerald-600">{gameState.scores.teamA}</span><span className="text-[#6c7a71] ml-1.5 text-sm">Team A</span></div>
          <div><span className="text-3xl font-bold text-rose-500">{gameState.scores.teamB}</span><span className="text-[#6c7a71] ml-1.5 text-sm">Team B</span></div>
        </div>
        <button onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-full text-white font-semibold transition-all hover:shadow-lg"
          style={{ background: 'linear-gradient(180deg, #10b981, #006c49)' }}>
          New Game
        </button>
      </div>
    </div>
  );
}

// ─── Main Board ──────────────────────────────────────────

export default function GameBoard() {
  const { gameState: baseState, myPlayerId, cardCounts, sendMessage, clearSession } = useGame();
  const gameState = baseState as LiteratureGameState;
  const [showAskModal, setShowAskModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);

  if (!gameState || !myPlayerId) return null;
  if (gameState.phase === 'GAME_OVER') return <GameOverScreen />;

  const myHand = gameState.hands[myPlayerId] || [];
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === myPlayerId;
  const myPlayer = gameState.players.find((p: any) => p.id === myPlayerId) as Player;
  const opponents = gameState.players.filter((p: any) => p.team !== myPlayer?.team);
  const otherPlayers = gameState.players.filter((p: any) => p.id !== myPlayerId);

  // Group + sort hand
  const groupedHand: Record<string, Card[]> = {};
  myHand.forEach((c: any) => {
    const hs = getHalfSuit(c);
    if (!groupedHand[hs]) groupedHand[hs] = [];
    groupedHand[hs].push(c);
  });
  for (const hs of Object.keys(groupedHand)) {
    groupedHand[hs].sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));
  }

  const handleAsk = (targetId: string, card: Card) => {
    sendMessage({ type: 'ASK_CARD', askerId: myPlayerId, targetId, card });
    setShowAskModal(false);
  };

  const handleClaim = (halfSuit: HalfSuitName) => {
    sendMessage({ type: 'CLAIM_BOOK', claimerId: myPlayerId, halfSuit });
    setShowClaimModal(false);
  };

  const seatPositions = [
    { top: '8%', left: '50%', transform: 'translateX(-50%)' },
    { top: '22%', left: '12%' },
    { top: '22%', right: '12%', left: 'auto' },
    { top: '50%', left: '8%' },
    { top: '50%', right: '8%', left: 'auto' },
    { top: '68%', left: '25%' },
    { top: '68%', right: '25%', left: 'auto' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8f9fa]">
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Score Bar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-white flex-shrink-0 shadow-[0_1px_0_#edeeef] z-20">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] md:text-xs font-semibold text-emerald-600 uppercase tracking-wider hidden xs:inline">Team A</span>
              <span className="text-lg md:text-xl font-bold text-[#191c1d] ml-0.5">{gameState.scores.teamA}</span>
            </div>
            <span className="text-[#d9dadb]">·</span>
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500" />
              <span className="text-[10px] md:text-xs font-semibold text-rose-500 uppercase tracking-wider hidden xs:inline">Team B</span>
              <span className="text-lg md:text-xl font-bold text-[#191c1d] ml-0.5">{gameState.scores.teamB}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <span className="hidden sm:inline text-xs font-mono font-bold text-[#006c49] px-2 py-0.5 rounded-md bg-emerald-50">
              {gameState.sessionId}
            </span>
            <button 
              onClick={() => confirm('Exit game?') && clearSession()}
              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 relative overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 45%, #d1fae5 0%, #ecfdf5 40%, #f8f9fa 100%)' }}>

          {/* Mobile Opponent Carousel */}
          <div className="md:hidden flex overflow-x-auto px-4 py-4 gap-3 no-scrollbar absolute top-0 left-0 w-full z-10 bg-white/20 backdrop-blur-sm border-b border-white/40">
            {otherPlayers.map((p: any) => (
              <div key={p.id} className="flex-shrink-0">
                <PlayerSeat player={p} isActive={activePlayer?.id === p.id} cardCount={cardCounts[p.id] || 0} isTeamA={p.team === 'TEAM_A'} size="compact" />
              </div>
            ))}
          </div>

          {/* Center Indicator */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 w-full px-8 pointer-events-none">
            <div className="px-5 md:px-6 py-2.5 md:py-3.5 rounded-xl md:2xl bg-white/80 backdrop-blur-md shadow-[0_4px_24px_rgba(25,28,29,0.06)] border border-white/50 inline-block mx-auto min-w-[120px]">
              <p className="text-[8px] md:text-[9px] text-[#6c7a71] uppercase tracking-[0.15em] leading-none mb-1">Turn</p>
              <p className="text-[clamp(16px,1.8vw,20px)] font-bold text-[#191c1d] leading-none">
                {activePlayer ? (activePlayer.name.length > 12 ? activePlayer.name.substring(0, 10) + '...' : activePlayer.name) : '...'}
              </p>
              {isMyTurn && <p className="text-[clamp(9px,1vw,11px)] text-emerald-600 mt-1 animate-pulse font-medium leading-none">Your move</p>}
            </div>
          </div>

          {/* Desktop Seats */}
          <div className="hidden md:block">
            {otherPlayers.map((p: any, i: number) => (
              <div key={p.id} className="absolute" style={seatPositions[i % seatPositions.length] as React.CSSProperties}>
                <PlayerSeat player={p} isActive={activePlayer?.id === p.id} cardCount={cardCounts[p.id] || 0} isTeamA={p.team === 'TEAM_A'} />
              </div>
            ))}
          </div>

          {/* Last Move Overlay - Repositioned to avoid center clashing */}
          {gameState.lastMove && (
            <div className="absolute top-[28%] md:top-auto md:bottom-8 left-1/2 md:left-auto md:right-8 -translate-x-1/2 md:translate-x-0 z-40 w-full max-w-[280px] md:max-w-[320px] px-4">
              <div className="bg-[#191c1d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 md:p-3.5 shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-500">
                <div className={`w-1 h-6 md:h-8 rounded-full shrink-0 ${gameState.lastMove.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-bold text-[#6c7a71] uppercase tracking-wider mb-0.5">Last Move</p>
                  <p className="text-[10px] md:text-xs font-medium text-white leading-tight">
                    {gameState.lastMove.details}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Books */}
          {gameState.books.length > 0 && (
            <div className="absolute bottom-1 right-2 md:bottom-3 md:left-4 flex gap-1 flex-wrap max-w-[120px] xs:max-w-none justify-end md:justify-start pointer-events-none">
              {gameState.books.map((b: any, i: number) => (
                <span key={i} className={`text-[7px] md:text-[9px] px-1.5 md:px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider shadow-sm
                  ${b.team === 'TEAM_A' ? 'bg-emerald-100/90 text-emerald-700' : 'bg-rose-100/90 text-rose-600'}`}>
                  {HALF_SUIT_LABELS[b.halfSuit]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hand & Actions */}
        <div className="px-4 md:px-5 py-3 md:py-4 bg-white flex-shrink-0 shadow-[0_-1px_0_#edeeef] z-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 md:gap-6 max-w-7xl mx-auto w-full">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6c7a71] uppercase tracking-[0.1em] font-bold">Your Hand</span>
                  <span className="text-[10px] text-[#bbcabf]">· {myHand.length} cards</span>
                </div>
                <span className="xs:hidden text-[9px] font-bold text-emerald-600 uppercase">Swipe for more →</span>
              </div>
              
              <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-1">
                {Object.entries(groupedHand).map(([hs, cards]) => (
                  <div key={hs} className="flex-shrink-0">
                    <span className="text-[8px] md:text-[9px] text-[#bbcabf] font-bold uppercase tracking-wider block mb-1.5">{HALF_SUIT_LABELS[hs]}</span>
                    <div className="flex gap-1.5">
                      {cards.map(c => <PlayingCard key={cardKey(c)} card={c} size="small" />)}
                    </div>
                  </div>
                ))}
                {myHand.length === 0 && <p className="text-xs text-[#bbcabf] italic py-2 md:py-4">No cards in hand</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex sm:flex-col gap-2 flex-shrink-0">
              <button disabled={!isMyTurn} onClick={() => setShowAskModal(true)}
                className="flex-1 sm:flex-none px-6 py-3.5 sm:py-2.5 rounded-xl sm:rounded-full font-bold text-[10px] md:text-xs uppercase tracking-wider transition-all
                  disabled:opacity-20 disabled:cursor-not-allowed text-white shadow-sm hover:shadow-md active:scale-95"
                style={{ background: 'linear-gradient(180deg, #10b981, #006c49)' }}>
                Ask Card
              </button>
              <button disabled={!isMyTurn} onClick={() => setShowClaimModal(true)}
                className="flex-1 sm:flex-none px-6 py-3.5 sm:py-2.5 rounded-xl sm:rounded-full font-bold text-[10px] md:text-xs uppercase tracking-wider transition-all
                  disabled:opacity-20 disabled:cursor-not-allowed text-white shadow-sm hover:shadow-md active:scale-95"
                style={{ background: 'linear-gradient(180deg, #f59e0b, #d97706)' }}>
                Claim Book
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Modals */}
      {showAskModal && <AskModal opponents={opponents as Player[]} myHand={myHand} onAsk={handleAsk} onClose={() => setShowAskModal(false)} />}
      {showClaimModal && <ClaimModal onClaim={handleClaim} onClose={() => setShowClaimModal(false)} />}
    </div>
  );
}

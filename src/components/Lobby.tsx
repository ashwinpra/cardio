import { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function Lobby() {
  const { gameState, sendMessage, myPlayerId, clearSession } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'TEAM_A' | 'TEAM_B' | null>(null);
  const [localId] = useState(() => crypto.randomUUID().slice(0, 8));

  if (!gameState) return null;

  const isLiterature = gameState.gameType === 'LITERATURE';
  const isJoined = !!gameState.players.find(p => p.id === localId) || !!gameState.players.find(p => p.id === myPlayerId);

  const handleJoin = () => {
    if (!playerName.trim()) return;
    if (isLiterature && !selectedTeam) return;

    sendMessage({
      type: 'JOIN_LOBBY',
      player: {
        id: localId, 
        name: playerName.trim(), 
        team: selectedTeam || 'TEAM_A', // Default for Coup
        seatIndex: gameState.players.length, 
        isConnected: true,
      },
    });
  };

  const teamA = gameState.players.filter(p => p.team === 'TEAM_A');
  const teamB = gameState.players.filter(p => p.team === 'TEAM_B');

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-8 bg-[#f8f9fa]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <p className="text-[10px] md:text-[11px] font-bold text-[#6c7a71] uppercase tracking-[0.2em] mb-2">
            Lobby · {gameState.gameType}
          </p>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] md:text-[11px] text-[#bbcabf] uppercase tracking-[0.1em] font-medium">Session Code</span>
            <span className="text-lg md:text-xl font-mono font-bold text-[#006c49] px-4 py-1.5 rounded-xl bg-emerald-50 tracking-widest border border-emerald-100">
              {gameState.sessionId}
            </span>
          </div>
        </div>
        <div className="w-full sm:w-auto text-left sm:text-right flex flex-row-reverse sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-2">
          <button 
            onClick={() => {
              if (confirm('Are you sure you want to leave this session?')) {
                clearSession();
              }
            }}
            className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors"
          >
            Leave Session
          </button>
          <div>
            <p className="text-[10px] md:text-[11px] text-[#bbcabf] uppercase tracking-[0.1em] font-medium">Participants</p>
            <p className="text-2xl md:text-3xl font-black text-[#191c1d]">
              {gameState.players.length}<span className="text-sm text-[#bbcabf] font-medium ml-1">/{isLiterature ? '8' : '6'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full">
        <div className={`grid ${isLiterature ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
          
          {isLiterature && (
            <div className="rounded-3xl p-6 bg-white shadow-[0_2px_32px_rgba(25,28,29,0.04)] border border-[#edeeef]">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Team A</h3>
              </div>
              <div className="space-y-3">
                {teamA.map(p => (
                  <PlayerCard key={p.id} p={p} isMe={p.id === localId} color="emerald" />
                ))}
                {teamA.length === 0 && <EmptySlot />}
              </div>
            </div>
          )}

          {/* Join / Start Panel */}
          <div className="rounded-[32px] p-6 flex flex-col bg-white border border-emerald-100 shadow-[0_8px_40px_rgba(16,185,129,0.06)] relative overflow-hidden order-first md:order-none">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="text-6xl md:text-8xl">🎮</span>
            </div>
            
            {!isJoined ? (
              <>
                <h3 className="text-2xl font-bold text-[#191c1d] mb-2">Claim Your Spot</h3>
                <p className="text-sm text-[#6c7a71] mb-8">Enter your alias to join the battlefield.</p>
                
                <div className="space-y-6 flex-1">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6c7a71] uppercase tracking-[0.15em] mb-2 underline decoration-emerald-300 underline-offset-4">Your Name</label>
                    <input type="text" maxLength={20} value={playerName} onChange={e => setPlayerName(e.target.value)}
                      className="w-full p-4 rounded-2xl text-[#191c1d] font-semibold outline-none bg-[#f3f4f5] focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all border border-transparent focus:border-emerald-200"
                      placeholder="e.g. Ace" />
                  </div>
                  
                  {isLiterature && (
                    <div>
                      <label className="block text-[10px] font-bold text-[#6c7a71] uppercase tracking-[0.15em] mb-2 underline decoration-emerald-300 underline-offset-4">Choose Side</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setSelectedTeam('TEAM_A')}
                          className={`p-4 rounded-2xl font-bold text-sm transition-all border-2 ${
                            selectedTeam === 'TEAM_A' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-[#f3f4f5] text-[#6c7a71] border-transparent hover:bg-[#edeeef]'
                          }`}>Team A</button>
                        <button onClick={() => setSelectedTeam('TEAM_B')}
                          className={`p-4 rounded-2xl font-bold text-sm transition-all border-2 ${
                            selectedTeam === 'TEAM_B' ? 'bg-rose-50 text-rose-600 border-rose-400' : 'bg-[#f3f4f5] text-[#6c7a71] border-transparent hover:bg-[#edeeef]'
                          }`}>Team B</button>
                      </div>
                    </div>
                  )}
                </div>
                
                <button onClick={handleJoin} disabled={!playerName.trim() || (isLiterature && !selectedTeam)}
                  className="w-full py-4 rounded-full text-white font-bold text-sm mt-8 transition-all hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-30 disabled:grayscale"
                  style={{ background: 'linear-gradient(180deg, #10b981, #006c49)' }}>
                  Enter Arena
                </button>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mb-6 shadow-sm border border-emerald-100 rotate-3 animate-pulse">
                  <span className="text-4xl text-emerald-600">✨</span>
                </div>
                <h3 className="text-2xl font-bold text-[#191c1d] mb-2">Ready to Play</h3>
                <p className="text-sm text-[#6c7a71] mb-10 max-w-[200px]">Waiting for the host to initiate the deck.</p>
                
                <button onClick={() => sendMessage({ type: 'START_GAME' })}
                  className="w-full py-4 rounded-full text-white font-bold text-sm transition-all hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(180deg, #10b981, #006c49)' }}>
                  Start {gameState.gameType}
                </button>
              </div>
            )}
          </div>

          {!isLiterature && (
            <div className="rounded-3xl p-6 bg-white shadow-[0_2px_32px_rgba(25,28,29,0.04)] border border-[#edeeef]">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Players</h3>
              </div>
              <div className="space-y-3">
                {gameState.players.map(p => (
                  <PlayerCard key={p.id} p={p} isMe={p.id === localId} color="blue" />
                ))}
                {gameState.players.length === 0 && <EmptySlot />}
              </div>
            </div>
          )}

          {isLiterature && (
            <div className="rounded-3xl p-6 bg-white shadow-[0_2px_32px_rgba(25,28,29,0.04)] border border-[#edeeef]">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider">Team B</h3>
              </div>
              <div className="space-y-3">
                {teamB.map(p => (
                  <PlayerCard key={p.id} p={p} isMe={p.id === localId} color="rose" />
                ))}
                {teamB.length === 0 && <EmptySlot />}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function PlayerCard({ p, isMe, color }: { p: any, isMe: boolean, color: 'emerald' | 'rose' | 'blue' }) {
  const bg = color === 'emerald' ? 'bg-emerald-50' : color === 'rose' ? 'bg-rose-50' : 'bg-blue-50';
  const text = color === 'emerald' ? 'text-emerald-700' : color === 'rose' ? 'text-rose-700' : 'text-blue-700';
  const iconBg = color === 'emerald' ? 'bg-emerald-100' : color === 'rose' ? 'bg-rose-100' : 'bg-blue-100';

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-2xl ${bg} border border-transparent hover:border-white shadow-sm transition-all`}>
      <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center ${text} text-sm font-black`}>
        {p.name.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm font-bold text-[#191c1d]">{p.name}</span>
      {isMe && <span className={`${text} text-[10px] ml-auto font-black uppercase tracking-tighter`}>You</span>}
    </div>
  );
}

function EmptySlot() {
  return <div className="h-[52px] rounded-2xl border-2 border-dashed border-[#edeeef] flex items-center justify-center text-[10px] font-bold text-[#bbcabf] uppercase tracking-widest">Waiting for player...</div>;
}

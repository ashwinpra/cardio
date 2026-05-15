import { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function HostControls() {
  const { gameState, myPlayerId, sendMessage } = useGame();
  const [isOpen, setIsOpen] = useState(false);

  if (!gameState || !myPlayerId) return null;
  const hostId = (gameState as any).hostPlayerId;
  const localId = localStorage.getItem('cardio_playerId');
  
  // Fallback: If no explicit hostPlayerId, default to the first player in state.players
  const effectiveHostId = hostId || (gameState.players.length > 0 ? gameState.players[0].id : null);
  const isEffectiveHost = (myPlayerId === effectiveHostId) || (localId === effectiveHostId);

  if (!isEffectiveHost) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {isOpen ? (
        <div className="bg-surface-container-highest border border-outline-variant p-4 rounded-xl shadow-2xl w-64 max-h-[80vh] overflow-y-auto">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-headline-sm text-on-surface">Host Controls</h3>
             <button onClick={() => setIsOpen(false)} className="text-on-surface-variant hover:text-error text-xl font-bold px-2 py-1 leading-none">&times;</button>
           </div>
           
           <div className="flex flex-col gap-3">
             <button onClick={() => { if(confirm('End the game for everyone?')) sendMessage({ type: 'HOST_ACTION', action: 'END_GAME' }) }} className="bg-error text-white text-xs font-label-md py-2 rounded shadow-sm hover:bg-error/90 transition-colors">End Game</button>
             
             <button onClick={() => { sendMessage({ type: 'HOST_ACTION', action: 'FORCE_SKIP' }) }} className="bg-secondary text-white text-xs font-label-md py-2 rounded shadow-sm hover:bg-secondary/90 transition-colors">Force Skip Turn</button>
             
             <div className="border-t border-outline-variant pt-3">
               <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block mb-2 font-bold">Transfer Seat</span>
               <select id="reassign-old" className="text-xs w-full bg-surface mb-2 p-2 rounded border border-outline-variant outline-none" defaultValue="">
                 <option value="" disabled>From (Disconnected)...</option>
                 {gameState.players.filter(p => !p.isConnected).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 {gameState.players.filter(p => !p.isConnected).length === 0 && <option value="" disabled>No disconnected players</option>}
               </select>
               <select id="reassign-new" className="text-xs w-full bg-surface mb-2 p-2 rounded border border-outline-variant outline-none" defaultValue="">
                 <option value="" disabled>To (Connected)...</option>
                 {gameState.players.filter(p => p.isConnected).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
               <button onClick={() => {
                 const oldId = (document.getElementById('reassign-old') as HTMLSelectElement).value;
                 const newId = (document.getElementById('reassign-new') as HTMLSelectElement).value;
                 if (oldId && newId && confirm('Are you sure you want to transfer this seat?')) {
                   sendMessage({ type: 'HOST_ACTION', action: 'REASSIGN_SEAT', targetId: oldId, newPlayerId: newId });
                 }
               }} className="bg-primary text-white text-[10px] font-label-md py-2 px-2 rounded w-full shadow-sm hover:bg-primary/90 transition-colors">Transfer</button>
             </div>

             <div className="border-t border-outline-variant pt-3">
               <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block mb-2 font-bold">Kick Player</span>
               <select id="kick-target" className="text-xs w-full bg-surface mb-2 p-2 rounded border border-outline-variant outline-none" defaultValue="">
                 <option value="" disabled>Select player...</option>
                 {gameState.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
               <button onClick={() => {
                 const targetId = (document.getElementById('kick-target') as HTMLSelectElement).value;
                 if (targetId && confirm('Are you sure you want to kick this player?')) {
                   sendMessage({ type: 'HOST_ACTION', action: 'KICK_PLAYER', targetId });
                 }
               }} className="bg-error text-white text-[10px] font-label-md py-2 px-2 rounded w-full shadow-sm hover:bg-error/90 transition-colors">Kick</button>
             </div>
           </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-primary text-on-primary font-bold px-4 py-3 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center justify-center border-2 border-primary-container"
          title="Host Controls"
        >
          Host Controls
        </button>
      )}
    </div>
  )
}

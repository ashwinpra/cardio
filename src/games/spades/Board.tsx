import { useContext, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import type { GameState, Card } from './types';

const suitSymbols: Record<string, string> = {
  SPADE: '♠',
  HEART: '♥',
  DIAMOND: '♦',
  CLUB: '♣',
};

const suitColors: Record<string, string> = {
  SPADE: 'text-black',
  HEART: 'text-red-600',
  DIAMOND: 'text-red-600',
  CLUB: 'text-black',
};

export default function SpadesBoard() {
  const { state: gameState, sendAction, playerId } = useContext(GameContext);
  const state = gameState as GameState;
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [bidAmount, setBidAmount] = useState<number | null>(null);

  if (!state || state.gameType !== 'SPADES') return null;

  const currentPlayer = state.players.find(p => p.id === playerId);
  const isCurrentPlayerTurn = state.players[state.activePlayerIndex]?.id === playerId;

  const handlePlaceBid = () => {
    if (bidAmount !== null && isCurrentPlayerTurn && state.phase === 'BIDDING') {
      sendAction({ type: 'PLACE_BID', bid: bidAmount });
      setBidAmount(null);
    }
  };

  const handlePlayCard = () => {
    if (selectedCard && isCurrentPlayerTurn && state.phase === 'PLAYING') {
      sendAction({ type: 'PLAY_CARD', card: selectedCard });
      setSelectedCard(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Team Scores */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 border-2 border-blue-300 rounded p-4">
          <h3 className="font-bold text-lg">Team A</h3>
          <div className="text-3xl font-bold text-blue-600">{state.teamAScore?.score || 0}</div>
          <div className="text-sm text-gray-600">
            Tricks: {state.teamAScore?.tricks || 0}, Bags: {state.teamAScore?.bags || 0}
          </div>
          <div className="mt-2 text-sm">
            {state.players
              .filter((p: any) => p.team === 'TEAM_A')
              .map((p: any) => `${p.name} (bid: ${p.bid || '?'})`)
              .join(', ')}
          </div>
        </div>

        <div className="bg-red-50 border-2 border-red-300 rounded p-4">
          <h3 className="font-bold text-lg">Team B</h3>
          <div className="text-3xl font-bold text-red-600">{state.teamBScore?.score || 0}</div>
          <div className="text-sm text-gray-600">
            Tricks: {state.teamBScore?.tricks || 0}, Bags: {state.teamBScore?.bags || 0}
          </div>
          <div className="mt-2 text-sm">
            {state.players
              .filter((p: any) => p.team === 'TEAM_B')
              .map((p: any) => `${p.name} (bid: ${p.bid || '?'})`)
              .join(', ')}
          </div>
        </div>
      </div>

      {/* Current Trick */}
      {state.currentTrick?.cards && state.currentTrick.cards.length > 0 && (
        <div className="bg-green-50 border-2 border-green-300 rounded p-4">
          <h3 className="font-bold mb-2">Current Trick</h3>
          <div className="flex gap-4 flex-wrap">
            {state.currentTrick.cards.map((play: any, idx: number) => {
              const player = state.players.find((p: any) => p.id === play.playerId);
              return (
                <div key={idx} className="text-center">
                  <div className="text-sm font-semibold">{player?.name}</div>
                  <div className={`text-3xl font-bold ${suitColors[play.card.suit]}`}>
                    {play.card.rank}
                    {suitSymbols[play.card.suit]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bidding Phase */}
      {state.phase === 'BIDDING' && (
        <div className="border-t-2 pt-4">
          <h3 className="font-bold mb-3">Bidding Round</h3>
          <div className="space-y-2">
            {state.players.map((p: any, idx: number) => (
              <div
                key={p.id}
                className={`p-3 rounded border-2 ${
                  state.activePlayerIndex === idx ? 'bg-yellow-100 border-yellow-500' : 'bg-gray-100 border-gray-300'
                }`}
              >
                <span className="font-semibold">{p.name}</span>
                <span className="text-gray-600 ml-2">
                  {p.bid !== null ? `Bid: ${p.bid}` : 'Awaiting bid...'}
                </span>
              </div>
            ))}
          </div>

          {isCurrentPlayerTurn && currentPlayer && (
            <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
              <label className="block text-sm font-semibold mb-2">Your Bid (0-{currentPlayer.hand?.length || 0})</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {Array.from({ length: (currentPlayer.hand?.length || 0) + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBidAmount(i)}
                    className={`px-3 py-2 rounded border-2 ${
                      bidAmount === i
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <button
                onClick={handlePlaceBid}
                disabled={bidAmount === null}
                className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
              >
                Place Bid
              </button>
            </div>
          )}
        </div>
      )}

      {/* Playing Phase */}
      {state.phase === 'PLAYING' && currentPlayer && (
        <div className="border-t-2 pt-4">
          <h3 className="font-bold mb-3">Your Hand ({currentPlayer.hand?.length || 0} cards)</h3>
          <div className="flex gap-2 flex-wrap mb-3">
            {(currentPlayer.hand || []).map((card: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedCard(card)}
                className={`p-3 rounded border-2 transition ${
                  selectedCard?.suit === card.suit && selectedCard?.rank === card.rank
                    ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                } ${suitColors[card.suit]}`}
              >
                <div className="text-xl font-bold">
                  {card.rank}
                  {suitSymbols[card.suit]}
                </div>
              </button>
            ))}
          </div>

          {isCurrentPlayerTurn && selectedCard && (
            <button
              onClick={handlePlayCard}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Play Card
            </button>
          )}
        </div>
      )}

      {/* Game Over */}
      {state.phase === 'GAME_OVER' && (
        <div className="border-t-2 pt-4 text-center">
          <h2 className="text-2xl font-bold">Game Over!</h2>
          <p className="text-lg mt-2">
            {state.teamAScore?.score! > state.teamBScore?.score!
              ? 'Team A wins!'
              : state.teamBScore?.score! > state.teamAScore?.score!
                ? 'Team B wins!'
                : 'Tie!'}
          </p>
          <div className="mt-3 text-lg font-bold">
            Team A: {state.teamAScore?.score} | Team B: {state.teamBScore?.score}
          </div>
        </div>
      )}
    </div>
  );
}

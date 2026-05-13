import { useContext, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import type { GameState, HanabiColor, HanabiRank } from './types';

const COLORS: HanabiColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'WHITE'];
const RANKS: HanabiRank[] = [1, 2, 3, 4, 5];

const colorMap: Record<HanabiColor, string> = {
  RED: 'bg-red-500',
  BLUE: 'bg-blue-500',
  GREEN: 'bg-green-500',
  YELLOW: 'bg-yellow-400',
  WHITE: 'bg-gray-100',
};

export default function HanabiBoard() {
  const { state: gameState, sendAction, playerId } = useContext(GameContext);
  const state = gameState as GameState;
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [hintTarget, setHintTarget] = useState<string | null>(null);
  const [hintType, setHintType] = useState<'COLOR' | 'RANK' | null>(null);
  const [hintValue, setHintValue] = useState<HanabiColor | HanabiRank | null>(null);

  if (!state || state.gameType !== 'HANABI') return null;

  const currentPlayer = state.players.find(p => p.id === playerId);
  const isCurrentPlayerTurn = state.players[state.activePlayerIndex]?.id === playerId;

  const handlePlayCard = () => {
    if (selectedCardIndex !== null && isCurrentPlayerTurn) {
      sendAction({ type: 'PLAY_CARD', cardIndex: selectedCardIndex });
      setSelectedCardIndex(null);
    }
  };

  const handleDiscardCard = () => {
    if (selectedCardIndex !== null && isCurrentPlayerTurn) {
      sendAction({ type: 'DISCARD_CARD', cardIndex: selectedCardIndex });
      setSelectedCardIndex(null);
    }
  };

  const handleGiveHint = () => {
    if (hintTarget && hintType && hintValue && state.hintTokens > 0 && isCurrentPlayerTurn) {
      sendAction({
        type: 'GIVE_HINT',
        targetPlayerId: hintTarget,
        hintType,
        hintValue,
      });
      setHintTarget(null);
      setHintType(null);
      setHintValue(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Game Status */}
      <div className="grid grid-cols-4 gap-4 bg-gray-100 p-4 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold">{state.score || 0}</div>
          <div className="text-sm text-gray-600">Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">{state.hintTokens || 0}</div>
          <div className="text-sm text-gray-600">Hint Tokens</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">{state.mistakeTokens || 0}</div>
          <div className="text-sm text-gray-600">Mistakes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{state.deck?.length || 0}</div>
          <div className="text-sm text-gray-600">Deck</div>
        </div>
      </div>

      {/* Play Area */}
      <div className="grid grid-cols-5 gap-4">
        {COLORS.map(color => (
          <div key={color} className="border-2 border-gray-300 rounded p-4 text-center">
            <div className={`${colorMap[color]} w-12 h-12 rounded mx-auto mb-2`}></div>
            <div className="font-bold">{color}</div>
            <div className="text-2xl font-bold text-blue-600">
              {state.playArea?.[color] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Other Players' Hands (card count only) */}
      <div className="border-t-2 pt-4">
        <h3 className="font-bold mb-2">Players</h3>
        <div className="space-y-2">
          {state.players.map((p: any, idx: number) => (
            <div
              key={p.id}
              className={`p-2 rounded ${
                state.activePlayerIndex === idx ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'
              }`}
            >
              <span className="font-semibold">{p.name}</span>
              <span className="text-gray-600 ml-2">({(p.hand?.length || 0)} cards)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Player's Hand */}
      {currentPlayer && (
        <div className="border-t-2 pt-4">
          <h3 className="font-bold mb-3">Your Hand</h3>
          <div className="flex gap-2 flex-wrap">
            {(currentPlayer.hand || []).map((card: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedCardIndex(idx)}
                className={`p-3 rounded border-2 transition ${
                  selectedCardIndex === idx
                    ? 'border-blue-500 ring-2 ring-blue-300'
                    : 'border-gray-300 hover:border-gray-400'
                } ${colorMap[card.color as HanabiColor]}`}
              >
                <div className="font-bold text-sm">{card.color}</div>
                <div className="text-lg font-bold">{card.rank}</div>
              </button>
            ))}
          </div>

          {/* Actions */}
          {isCurrentPlayerTurn && selectedCardIndex !== null && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handlePlayCard}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Play Card
              </button>
              <button
                onClick={handleDiscardCard}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Discard
              </button>
            </div>
          )}

          {/* Give Hint */}
          {isCurrentPlayerTurn && state.hintTokens > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
              <h4 className="font-bold mb-2">Give Hint</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-semibold mb-1">Target Player</label>
                  <select
                    value={hintTarget || ''}
                    onChange={e => setHintTarget(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a player</option>
                    {state.players
                      .filter((p: any) => p.id !== playerId)
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Hint Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHintType('COLOR')}
                      className={`flex-1 p-2 rounded border ${
                        hintType === 'COLOR'
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      Color
                    </button>
                    <button
                      onClick={() => setHintType('RANK')}
                      className={`flex-1 p-2 rounded border ${
                        hintType === 'RANK'
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      Rank
                    </button>
                  </div>
                </div>

                {hintType === 'COLOR' && (
                  <div>
                    <label className="block text-sm font-semibold mb-1">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setHintValue(color)}
                          className={`p-2 rounded border-2 ${colorMap[color]} ${
                            hintValue === color ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hintType === 'RANK' && (
                  <div>
                    <label className="block text-sm font-semibold mb-1">Rank</label>
                    <div className="flex gap-2">
                      {RANKS.map(rank => (
                        <button
                          key={rank}
                          onClick={() => setHintValue(rank)}
                          className={`px-3 py-2 rounded border-2 ${
                            hintValue === rank
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {rank}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGiveHint}
                  disabled={!hintTarget || !hintType || !hintValue}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  Give Hint
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Over */}
      {state.phase === 'GAME_OVER' && (
        <div className="border-t-2 pt-4 text-center">
          <h2 className="text-2xl font-bold">Game Over!</h2>
          <p className="text-lg mt-2">Final Score: {state.score}/25</p>
          {state.score === 25 && <p className="text-green-600 font-bold">Perfect Score!</p>}
        </div>
      )}
    </div>
  );
}

import { useContext, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import type { GameState, LoveLetterRole } from './types';

const ROLE_VALUES: Record<LoveLetterRole, number> = {
  GUARD: 1,
  PRIEST: 2,
  BARON: 3,
  HANDMAID: 4,
  PRINCE: 5,
  KING: 6,
  COUNTESS: 7,
  PRINCESS: 8,
};

const roleEmojis: Record<LoveLetterRole, string> = {
  GUARD: '🎖️',
  PRIEST: '⛪',
  BARON: '👨‍💼',
  HANDMAID: '👩‍🤝‍👨',
  PRINCE: '👑',
  KING: '👰',
  COUNTESS: '💃',
  PRINCESS: '💍',
};

export default function LoveLetterBoard() {
  const { state: gameState, sendAction, playerId } = useContext(GameContext);
  const state = gameState as GameState;
  const [selectedCardRole, setSelectedCardRole] = useState<LoveLetterRole | null>(null);
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  const [guessedRole, setGuessedRole] = useState<LoveLetterRole | null>(null);

  if (!state || state.gameType !== 'LOVE_LETTER') return null;

  const currentPlayer = state.players.find(p => p.id === playerId);
  const isCurrentPlayerTurn = state.players[state.activePlayerIndex]?.id === playerId;

  const handlePlayCard = () => {
    if (selectedCardRole && isCurrentPlayerTurn) {
      const action: any = {
        type: 'PLAY_CARD',
        cardRole: selectedCardRole,
      };

      // Add target-specific data based on card role
      if (targetPlayerId && ['GUARD', 'PRIEST', 'BARON', 'PRINCE', 'KING'].includes(selectedCardRole)) {
        action.targetPlayerId = targetPlayerId;
      }

      if (selectedCardRole === 'GUARD' && guessedRole) {
        action.guessedRole = guessedRole;
      }

      sendAction(action);
      setSelectedCardRole(null);
      setTargetPlayerId(null);
      setGuessedRole(null);
    }
  };

  const getAliveOtherPlayers = () => {
    return state.players.filter(p => p.id !== playerId && !p.isEliminated);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Round Info */}
      <div className="grid grid-cols-3 gap-4 bg-gray-100 p-4 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold">Round {state.currentRound}</div>
          <div className="text-sm text-gray-600">Current Round</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{state.discardPile?.length || 0}</div>
          <div className="text-sm text-gray-600">Discarded</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{state.deck?.length || 0}</div>
          <div className="text-sm text-gray-600">Deck</div>
        </div>
      </div>

      {/* Player Status */}
      <div className="space-y-2">
        <h3 className="font-bold text-lg">Players</h3>
        <div className="grid grid-cols-2 gap-2">
          {state.players.map((p: any, idx: number) => (
            <div
              key={p.id}
              className={`p-3 rounded border-2 ${
                state.activePlayerIndex === idx ? 'bg-blue-100 border-blue-500' : 'bg-gray-100 border-gray-300'
              } ${p.isEliminated ? 'opacity-50 line-through' : ''}`}
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-gray-600">Tokens: {p.tokens}</div>
              <div className="text-sm">Cards: {p.hand?.length || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Player's Hand */}
      {currentPlayer && !currentPlayer.isEliminated && (
        <div className="border-t-2 pt-4">
          <h3 className="font-bold mb-3">Your Hand ({currentPlayer.hand?.length || 0} card)</h3>
          <div className="space-y-2">
            {(currentPlayer.hand || []).map((card: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedCardRole(card.role)}
                className={`w-full p-4 rounded border-2 transition text-left ${
                  selectedCardRole === card.role
                    ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{roleEmojis[card.role as LoveLetterRole]}</span>
                  <div>
                    <div className="font-bold">{card.role}</div>
                    <div className="text-sm text-gray-600">Value: {ROLE_VALUES[card.role as LoveLetterRole]}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Card Effect UI */}
          {isCurrentPlayerTurn && selectedCardRole && (
            <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
              <h4 className="font-bold mb-2">{selectedCardRole}</h4>

              {['GUARD', 'PRIEST', 'BARON', 'PRINCE', 'KING'].includes(selectedCardRole) && (
                <div className="mb-3">
                  <label className="block text-sm font-semibold mb-2">Select Target</label>
                  <div className="space-y-1">
                    {getAliveOtherPlayers().map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setTargetPlayerId(p.id)}
                        className={`w-full p-2 rounded border text-left ${
                          targetPlayerId === p.id
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCardRole === 'GUARD' && targetPlayerId && (
                <div className="mb-3">
                  <label className="block text-sm font-semibold mb-2">Guess Their Card</label>
                  <div className="space-y-1">
                    {(Object.keys(roleEmojis) as LoveLetterRole[]).map((role: LoveLetterRole) => (
                      <button
                        key={role}
                        onClick={() => setGuessedRole(role)}
                        className={`w-full p-2 rounded border text-left ${
                          guessedRole === role
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {roleEmojis[role]} {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handlePlayCard}
                disabled={
                  ['GUARD', 'PRIEST', 'BARON', 'PRINCE', 'KING'].includes(selectedCardRole) &&
                  !targetPlayerId
                }
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                Play {selectedCardRole}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Game Over */}
      {state.phase === 'GAME_OVER' && (
        <div className="border-t-2 pt-4 text-center">
          <h2 className="text-2xl font-bold">Game Over!</h2>
          <p className="text-lg mt-2">Winner: {state.players.find(p => p.id === state.winner)?.name}</p>
        </div>
      )}
    </div>
  );
}

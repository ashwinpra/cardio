import { useGame } from './context/GameContext';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import LiteratureBoard from './games/literature/Board';
import CoupBoard from './games/coup/Board';
import SecretHitlerBoard from './games/secretHitler/Board';

function App() {
  const { gameState, error } = useGame();

  const renderBoard = () => {
    if (!gameState) return null;
    if (gameState.gameType === 'LITERATURE') return <LiteratureBoard />;
    if (gameState.gameType === 'COUP') return <CoupBoard />;
    if (gameState.gameType === 'SECRET_HITLER') return <SecretHitlerBoard />;
    return <div className="p-8 text-center">Unknown Game Type</div>;
  };

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-900/90 text-red-200 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-sm text-sm font-medium animate-[fadeIn_0.3s]">
          {error}
        </div>
      )}

      {!gameState ? (
        <LandingPage />
      ) : gameState.phase === 'LOBBY' ? (
        <Lobby />
      ) : (
        renderBoard()
      )}
    </>
  );
}

export default App;

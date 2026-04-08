import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { BaseGameState as GameState, GameType } from '../shared/types';

interface GameContextProps {
  gameState: GameState | null;
  myPlayerId: string | null;
  cardCounts: Record<string, number>;
  error: string | null;
  createLANSession: (gameType: GameType) => void;
  connectToLAN: (sessionId: string) => void;
  sendMessage: (msg: any) => void;
  isConnected: boolean;
  clearSession: () => void;
}

const GameContext = createContext<GameContextProps>({} as GameContextProps);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const initWs = useCallback((onOpen: (s: WebSocket) => void) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const port = isLocalhost ? '3001' : window.location.port;
    const url = `${protocol}//${host}${port ? `:${port}` : ''}`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setIsConnected(true);
      onOpen(socket);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'SESSION_CREATED':
            // We get sessionId back, create a minimal state for the lobby
            setGameState({
              sessionId: data.sessionId,
              gameType: data.gameType,
              phase: 'LOBBY',
              players: [],
              activePlayerIndex: 0,
              lastMove: null,
              moveLog: [],
            } as GameState);
            break;
          case 'SESSION_JOINED':
            setGameState({
              sessionId: data.sessionId,
              gameType: data.gameType,
              phase: 'LOBBY',
              players: [],
              activePlayerIndex: 0,
              lastMove: null,
              moveLog: [],
            } as GameState);
            break;
          case 'STATE_UPDATE':
            setGameState(data.state);
            if (data.yourPlayerId) setMyPlayerId(data.yourPlayerId);
            if (data.state.cardCounts) setCardCounts(data.state.cardCounts);
            break;
          case 'ERROR':
            setError(data.message);
            setTimeout(() => setError(null), 4000);
            break;
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
    };

    wsRef.current = socket;
  }, []);

  const createLANSession = useCallback((gameType: GameType) => {
    initWs((s: WebSocket) => s.send(JSON.stringify({ type: 'CREATE_SESSION', gameType })));
  }, [initWs]);

  const connectToLAN = useCallback((sessionId: string) => {
    initWs((s) => s.send(JSON.stringify({ type: 'JOIN_SESSION', sessionId })));
  }, [initWs]);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('cardio_sessionId');
    localStorage.removeItem('cardio_playerId');
    localStorage.removeItem('cardio_playerName');
    setGameState(null);
    setMyPlayerId(null);
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  // Persistence: Save to localStorage
  useEffect(() => {
    if (gameState?.sessionId) {
      localStorage.setItem('cardio_sessionId', gameState.sessionId);
    }
    if (myPlayerId) {
      localStorage.setItem('cardio_playerId', myPlayerId);
      const me = gameState?.players.find(p => p.id === myPlayerId);
      if (me?.name) {
        localStorage.setItem('cardio_playerName', me.name);
      }
    }
  }, [gameState?.sessionId, gameState?.players, myPlayerId]);

  // Persistence: Auto-reconnect on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('cardio_sessionId');
    const savedPlayerId = localStorage.getItem('cardio_playerId');
    const savedPlayerName = localStorage.getItem('cardio_playerName');

    if (savedSessionId && !gameState) {
      initWs((s) => {
        s.send(JSON.stringify({ type: 'JOIN_SESSION', sessionId: savedSessionId }));
        // If we have player info, auto-rejoin the lobby too
        if (savedPlayerId && savedPlayerName) {
          setTimeout(() => {
            s.send(JSON.stringify({ 
              type: 'JOIN_LOBBY', 
              player: { id: savedPlayerId, name: savedPlayerName } 
            }));
          }, 500); // Give it a moment to join session first
        }
      });
    }
  }, []);

  return (
    <GameContext.Provider value={{ 
      gameState, 
      myPlayerId, 
      cardCounts, 
      error, 
      createLANSession, 
      connectToLAN, 
      sendMessage, 
      isConnected,
      clearSession
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);

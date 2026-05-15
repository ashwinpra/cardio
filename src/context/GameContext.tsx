import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import type { BaseGameState as GameState, GameType } from "../shared/types";

// ─── Constants ───────────────────────────────────────────
const MAX_RECONNECT_ATTEMPTS = 8;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 15_000;
const MAX_PENDING_MESSAGES = 200;

type ConnectionStatus = "connected" | "disconnected" | "reconnecting";
type OutgoingMessage = { type: string; [key: string]: unknown };

interface GameContextProps {
  gameState: GameState | null;
  myPlayerId: string | null;
  cardCounts: Record<string, number>;
  error: string | null;
  connectionStatus: ConnectionStatus;
  createLANSession: (gameType: GameType) => void;
  connectToLAN: (sessionId: string) => void;
  sendMessage: (msg: OutgoingMessage) => void;
  sendAction: (action: Record<string, unknown>) => void;
  state: GameState | null;
  playerId: string | null;
  isConnected: boolean;
  clearSession: () => void;
}

export const GameContext = createContext<GameContextProps>(
  {} as GameContextProps,
);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const pendingLobbyJoinRef = useRef<{ id: string; name: string } | null>(null);
  const isAutoReconnectAttemptRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const pendingMessagesRef = useRef<OutgoingMessage[]>([]);
  const hasAttemptedInitialReconnectRef = useRef(false);
  const initWsRef = useRef<(onOpen: (s: WebSocket) => void) => void>(() => {});

  // ─── localStorage helpers ────────────────────────────────

  const clearPersistedSession = useCallback(() => {
    localStorage.removeItem("cardio_sessionId");
    localStorage.removeItem("cardio_playerId");
    localStorage.removeItem("cardio_playerName");
  }, []);

  const getPersistedSession = useCallback(
    () => ({
      sessionId: localStorage.getItem("cardio_sessionId"),
      playerId: localStorage.getItem("cardio_playerId"),
      playerName: localStorage.getItem("cardio_playerName"),
    }),
    [],
  );

  const queueLobbyRejoin = useCallback(
    (playerId: string, playerName: string) => {
      pendingLobbyJoinRef.current = { id: playerId, name: playerName };
    },
    [],
  );

  // ─── WebSocket init ──────────────────────────────────────

  const initWs = useCallback(
    (onOpen: (s: WebSocket) => void) => {
      // Close any existing connection cleanly
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = window.location.port;
      const url = `${protocol}//${host}${port ? `:${port}` : ""}/ws`;
      const socket = new WebSocket(url);

      socket.onopen = () => {
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
        intentionalCloseRef.current = false;

        // Flush any queued messages
        while (pendingMessagesRef.current.length > 0) {
          const msg = pendingMessagesRef.current.shift();
          socket.send(JSON.stringify(msg));
        }

        onOpen(socket);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "SESSION_CREATED":
              isAutoReconnectAttemptRef.current = false;
              break;
            case "SESSION_JOINED":
              isAutoReconnectAttemptRef.current = false;
              // If we have a pending lobby join from auto-reconnect, send it now
              if (
                pendingLobbyJoinRef.current &&
                wsRef.current?.readyState === WebSocket.OPEN
              ) {
                const { id, name } = pendingLobbyJoinRef.current;
                pendingLobbyJoinRef.current = null;
                wsRef.current.send(
                  JSON.stringify({
                    type: "JOIN_LOBBY",
                    player: { id, name },
                  }),
                );
              }
              break;
            case "STATE_UPDATE":
              isAutoReconnectAttemptRef.current = false;
              setGameState(data.state);
              if (data.yourPlayerId) setMyPlayerId(data.yourPlayerId);
              setCardCounts(data.state.cardCounts ?? data.state.playerCardCounts ?? {});
              break;
            case "ERROR":
              if (
                data.message === "Session not found" &&
                isAutoReconnectAttemptRef.current
              ) {
                isAutoReconnectAttemptRef.current = false;
                clearPersistedSession();
                setGameState(null);
                setMyPlayerId(null);
                return;
              }
              setError(data.message);
              setTimeout(() => setError(null), 4000);
              break;
          }
        } catch (e) {
          console.error("WS parse error", e);
        }
      };

      socket.onclose = () => {
        setConnectionStatus("disconnected");
        wsRef.current = null;

        // Don't reconnect if this was intentional (user clearing session)
        if (intentionalCloseRef.current) {
          intentionalCloseRef.current = false;
          return;
        }

        // Attempt auto-reconnect if we have a session to return to
        const persisted = getPersistedSession();
        if (
          persisted.sessionId &&
          persisted.playerId &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current),
            RECONNECT_MAX_DELAY_MS,
          );
          reconnectAttemptsRef.current++;
          setConnectionStatus("reconnecting");
          console.log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`,
          );

          reconnectTimerRef.current = setTimeout(() => {
            const { sessionId, playerId, playerName } = getPersistedSession();
            if (!sessionId || !playerId) return;

            isAutoReconnectAttemptRef.current = true;
            if (playerName) {
              queueLobbyRejoin(playerId, playerName);
            }
            initWsRef.current((s) => {
              // Re-join session
              s.send(JSON.stringify({ type: "JOIN_SESSION", sessionId }));
            });
          }, delay);
        }
      };

      wsRef.current = socket;
    },
    [clearPersistedSession, getPersistedSession, queueLobbyRejoin],
  );

  useEffect(() => {
    initWsRef.current = initWs;
  }, [initWs]);

  // ─── Public API ──────────────────────────────────────────

  const createLANSession = useCallback(
    (gameType: GameType) => {
      isAutoReconnectAttemptRef.current = false;
      reconnectAttemptsRef.current = 0;
      initWs((s: WebSocket) =>
        s.send(JSON.stringify({ type: "CREATE_SESSION", gameType })),
      );
    },
    [initWs],
  );

  const connectToLAN = useCallback(
    (sessionId: string) => {
      isAutoReconnectAttemptRef.current = false;
      reconnectAttemptsRef.current = 0;
      initWs((s) =>
        s.send(JSON.stringify({ type: "JOIN_SESSION", sessionId })),
      );
    },
    [initWs],
  );

  const sendMessage = useCallback((msg: OutgoingMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      // Queue the message for when we reconnect (non-critical actions)
      console.warn("WebSocket not ready, queuing message:", msg.type);
      if (pendingMessagesRef.current.length >= MAX_PENDING_MESSAGES) {
        pendingMessagesRef.current.shift();
      }
      pendingMessagesRef.current.push(msg);
    }
  }, []);

  const sendAction = useCallback(
    (action: Record<string, unknown>) => {
      const msg = {
        type: "GAME_ACTION",
        ...action,
      };
      sendMessage(msg);
    },
    [sendMessage],
  );

  const clearSession = useCallback(() => {
    // Cancel any pending reconnect
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // prevent reconnect

    clearPersistedSession();
    setGameState(null);
    setMyPlayerId(null);
    setCardCounts({});
    setConnectionStatus("disconnected");
    pendingMessagesRef.current = [];
    pendingLobbyJoinRef.current = null;

    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
    }
  }, [clearPersistedSession]);

  // ─── Persistence: Save to localStorage ───────────────────

  useEffect(() => {
    if (gameState?.sessionId) {
      localStorage.setItem("cardio_sessionId", gameState.sessionId);
    }
    if (myPlayerId) {
      localStorage.setItem("cardio_playerId", myPlayerId);
      const me = gameState?.players.find((p) => p.id === myPlayerId);
      if (me?.name) {
        localStorage.setItem("cardio_playerName", me.name);
      }
    }
  }, [gameState?.sessionId, gameState?.players, myPlayerId]);

  // ─── Persistence: Auto-reconnect on mount ────────────────

  useEffect(() => {
    if (hasAttemptedInitialReconnectRef.current) {
      return;
    }
    hasAttemptedInitialReconnectRef.current = true;

    const savedSessionId = localStorage.getItem("cardio_sessionId");
    const savedPlayerId = localStorage.getItem("cardio_playerId");
    const savedPlayerName = localStorage.getItem("cardio_playerName");

    if (savedSessionId && !gameState) {
      isAutoReconnectAttemptRef.current = true;
      if (savedPlayerId && savedPlayerName) {
        queueLobbyRejoin(savedPlayerId, savedPlayerName);
      }
      initWs((s) => {
        s.send(
          JSON.stringify({ type: "JOIN_SESSION", sessionId: savedSessionId }),
        );
      });
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [gameState, initWs, queueLobbyRejoin]);

  return (
    <GameContext.Provider
      value={{
        gameState,
        state: gameState,
        myPlayerId,
        playerId: myPlayerId,
        cardCounts,
        error,
        connectionStatus,
        createLANSession,
        connectToLAN,
        sendMessage,
        sendAction,
        isConnected: connectionStatus === "connected",
        clearSession,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);

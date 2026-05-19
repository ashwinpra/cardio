import * as LiteratureLogic from "../../src/games/literature/logic.js";
import type {
  Card,
  GameState,
  HalfSuitName,
  Player,
} from "../../src/games/literature/types.js";

interface ActionData {
  type: string;
  test?: boolean;
  actorId?: string;
  askerId?: string;
  targetId?: string;
  card?: Card;
  claimerId?: string;
  halfSuit?: HalfSuitName;
}

interface ActionResult {
  state?: GameState;
  error?: string;
}

export function handleAction(state: GameState, data: ActionData): ActionResult {
  switch (data.type) {
    case "START_GAME":
      if (
        !data.test &&
        state.players.length !== 6 &&
        state.players.length !== 8
      )
        return { error: "Literature requires exactly 6 or 8 players" };
      return { state: LiteratureLogic.dealCards(state) };

    case "ASK_CARD": {
      const askerId = data.actorId ?? data.askerId;
      const { targetId, card } = data;
      if (!askerId || !targetId || !card)
        return { error: "Missing required fields" };
      if (data.actorId && data.askerId && data.actorId !== data.askerId) {
        return { error: "Invalid actor context" };
      }

      // Validate it's the asker's turn
      const activePlayer = state.players[state.activePlayerIndex];
      if (activePlayer?.id !== askerId) return { error: "It is not your turn" };

      const result = LiteratureLogic.handleAsk(state, askerId, targetId, card);
      if (result.error) return { error: result.error };
      return { state: result.state };
    }

    case "CLAIM_BOOK": {
      const claimerId = data.actorId ?? data.claimerId;
      const { halfSuit } = data;
      if (!claimerId || !halfSuit) return { error: "Missing required fields" };
      if (data.actorId && data.claimerId && data.actorId !== data.claimerId) {
        return { error: "Invalid actor context" };
      }

      // Validate it's the claimer's turn
      const activePlayer = state.players[state.activePlayerIndex];
      if (activePlayer?.id !== claimerId)
        return { error: "It is not your turn" };

      const claimer = state.players.find((p: Player) => p.id === claimerId);
      if (!claimer) return { error: "Player not found" };

      const result = LiteratureLogic.handleClaim(state, claimerId, halfSuit);
      if (result.error) return { error: result.error };
      return { state: result.state };
    }

    default:
      return { state };
  }
}

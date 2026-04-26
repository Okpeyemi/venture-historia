import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processMarket(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "market.campaign": {
      if (action.budget > state.playerState.cash) {
        throw new InvalidActionError(action, "insufficient cash for campaign");
      }
      const repGain = Math.floor(action.budget / 5_000);
      const reputation = Math.min(100, state.playerState.reputation + repGain);
      return {
        ...state,
        playerState: {
          ...state.playerState,
          cash: state.playerState.cash - action.budget,
          reputation,
        },
      };
    }
    case "market.adjustPricing": {
      const next = state.playerState.mrr * (1 + action.deltaPct / 100);
      return {
        ...state,
        playerState: {
          ...state.playerState,
          mrr: Math.max(0, Math.floor(next)),
        },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a market action");
  }
}

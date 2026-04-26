import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processStrategy(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "strategy.partnership": {
      const consequence = {
        description: `Partnership with ${action.partnerName} active (${action.revShare}% rev share)`,
        remainingQuarters: 4,
      };
      return {
        ...state,
        history: {
          ...state.history,
          activeConsequences: [...state.history.activeConsequences, consequence],
        },
      };
    }
    case "strategy.tryAcquire": {
      const target = state.worldState.competitors.find((c) => c.id === action.competitorId);
      if (!target) {
        throw new InvalidActionError(action, `competitor ${action.competitorId} not found`);
      }
      const threshold = Math.floor(target.scriptedState.valuation * 0.8);
      if (action.offerAmount >= threshold) {
        return {
          ...state,
          playerState: {
            ...state.playerState,
            cash: state.playerState.cash - action.offerAmount,
          },
          worldState: {
            ...state.worldState,
            competitors: state.worldState.competitors.filter((c) => c.id !== action.competitorId),
          },
          history: {
            ...state.history,
            keyDecisions: [
              ...state.history.keyDecisions,
              {
                trimesterIndex: state.history.trimestersPlayed,
                summary: `Acquired ${target.name} for ${action.offerAmount}`,
              },
            ],
          },
        };
      }
      return {
        ...state,
        history: {
          ...state.history,
          keyDecisions: [
            ...state.history.keyDecisions,
            {
              trimesterIndex: state.history.trimestersPlayed,
              summary: `Acquisition offer for ${target.name} declined (offer ${action.offerAmount} below threshold)`,
            },
          ],
        },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a strategy action");
  }
}

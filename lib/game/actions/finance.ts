import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processFinance(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "finance.raiseFunds": {
      if (action.amount <= 0) {
        throw new InvalidActionError(action, "Raise amount must be > 0");
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          cash: state.playerState.cash + action.amount,
          investors: [
            ...state.playerState.investors,
            {
              name: action.investorName,
              amount: action.amount,
              equityPct: action.equityPct,
              boardSeats: action.boardSeats,
              hasVeto: action.hasVeto,
            },
          ],
          boardSeatsTaken: state.playerState.boardSeatsTaken + action.boardSeats,
        },
      };
    }
    case "finance.allocateBudget": {
      if (action.amount > state.playerState.cash) {
        throw new InvalidActionError(action, "insufficient cash for allocation");
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          cash: state.playerState.cash - action.amount,
        },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a finance action");
  }
}

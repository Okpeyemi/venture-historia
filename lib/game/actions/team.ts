import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processTeam(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "team.hire": {
      const firstQuarterCost = Math.floor(action.salaryAnnual / 4);
      if (state.playerState.cash < firstQuarterCost) {
        throw new InvalidActionError(
          action,
          `insufficient cash for hire (need ${firstQuarterCost}, have ${state.playerState.cash})`,
        );
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          teamSize: state.playerState.teamSize + 1,
          cash: state.playerState.cash - firstQuarterCost,
        },
      };
    }
    case "team.fire": {
      if (action.count <= 0) {
        throw new InvalidActionError(action, "fire count must be > 0");
      }
      if (action.count > state.playerState.teamSize) {
        throw new InvalidActionError(
          action,
          `cannot fire ${action.count} when team is ${state.playerState.teamSize}`,
        );
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          teamSize: state.playerState.teamSize - action.count,
        },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a team action");
  }
}

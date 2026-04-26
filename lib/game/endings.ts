import type { Action, Ending, GameState } from "./types";
import { InvalidActionError } from "./types";

export function detectAutoEnding(state: GameState): Ending | null {
  if (state.playerState.founderBurnout >= 100) {
    return {
      kind: "burnout",
      trimesterIndex: state.history.trimestersPlayed,
      summary: "Le fondateur s'est effondré. Burnout total.",
    };
  }
  if (state.playerState.cash <= 0) {
    return {
      kind: "bankruptcy",
      trimesterIndex: state.history.trimestersPlayed,
      summary: `${state.playerState.companyName} a épuisé sa trésorerie. Liquidation.`,
    };
  }
  return null;
}

export function applyPlayerEnding(state: GameState, action: Action): Ending {
  const trimesterIndex = state.history.trimestersPlayed;
  switch (action.kind) {
    case "endgame.declareIPO":
      return {
        kind: "ipo",
        trimesterIndex,
        summary: `${state.playerState.companyName} entre en bourse.`,
      };
    case "endgame.acceptAcquisition":
      return {
        kind: "acquisition",
        trimesterIndex,
        summary: `${state.playerState.companyName} racheté par ${action.acquirerName} pour ${action.price}.`,
      };
    case "endgame.declareLifestyle":
      return {
        kind: "lifestyle",
        trimesterIndex,
        summary: `${state.playerState.companyName} maintenu en lifestyle business.`,
      };
    case "endgame.declareConglomerate":
      return {
        kind: "conglomerate",
        trimesterIndex,
        summary: `${state.playerState.companyName} devient un conglomérat multi-verticales.`,
      };
    default:
      throw new InvalidActionError(action as Action, "not a player-initiated ending action");
  }
}

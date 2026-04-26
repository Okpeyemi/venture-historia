import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";
import { processFinance } from "./finance";
import { processTeam } from "./team";
import { processProduct } from "./product";
import { processMarket } from "./market";
import { processStrategy } from "./strategy";

export function processAction(state: GameState, action: Action): GameState {
  if (action.kind.startsWith("finance.")) return processFinance(state, action);
  if (action.kind.startsWith("team.")) return processTeam(state, action);
  if (action.kind.startsWith("product.")) return processProduct(state, action);
  if (action.kind.startsWith("market.")) return processMarket(state, action);
  if (action.kind.startsWith("strategy.")) return processStrategy(state, action);
  if (action.kind.startsWith("endgame.")) {
    throw new InvalidActionError(
      action,
      "endgame.* actions are handled by lib/game/endings.ts, not the action dispatcher",
    );
  }
  throw new InvalidActionError(action, `unknown action kind: ${(action as Action).kind}`);
}

export { processFinance, processTeam, processProduct, processMarket, processStrategy };

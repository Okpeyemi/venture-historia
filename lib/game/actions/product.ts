import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processProduct(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "product.startRD": {
      const exists = state.playerState.products.some((p) => p.name === action.productName);
      if (exists) {
        throw new InvalidActionError(action, `product ${action.productName} already exists`);
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          products: [
            ...state.playerState.products,
            {
              name: action.productName,
              stage: "rd",
              satisfaction: 0,
              quartersInRD: action.quartersUntilLaunch,
            },
          ],
        },
      };
    }
    case "product.launch": {
      const idx = state.playerState.products.findIndex((p) => p.name === action.productName);
      if (idx === -1) {
        throw new InvalidActionError(action, `product ${action.productName} not found`);
      }
      const products = state.playerState.products.map((p, i) =>
        i === idx ? { ...p, stage: "shipped" as const, satisfaction: 60 } : p,
      );
      return {
        ...state,
        playerState: { ...state.playerState, products },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a product action");
  }
}

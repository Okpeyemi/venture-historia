import type { GameState } from "@/lib/game/types";

/**
 * Compact JSON for prompt injection. No whitespace = fewer tokens.
 * The full state is included — Plan #6 will add a sliding-window
 * history compression once games run long enough for context bloat.
 */
export function serializeForPrompt(state: GameState): string {
  return JSON.stringify(state);
}

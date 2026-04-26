import type { Decision, GameState, TrimesterEvent } from "./types";
import type { IGameMaster } from "./ia/types";

export type AdvanceTrimesterArgs = {
  state: GameState;
  decisions: Decision[];
  gm: IGameMaster;
};

export type AdvanceTrimesterResult = {
  opening: { narration: string; event: TrimesterEvent | null };
  closing: { narration: string };
  newState: GameState;
};

/**
 * Run a single trimester loop:
 *   1. Open: GM narrates context and may surface an event.
 *   2. Plan: caller has already collected decisions (passed in).
 *   3. Close: GM folds decisions into the next state and narrates outcome.
 *
 * The engine is pure orchestration — it does not access the DB.
 * Persistence is a separate concern (see lib/game/persistence.ts).
 */
export async function advanceTrimester(
  args: AdvanceTrimesterArgs,
): Promise<AdvanceTrimesterResult> {
  const opening = await args.gm.openTrimester(args.state);
  const closing = await args.gm.closeTrimester(args.state, args.decisions);
  return {
    opening,
    closing: { narration: closing.narration },
    newState: closing.newState,
  };
}

import type { GameState } from "../types";
import type { ScenarioMacroEvent } from "./types";

export function evaluateMacroEvents(
  events: ScenarioMacroEvent[],
  state: GameState,
): ScenarioMacroEvent[] {
  const fired = new Set(state.worldState.firedMilestones);
  return events.filter(
    (e) =>
      !fired.has(e.id) &&
      e.trigger.year === state.scenario.currentYear &&
      e.trigger.quarter === state.scenario.currentQuarter,
  );
}

/**
 * Apply structural effects of macro event firings: record the firing in
 * `firedMilestones` (idempotency) and append any flags to
 * `macroEventsActive`. Crucially, this does NOT append the human-facing
 * narration to `history.narrativeSummary` — that text is surfaced once,
 * by `ScriptedGameMaster.openTrimester`, into the trimester's
 * `narrationOpening` row. Doing it again here would duplicate the text
 * for any UI that renders both narrationOpening and narrativeSummary.
 * Plan #4 may add a compact summary line if the IA needs the event in
 * its context window.
 */
export function applyMacroEventEffects(
  state: GameState,
  firings: ScenarioMacroEvent[],
): GameState {
  let next = state;
  for (const event of firings) {
    next = {
      ...next,
      worldState: {
        ...next.worldState,
        firedMilestones: [...next.worldState.firedMilestones, event.id],
      },
    };
    switch (event.effect.kind) {
      case "narration_only":
        break;
      case "add_macro_flag":
        next = {
          ...next,
          worldState: {
            ...next.worldState,
            macroEventsActive: [...next.worldState.macroEventsActive, event.effect.flag],
          },
        };
        break;
      case "trigger_industry_collapse":
        next = {
          ...next,
          worldState: {
            ...next.worldState,
            macroEventsActive: [
              ...next.worldState.macroEventsActive,
              "industry_collapse_triggered",
            ],
          },
        };
        break;
    }
  }
  return next;
}

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

export function applyMacroEventEffects(
  state: GameState,
  firings: ScenarioMacroEvent[],
): GameState {
  let next = state;
  for (const event of firings) {
    const prefix = next.history.narrativeSummary ? next.history.narrativeSummary + "\n" : "";
    next = {
      ...next,
      history: { ...next.history, narrativeSummary: prefix + event.narration },
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

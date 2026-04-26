import { describe, it, expect } from "vitest";
import { evaluateMacroEvents, applyMacroEventEffects } from "@/lib/game/scenarios/macro-events";
import { createInitialState } from "@/lib/game/state";
import type { ScenarioMacroEvent } from "@/lib/game/scenarios/types";
import type { GameState } from "@/lib/game/types";

const baseState = (): GameState =>
  createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 100_000,
    startingTeamSize: 2,
  });

const events: ScenarioMacroEvent[] = [
  {
    id: "sox",
    trigger: { year: 2006, quarter: "Q1" },
    narration: "SOX pressure",
    effect: { kind: "add_macro_flag", flag: "sox" },
  },
  {
    id: "crisis",
    trigger: { year: 2008, quarter: "Q3" },
    narration: "Financial crisis",
    effect: { kind: "trigger_industry_collapse" },
  },
];

describe("evaluateMacroEvents", () => {
  it("returns no firings when no event matches the current quarter", () => {
    expect(evaluateMacroEvents(events, baseState())).toEqual([]);
  });

  it("fires the event matching the current year+quarter", () => {
    const state = {
      ...baseState(),
      scenario: { ...baseState().scenario, currentYear: 2006, currentQuarter: "Q1" } as const,
    };
    const firings = evaluateMacroEvents(events, state);
    expect(firings).toHaveLength(1);
    expect(firings[0]?.id).toBe("sox");
  });

  it("does NOT re-fire an event already in firedMilestones (events share the namespace)", () => {
    const state = {
      ...baseState(),
      scenario: { ...baseState().scenario, currentYear: 2006, currentQuarter: "Q1" } as const,
      worldState: { ...baseState().worldState, firedMilestones: ["sox"] },
    };
    expect(evaluateMacroEvents(events, state)).toEqual([]);
  });
});

describe("applyMacroEventEffects", () => {
  it("records the event id in firedMilestones and prepends narration", () => {
    const state = baseState();
    const next = applyMacroEventEffects(state, [events[0]!]);
    expect(next.worldState.firedMilestones).toContain("sox");
    expect(next.history.narrativeSummary).toContain("SOX pressure");
  });

  it("add_macro_flag pushes the flag onto worldState.macroEventsActive", () => {
    const state = baseState();
    const next = applyMacroEventEffects(state, [events[0]!]);
    expect(next.worldState.macroEventsActive).toContain("sox");
  });

  it("trigger_industry_collapse pushes 'industry_collapse_triggered' onto macroEventsActive", () => {
    const state = baseState();
    const next = applyMacroEventEffects(state, [events[1]!]);
    expect(next.worldState.macroEventsActive).toContain("industry_collapse_triggered");
  });
});

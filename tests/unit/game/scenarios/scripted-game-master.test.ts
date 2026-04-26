import { describe, it, expect } from "vitest";
import { ScriptedGameMaster } from "@/lib/game/scenarios/scripted-game-master";
import { MockGameMaster } from "@/lib/game/ia/mock";
import { createInitialState } from "@/lib/game/state";
import type { ScenarioPreset } from "@/lib/game/scenarios/types";
import type { GameState } from "@/lib/game/types";

const minimalPreset = (): ScenarioPreset => ({
  id: "tp",
  name: "Test Preset",
  loreSummary: "test",
  era: 2005,
  region: "T",
  sector: "T",
  startingYear: 2005,
  startingQuarter: "Q1",
  companyName: "TC",
  startingCash: 200_000,
  startingTeamSize: 2,
  startingProducts: [],
  competitors: [
    {
      id: "rival",
      name: "Rival",
      scriptedPersona: "test",
      initialValuation: 10_000_000,
      initialTeamSize: 10,
      milestones: [
        {
          id: "rival_alarm",
          trigger: { kind: "playerMrrAtLeast", mrr: 30_000 },
          reaction: { kind: "narration", text: "Rival sounds the alarm" },
        },
      ],
    },
  ],
  investors: [],
  macroEvents: [
    {
      id: "macro_y2_q3",
      trigger: { year: 2005, quarter: "Q3" },
      narration: "Macro headwind",
      effect: { kind: "add_macro_flag", flag: "headwind" },
    },
  ],
});

const baseState = (preset: ScenarioPreset): GameState => {
  const s = createInitialState({
    scenario: {
      presetId: preset.id,
      era: preset.era,
      region: preset.region,
      sector: preset.sector,
      startingYear: preset.startingYear,
      currentQuarter: preset.startingQuarter,
      currentYear: preset.startingYear,
    },
    companyName: preset.companyName,
    startingCash: preset.startingCash,
    startingTeamSize: preset.startingTeamSize,
  });
  // Seed competitors from preset (the registry-backed flow does this; tests do it inline).
  return {
    ...s,
    worldState: {
      ...s.worldState,
      competitors: preset.competitors.map((c) => ({
        id: c.id,
        name: c.name,
        scriptedPersona: c.scriptedPersona,
        scriptedState: { valuation: c.initialValuation, teamSize: c.initialTeamSize },
      })),
    },
  };
};

describe("ScriptedGameMaster", () => {
  it("delegates basic narration to MockGameMaster on opening", async () => {
    const preset = minimalPreset();
    const gm = new ScriptedGameMaster(preset, new MockGameMaster());
    const result = await gm.openTrimester(baseState(preset));
    expect(result.narration).toContain("[mock]");
  });

  it("appends macro event narration on opening when an event triggers in the current quarter", async () => {
    const preset = minimalPreset();
    const gm = new ScriptedGameMaster(preset, new MockGameMaster());
    const state = {
      ...baseState(preset),
      scenario: { ...baseState(preset).scenario, currentQuarter: "Q3", currentYear: 2005 } as const,
    };
    const result = await gm.openTrimester(state);
    expect(result.narration).toContain("Macro headwind");
  });

  it("applies milestone reactions at trimester close when triggers match", async () => {
    const preset = minimalPreset();
    const gm = new ScriptedGameMaster(preset, new MockGameMaster());
    const state = baseState(preset);
    const stateWithMrr = { ...state, playerState: { ...state.playerState, mrr: 50_000 } };
    const result = await gm.closeTrimester(stateWithMrr, []);
    expect(result.newState.worldState.firedMilestones).toContain("rival_alarm");
    expect(result.newState.history.narrativeSummary).toContain("Rival sounds the alarm");
  });

  it("does not re-fire a milestone already recorded in firedMilestones", async () => {
    const preset = minimalPreset();
    const gm = new ScriptedGameMaster(preset, new MockGameMaster());
    const state = baseState(preset);
    const stateWithFired = {
      ...state,
      playerState: { ...state.playerState, mrr: 50_000 },
      worldState: { ...state.worldState, firedMilestones: ["rival_alarm"] },
    };
    const result = await gm.closeTrimester(stateWithFired, []);
    // Still in firedMilestones (idempotent), but not duplicated
    expect(result.newState.worldState.firedMilestones.filter((m) => m === "rival_alarm")).toHaveLength(1);
  });
});

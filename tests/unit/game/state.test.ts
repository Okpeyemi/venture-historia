import { describe, it, expect } from "vitest";
import { createInitialState, computeRunwayMonths, monthlyBurn } from "@/lib/game/state";
import type { ScenarioRef } from "@/lib/game/types";

const scenario: ScenarioRef = {
  presetId: "test_preset",
  era: 2005,
  region: "Test",
  sector: "Test",
  startingYear: 2005,
  currentQuarter: "Q1",
  currentYear: 2005,
};

describe("createInitialState", () => {
  it("seeds a coherent state from scenario + starting params", () => {
    const state = createInitialState({
      scenario,
      companyName: "TestCo",
      startingCash: 50_000,
      startingTeamSize: 1,
    });
    expect(state.playerState.companyName).toBe("TestCo");
    expect(state.playerState.cash).toBe(50_000);
    expect(state.playerState.teamSize).toBe(1);
    expect(state.playerState.mrr).toBe(0);
    expect(state.playerState.reputation).toBe(50);
    expect(state.playerState.founderBurnout).toBe(20);
    expect(state.playerState.products).toEqual([]);
    expect(state.playerState.investors).toEqual([]);
    expect(state.playerState.boardSeatsTaken).toBe(0);
    expect(state.history.trimestersPlayed).toBe(0);
    expect(state.worldState.competitors).toEqual([]);
    expect(state.worldState.macroEventsActive).toEqual([]);
    expect(state.playerState.boardTension).toBe(0);
    expect(state.worldState.firedMilestones).toEqual([]);
  });
});

describe("monthlyBurn", () => {
  it("is teamSize × $10k + $5k base ops", () => {
    expect(monthlyBurn(0)).toBe(5_000);
    expect(monthlyBurn(1)).toBe(15_000);
    expect(monthlyBurn(5)).toBe(55_000);
  });
});

describe("computeRunwayMonths", () => {
  it("is floor(cash / monthlyBurn)", () => {
    expect(computeRunwayMonths({ cash: 60_000, teamSize: 1 })).toBe(4); // 60k / 15k = 4
    expect(computeRunwayMonths({ cash: 100_000, teamSize: 5 })).toBe(1); // 100k / 55k = 1
    expect(computeRunwayMonths({ cash: 0, teamSize: 5 })).toBe(0);
  });

  it("returns 0 when burn is somehow 0", () => {
    expect(computeRunwayMonths({ cash: 10_000, teamSize: -1 })).toBe(0);
  });
});

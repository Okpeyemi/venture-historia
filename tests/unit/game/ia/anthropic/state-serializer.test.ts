import { describe, it, expect } from "vitest";
import { serializeForPrompt } from "@/lib/game/ia/anthropic/state-serializer";
import { createInitialState } from "@/lib/game/state";

const baseState = () =>
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

describe("serializeForPrompt", () => {
  it("emits compact JSON (no whitespace) parseable round-trip", () => {
    const json = serializeForPrompt(baseState());
    expect(json).not.toContain("  ");
    expect(json).not.toContain("\n");
    const parsed = JSON.parse(json);
    expect(parsed.playerState.companyName).toBe("TestCo");
    expect(parsed.playerState.cash).toBe(100_000);
    expect(parsed.scenario.currentQuarter).toBe("Q1");
  });

  it("includes all four top-level state sections", () => {
    const json = serializeForPrompt(baseState());
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).sort()).toEqual(["history", "playerState", "scenario", "worldState"]);
  });
});

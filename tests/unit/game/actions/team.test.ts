import { describe, it, expect } from "vitest";
import { processTeam } from "@/lib/game/actions/team";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action } from "@/lib/game/types";

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
    startingCash: 200_000,
    startingTeamSize: 5,
  });

describe("processTeam — team.hire", () => {
  it("increments teamSize and immediately debits one quarter of salary", () => {
    const state = baseState();
    const action: Action = { kind: "team.hire", level: "senior", salaryAnnual: 120_000 };
    const next = processTeam(state, action);
    expect(next.playerState.teamSize).toBe(6);
    // 120k annual / 4 = 30k per quarter
    expect(next.playerState.cash).toBe(170_000);
  });

  it("rejects hire when cash < first quarter of salary", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, cash: 10_000 } };
    const action: Action = { kind: "team.hire", level: "senior", salaryAnnual: 120_000 };
    expect(() => processTeam(state, action)).toThrow(/insufficient cash/i);
  });
});

describe("processTeam — team.fire", () => {
  it("decrements teamSize by count", () => {
    const state = baseState();
    const action: Action = { kind: "team.fire", count: 2 };
    const next = processTeam(state, action);
    expect(next.playerState.teamSize).toBe(3);
  });

  it("clamps teamSize to >= 0 and rejects firing more than available", () => {
    const state = baseState();
    const action: Action = { kind: "team.fire", count: 99 };
    expect(() => processTeam(state, action)).toThrow(/cannot fire/i);
  });
});

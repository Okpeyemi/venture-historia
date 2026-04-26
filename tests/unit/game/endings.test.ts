import { describe, it, expect } from "vitest";
import { detectAutoEnding, applyPlayerEnding } from "@/lib/game/endings";
import { createInitialState } from "@/lib/game/state";
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
    startingCash: 100_000,
    startingTeamSize: 3,
  });

describe("detectAutoEnding", () => {
  it("returns null on a healthy state", () => {
    expect(detectAutoEnding(baseState())).toBeNull();
  });

  it("detects bankruptcy when cash <= 0", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, cash: 0 } };
    expect(detectAutoEnding(state)?.kind).toBe("bankruptcy");
  });

  it("detects burnout when founderBurnout >= 100", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, founderBurnout: 100 } };
    expect(detectAutoEnding(state)?.kind).toBe("burnout");
  });

  it("prefers burnout over bankruptcy when both apply", () => {
    const state = {
      ...baseState(),
      playerState: { ...baseState().playerState, cash: 0, founderBurnout: 100 },
    };
    expect(detectAutoEnding(state)?.kind).toBe("burnout");
  });

  it("detects ousting when boardTension >= 100 and at least one board seat is taken", () => {
    const state = {
      ...baseState(),
      playerState: { ...baseState().playerState, boardTension: 100, boardSeatsTaken: 1 },
    };
    expect(detectAutoEnding(state)?.kind).toBe("ousting");
  });

  it("does NOT detect ousting when boardTension >= 100 but no board seat is taken", () => {
    const state = {
      ...baseState(),
      playerState: { ...baseState().playerState, boardTension: 100, boardSeatsTaken: 0 },
    };
    expect(detectAutoEnding(state)).toBeNull();
  });

  it("detects industry_collapse when worldState.macroEventsActive includes 'industry_collapse_triggered'", () => {
    const state = {
      ...baseState(),
      worldState: { ...baseState().worldState, macroEventsActive: ["industry_collapse_triggered"] },
    };
    expect(detectAutoEnding(state)?.kind).toBe("industry_collapse");
  });

  it("orders endings: burnout > bankruptcy > ousting > industry_collapse", () => {
    const state = {
      ...baseState(),
      playerState: {
        ...baseState().playerState,
        founderBurnout: 100,
        cash: 0,
        boardTension: 100,
        boardSeatsTaken: 1,
      },
      worldState: { ...baseState().worldState, macroEventsActive: ["industry_collapse_triggered"] },
    };
    expect(detectAutoEnding(state)?.kind).toBe("burnout");
  });
});

describe("applyPlayerEnding", () => {
  it("creates an ipo ending with the trimester index", () => {
    const state = { ...baseState(), history: { ...baseState().history, trimestersPlayed: 30 } };
    const action: Action = { kind: "endgame.declareIPO" };
    const ending = applyPlayerEnding(state, action);
    expect(ending.kind).toBe("ipo");
    expect(ending.trimesterIndex).toBe(30);
  });

  it("creates an acquisition ending capturing the price", () => {
    const action: Action = { kind: "endgame.acceptAcquisition", acquirerName: "BigCo", price: 50_000_000 };
    const ending = applyPlayerEnding(baseState(), action);
    expect(ending.kind).toBe("acquisition");
    expect(ending.summary).toMatch(/BigCo.*50000000/);
  });

  it("creates a lifestyle ending", () => {
    const ending = applyPlayerEnding(baseState(), { kind: "endgame.declareLifestyle" });
    expect(ending.kind).toBe("lifestyle");
  });

  it("creates a conglomerate ending", () => {
    const ending = applyPlayerEnding(baseState(), { kind: "endgame.declareConglomerate" });
    expect(ending.kind).toBe("conglomerate");
  });
});

import { describe, it, expect } from "vitest";
import { processMarket } from "@/lib/game/actions/market";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action } from "@/lib/game/types";

const baseState = (): GameState => {
  const s = createInitialState({
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
  return { ...s, playerState: { ...s.playerState, mrr: 10_000, reputation: 60 } };
};

describe("processMarket — market.campaign", () => {
  it("debits cash, raises reputation by floor(budget / 5000), capped at 100", () => {
    const state = baseState();
    const action: Action = { kind: "market.campaign", budget: 25_000 };
    const next = processMarket(state, action);
    expect(next.playerState.cash).toBe(75_000);
    // 60 + floor(25000/5000) = 65
    expect(next.playerState.reputation).toBe(65);
  });

  it("clamps reputation to 100", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, reputation: 99 } };
    const action: Action = { kind: "market.campaign", budget: 50_000 };
    const next = processMarket(state, action);
    expect(next.playerState.reputation).toBe(100);
  });

  it("rejects budget exceeding cash", () => {
    const state = baseState();
    const action: Action = { kind: "market.campaign", budget: 999_999 };
    expect(() => processMarket(state, action)).toThrow(/insufficient cash/i);
  });
});

describe("processMarket — market.adjustPricing", () => {
  it("scales MRR by 1 + deltaPct/100", () => {
    const state = baseState(); // mrr 10_000
    const next = processMarket(state, { kind: "market.adjustPricing", deltaPct: 20 });
    expect(next.playerState.mrr).toBe(12_000);
  });

  it("floors MRR at 0 for big negative deltas", () => {
    const state = baseState();
    const next = processMarket(state, { kind: "market.adjustPricing", deltaPct: -150 });
    expect(next.playerState.mrr).toBe(0);
  });
});

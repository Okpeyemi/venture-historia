import { describe, it, expect } from "vitest";
import { processStrategy } from "@/lib/game/actions/strategy";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action, Competitor } from "@/lib/game/types";

const competitor = (): Competitor => ({
  id: "rival1",
  name: "RivalCo",
  scriptedPersona: "aggressive",
  scriptedState: { valuation: 50_000_000, teamSize: 30 },
});

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
    startingCash: 10_000_000,
    startingTeamSize: 20,
  });
  return {
    ...s,
    worldState: { ...s.worldState, competitors: [competitor()] },
    playerState: { ...s.playerState, mrr: 50_000 },
  };
};

describe("processStrategy — strategy.partnership", () => {
  it("records a consequence with revShare and 4 quarters of effect", () => {
    const state = baseState();
    const action: Action = { kind: "strategy.partnership", partnerName: "BigCo", revShare: 10 };
    const next = processStrategy(state, action);
    expect(next.history.activeConsequences).toHaveLength(1);
    expect(next.history.activeConsequences[0]).toMatchObject({
      remainingQuarters: 4,
    });
    expect(next.history.activeConsequences[0].description).toMatch(/BigCo.*10%/);
  });
});

describe("processStrategy — strategy.tryAcquire", () => {
  it("on success (offer >= 80% of valuation), removes competitor and debits cash", () => {
    const state = baseState();
    const action: Action = { kind: "strategy.tryAcquire", competitorId: "rival1", offerAmount: 40_000_000 };
    const next = processStrategy(state, action);
    expect(next.worldState.competitors).toHaveLength(0);
    expect(next.playerState.cash).toBe(10_000_000 - 40_000_000); // negative; engine tolerates
  });

  it("on failure (offer < 80% of valuation), returns state unchanged but records a key decision", () => {
    const state = baseState();
    const action: Action = { kind: "strategy.tryAcquire", competitorId: "rival1", offerAmount: 1_000_000 };
    const next = processStrategy(state, action);
    expect(next.worldState.competitors).toHaveLength(1);
    expect(next.playerState.cash).toBe(10_000_000);
    expect(next.history.keyDecisions.at(-1)?.summary).toMatch(/declined/i);
  });

  it("rejects acquiring a competitor that doesn't exist", () => {
    const state = baseState();
    const action: Action = { kind: "strategy.tryAcquire", competitorId: "ghost", offerAmount: 1 };
    expect(() => processStrategy(state, action)).toThrow(/not found/i);
  });
});

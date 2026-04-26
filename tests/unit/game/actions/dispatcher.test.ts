import { describe, it, expect } from "vitest";
import { processAction } from "@/lib/game/actions";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { Action, GameState } from "@/lib/game/types";

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
    startingCash: 5_000_000,
    startingTeamSize: 5,
  });

describe("processAction dispatcher", () => {
  it("routes finance.* to processFinance", () => {
    const action: Action = { kind: "finance.allocateBudget", category: "marketing", amount: 10_000 };
    const next = processAction(baseState(), action);
    expect(next.playerState.cash).toBe(4_990_000);
  });

  it("routes team.* to processTeam", () => {
    const action: Action = { kind: "team.hire", level: "junior", salaryAnnual: 60_000 };
    const next = processAction(baseState(), action);
    expect(next.playerState.teamSize).toBe(6);
  });

  it("routes product.* to processProduct", () => {
    const action: Action = { kind: "product.startRD", productName: "X", quartersUntilLaunch: 2 };
    const next = processAction(baseState(), action);
    expect(next.playerState.products).toHaveLength(1);
  });

  it("routes market.* to processMarket", () => {
    const action: Action = { kind: "market.campaign", budget: 5_000 };
    const next = processAction(baseState(), action);
    expect(next.playerState.cash).toBe(4_995_000);
    expect(next.playerState.reputation).toBe(51);
  });

  it("routes strategy.* to processStrategy", () => {
    const action: Action = { kind: "strategy.partnership", partnerName: "BigCo", revShare: 5 };
    const next = processAction(baseState(), action);
    expect(next.history.activeConsequences).toHaveLength(1);
  });

  it("rejects endgame.* with a redirect message pointing at endings.ts", () => {
    const action: Action = { kind: "endgame.declareIPO" };
    expect(() => processAction(baseState(), action)).toThrow(InvalidActionError);
    expect(() => processAction(baseState(), action)).toThrow(/endings\.ts/);
  });

  it("rejects unknown action kinds with the kind name in the error", () => {
    const bogus = { kind: "bogus.action" } as unknown as Action;
    expect(() => processAction(baseState(), bogus)).toThrow(/unknown action kind: bogus\.action/);
  });
});

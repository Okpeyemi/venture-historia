import { describe, it, expect } from "vitest";
import { processFinance } from "@/lib/game/actions/finance";
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
    startingCash: 100_000,
    startingTeamSize: 2,
  });

describe("processFinance — finance.raiseFunds", () => {
  it("adds cash, records investor, and increments boardSeatsTaken", () => {
    const state = baseState();
    const action: Action = {
      kind: "finance.raiseFunds",
      round: "seed",
      amount: 500_000,
      equityPct: 15,
      investorName: "Acme Capital",
      boardSeats: 1,
      hasVeto: false,
    };
    const next = processFinance(state, action);
    expect(next.playerState.cash).toBe(600_000);
    expect(next.playerState.investors).toEqual([
      { name: "Acme Capital", amount: 500_000, equityPct: 15, boardSeats: 1, hasVeto: false },
    ]);
    expect(next.playerState.boardSeatsTaken).toBe(1);
  });

  it("rejects amount <= 0", () => {
    const state = baseState();
    const action: Action = {
      kind: "finance.raiseFunds",
      round: "seed",
      amount: 0,
      equityPct: 15,
      investorName: "X",
      boardSeats: 0,
      hasVeto: false,
    };
    expect(() => processFinance(state, action)).toThrow(InvalidActionError);
  });
});

describe("processFinance — finance.allocateBudget", () => {
  it("debits cash by the allocated amount", () => {
    const state = baseState();
    const action: Action = { kind: "finance.allocateBudget", category: "marketing", amount: 30_000 };
    const next = processFinance(state, action);
    expect(next.playerState.cash).toBe(70_000);
  });

  it("rejects allocation exceeding available cash", () => {
    const state = baseState();
    const action: Action = { kind: "finance.allocateBudget", category: "rd", amount: 1_000_000 };
    expect(() => processFinance(state, action)).toThrow(/insufficient cash/i);
  });
});

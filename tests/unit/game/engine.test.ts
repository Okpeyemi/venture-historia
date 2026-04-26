import { describe, it, expect } from "vitest";
import { advanceTrimester } from "@/lib/game/engine";
import { createInitialState } from "@/lib/game/state";
import { MockGameMaster } from "@/lib/game/ia/mock";
import type { Decision, GameState } from "@/lib/game/types";

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
    startingTeamSize: 2,
  });

describe("advanceTrimester", () => {
  it("returns opening narration, no event on trimester 0, applies decisions, and increments trimestersPlayed", async () => {
    const gm = new MockGameMaster();
    const decisions: Decision[] = [
      { kind: "action", action: { kind: "finance.allocateBudget", category: "marketing", amount: 20_000 } },
    ];
    const result = await advanceTrimester({ state: baseState(), decisions, gm });

    expect(result.opening.narration).toContain("[mock]");
    expect(result.opening.event).toBeNull();
    expect(result.closing.narration).toContain("[mock]");
    expect(result.newState.history.trimestersPlayed).toBe(1);
    // Cash decreased by 20k (allocateBudget) — burn is NOT subtracted by the engine yet (deferred to scenario plans)
    expect(result.newState.playerState.cash).toBe(180_000);
    expect(result.newState.scenario.currentQuarter).toBe("Q2");
  });

  it("surfaces an event at trimester 3 (per the mock cadence)", async () => {
    const gm = new MockGameMaster();
    let state = baseState();
    for (let i = 0; i < 3; i++) {
      const r = await advanceTrimester({ state, decisions: [], gm });
      state = r.newState;
    }
    // Now trimestersPlayed === 3, next opening should fire an event
    const r = await advanceTrimester({ state, decisions: [], gm });
    expect(r.opening.event).not.toBeNull();
    expect(r.opening.event?.choices).toHaveLength(3);
  });
});

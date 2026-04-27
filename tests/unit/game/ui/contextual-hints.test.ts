import { describe, it, expect } from "vitest";
import { pickHint } from "@/lib/game/ui/contextual-hints";
import type { GameState } from "@/lib/game/types";

function baseState(overrides: Partial<GameState["playerState"]> = {}): GameState {
  return {
    playerState: {
      companyName: "TestCo",
      cash: 100_000,
      mrr: 0,
      teamSize: 1,
      runwayMonths: 12,
      founderBurnout: 30,
      boardTension: 20,
      reputation: 50,
      products: [],
      investors: [],
      ...overrides,
    },
    scenario: {
      currentQuarter: "Q1",
      currentYear: 2005,
      totalTrimesters: 12,
    },
    worldState: { marketConditions: "neutral", competitors: [] },
    history: { trimestersPlayed: 0, activeConsequences: [] },
  } as unknown as GameState;
}

describe("pickHint", () => {
  it("rule 1: runwayMonths <= 3 → runway-critical", () => {
    const r = pickHint(baseState({ runwayMonths: 3 }));
    expect(r.id).toBe("runway-critical");
    expect(r.message).toMatch(/Faillite imminente/);
  });

  it("rule 1 boundary: runwayMonths = 0 still fires runway-critical", () => {
    expect(pickHint(baseState({ runwayMonths: 0 })).id).toBe("runway-critical");
  });

  it("rule 2: founderBurnout > 75 → burnout-high (when runway is OK)", () => {
    const r = pickHint(baseState({ runwayMonths: 12, founderBurnout: 80 }));
    expect(r.id).toBe("burnout-high");
  });

  it("rule 3: boardTension > 70 → board-hostile (when runway and burnout OK)", () => {
    const r = pickHint(baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 75 }));
    expect(r.id).toBe("board-hostile");
  });

  it("rule 4: 3 < runwayMonths < 6 → runway-short", () => {
    const r = pickHint(baseState({ runwayMonths: 5 }));
    expect(r.id).toBe("runway-short");
  });

  it("rule 5: trimestersPlayed === 0 (and nothing more critical) → first-trimester", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 0;
    expect(pickHint(s).id).toBe("first-trimester");
  });

  it("rule 6: no launched product after trimester 4 → no-product-yet", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 5;
    s.playerState.products = [{ name: "p1", launched: false, quartersUntilLaunch: 2 } as never];
    expect(pickHint(s).id).toBe("no-product-yet");
  });

  it("rule 6 ignores when at least one product is launched", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 5;
    s.playerState.products = [{ name: "p1", launched: true, quartersUntilLaunch: 0 } as never];
    expect(pickHint(s).id).toBe("stable");
  });

  it("fallback: stable", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 6;
    s.playerState.products = [{ name: "p1", launched: true, quartersUntilLaunch: 0 } as never];
    const r = pickHint(s);
    expect(r.id).toBe("stable");
    expect(r.message).toMatch(/État stable/);
  });
});

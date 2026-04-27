import { describe, it, expect } from "vitest";
import { pickHint } from "@/lib/game/ui/contextual-hints";
import type { GameState, Product } from "@/lib/game/types";

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
      boardSeatsTaken: 0,
      ...overrides,
    },
    scenario: {
      presetId: "test",
      era: 2005,
      region: "us",
      sector: "saas",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    worldState: {
      marketConditions: "neutral",
      macroEventsActive: [],
      competitors: [],
      firedMilestones: [],
    },
    history: {
      trimestersPlayed: 0,
      narrativeSummary: "",
      keyDecisions: [],
      activeConsequences: [],
    },
  };
}

const productInRD: Product = {
  name: "p1",
  stage: "rd",
  satisfaction: 0,
  quartersInRD: 2,
};

const productShipped: Product = {
  name: "p1",
  stage: "shipped",
  satisfaction: 70,
  quartersInRD: 0,
};

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

  it("rule 6: no shipped product after trimester 4 → no-product-yet", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 5;
    s.playerState.products = [productInRD];
    expect(pickHint(s).id).toBe("no-product-yet");
  });

  it("rule 6 ignores when at least one product is shipped", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 5;
    s.playerState.products = [productShipped];
    expect(pickHint(s).id).toBe("stable");
  });

  it("fallback: stable", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 6;
    s.playerState.products = [productShipped];
    const r = pickHint(s);
    expect(r.id).toBe("stable");
    expect(r.message).toMatch(/État stable/);
  });
});

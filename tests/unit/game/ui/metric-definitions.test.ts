import { describe, it, expect } from "vitest";
import { METRICS, type Tone } from "@/lib/game/ui/metric-definitions";
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

describe("METRICS shape", () => {
  it("has exactly 7 entries", () => {
    expect(METRICS).toHaveLength(7);
  });

  it("has unique IDs", () => {
    const ids = METRICS.map((m) => m.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("includes the 7 expected ids", () => {
    const ids = METRICS.map((m) => m.id).sort();
    expect(ids).toEqual(["boardTension", "burnout", "cash", "mrr", "reputation", "runway", "team"]);
  });

  it("every metric has a non-empty label and tooltip", () => {
    for (const m of METRICS) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.tooltip.length).toBeGreaterThan(10);
    }
  });
});

describe("METRICS.tone", () => {
  function tone(id: string, state: GameState): Tone {
    const m = METRICS.find((x) => x.id === id);
    if (!m) throw new Error(`no metric ${id}`);
    return m.tone(state);
  }

  it("runway: 3 → crit (boundary)", () => {
    expect(tone("runway", baseState({ runwayMonths: 3 }))).toBe("crit");
  });
  it("runway: 4 → warn (between thresholds)", () => {
    expect(tone("runway", baseState({ runwayMonths: 4 }))).toBe("warn");
  });
  it("runway: 6 → neutral (lower bound of safe)", () => {
    expect(tone("runway", baseState({ runwayMonths: 6 }))).toBe("neutral");
  });

  it("burnout: 76 → warn (just above threshold)", () => {
    expect(tone("burnout", baseState({ founderBurnout: 76 }))).toBe("warn");
  });
  it("burnout: 91 → crit", () => {
    expect(tone("burnout", baseState({ founderBurnout: 91 }))).toBe("crit");
  });

  it("boardTension: 71 → warn", () => {
    expect(tone("boardTension", baseState({ boardTension: 71 }))).toBe("warn");
  });
  it("boardTension: 81 → crit", () => {
    expect(tone("boardTension", baseState({ boardTension: 81 }))).toBe("crit");
  });

  it("cash always neutral when positive", () => {
    expect(tone("cash", baseState({ cash: 100_000 }))).toBe("neutral");
  });

  it("mrr / team / reputation: always neutral", () => {
    const s = baseState();
    expect(tone("mrr", s)).toBe("neutral");
    expect(tone("team", s)).toBe("neutral");
    expect(tone("reputation", s)).toBe("neutral");
  });
});

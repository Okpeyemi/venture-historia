import { describe, it, expect } from "vitest";
import { evaluateMilestones, applyMilestoneReactions } from "@/lib/game/scenarios/milestones";
import { createInitialState } from "@/lib/game/state";
import type { ScenarioCompetitor } from "@/lib/game/scenarios/types";
import type { GameState } from "@/lib/game/types";

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

const competitorWithMilestones = (): ScenarioCompetitor => ({
  id: "c1",
  name: "C1",
  scriptedPersona: "test",
  initialValuation: 10_000_000,
  initialTeamSize: 10,
  milestones: [
    {
      id: "ms_mrr",
      trigger: { kind: "playerMrrAtLeast", mrr: 50_000 },
      reaction: { kind: "narration", text: "MRR milestone hit" },
    },
    {
      id: "ms_quarter",
      trigger: { kind: "atQuarter", year: 2005, quarter: "Q3" },
      reaction: { kind: "boardTensionDelta", delta: 15 },
    },
  ],
});

describe("evaluateMilestones", () => {
  it("returns no firings when no triggers match", () => {
    const state = baseState();
    const firings = evaluateMilestones([competitorWithMilestones()], state);
    expect(firings).toEqual([]);
  });

  it("fires playerMrrAtLeast when state.mrr crosses the threshold", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, mrr: 75_000 } };
    const firings = evaluateMilestones([competitorWithMilestones()], state);
    expect(firings).toHaveLength(1);
    expect(firings[0]?.id).toBe("ms_mrr");
  });

  it("fires atQuarter when scenario time matches", () => {
    const state = {
      ...baseState(),
      scenario: { ...baseState().scenario, currentQuarter: "Q3", currentYear: 2005 } as const,
    };
    const firings = evaluateMilestones([competitorWithMilestones()], state);
    expect(firings).toHaveLength(1);
    expect(firings[0]?.id).toBe("ms_quarter");
  });

  it("does NOT re-fire a milestone already in worldState.firedMilestones", () => {
    const state = {
      ...baseState(),
      playerState: { ...baseState().playerState, mrr: 75_000 },
      worldState: { ...baseState().worldState, firedMilestones: ["ms_mrr"] },
    };
    const firings = evaluateMilestones([competitorWithMilestones()], state);
    expect(firings).toEqual([]);
  });
});

describe("applyMilestoneReactions", () => {
  it("appends fired milestone ids to worldState.firedMilestones", () => {
    const state = baseState();
    const competitor = competitorWithMilestones();
    const next = applyMilestoneReactions(state, [
      { id: "ms_mrr", competitorId: "c1", reaction: competitor.milestones[0]!.reaction },
    ]);
    expect(next.worldState.firedMilestones).toContain("ms_mrr");
  });

  it("applies competitorValuationDelta", () => {
    const state = {
      ...baseState(),
      worldState: {
        ...baseState().worldState,
        competitors: [
          { id: "c1", name: "C1", scriptedPersona: "t", scriptedState: { valuation: 10_000_000, teamSize: 10 } },
        ],
      },
    };
    const next = applyMilestoneReactions(state, [
      {
        id: "ms_x",
        competitorId: "c1",
        reaction: { kind: "competitorValuationDelta", competitorId: "c1", deltaPct: 50 },
      },
    ]);
    expect(next.worldState.competitors[0]?.scriptedState.valuation).toBe(15_000_000);
  });

  it("applies boardTensionDelta clamped to [0, 100]", () => {
    const state = baseState();
    const next = applyMilestoneReactions(state, [
      { id: "ms_x", competitorId: "c1", reaction: { kind: "boardTensionDelta", delta: 30 } },
    ]);
    expect(next.playerState.boardTension).toBe(30);

    const next2 = applyMilestoneReactions(next, [
      { id: "ms_y", competitorId: "c1", reaction: { kind: "boardTensionDelta", delta: 200 } },
    ]);
    expect(next2.playerState.boardTension).toBe(100);
  });

  it("appends narration text to history.narrativeSummary on a 'narration' reaction", () => {
    const state = baseState();
    const next = applyMilestoneReactions(state, [
      { id: "ms_x", competitorId: "c1", reaction: { kind: "narration", text: "VertexCRM strikes" } },
    ]);
    expect(next.history.narrativeSummary).toContain("VertexCRM strikes");
  });
});

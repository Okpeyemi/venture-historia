import type { GameState } from "../types";
import type {
  ScenarioCompetitor,
  ScenarioMilestone,
  MilestoneReaction,
} from "./types";

export type MilestoneFiring = {
  id: string;
  competitorId: string;
  reaction: MilestoneReaction;
};

function triggerMatches(state: GameState, milestone: ScenarioMilestone): boolean {
  const { trigger } = milestone;
  switch (trigger.kind) {
    case "playerMrrAtLeast":
      return state.playerState.mrr >= trigger.mrr;
    case "playerCashAtLeast":
      return state.playerState.cash >= trigger.cash;
    case "playerProductsAtLeast":
      return state.playerState.products.length >= trigger.count;
    case "atQuarter":
      return (
        state.scenario.currentYear === trigger.year &&
        state.scenario.currentQuarter === trigger.quarter
      );
  }
}

export function evaluateMilestones(
  competitors: ScenarioCompetitor[],
  state: GameState,
): MilestoneFiring[] {
  const fired = new Set(state.worldState.firedMilestones);
  const firings: MilestoneFiring[] = [];
  for (const competitor of competitors) {
    for (const milestone of competitor.milestones) {
      if (fired.has(milestone.id)) continue;
      if (triggerMatches(state, milestone)) {
        firings.push({
          id: milestone.id,
          competitorId: competitor.id,
          reaction: milestone.reaction,
        });
      }
    }
  }
  return firings;
}

function clampTension(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export function applyMilestoneReactions(
  state: GameState,
  firings: MilestoneFiring[],
): GameState {
  let next = state;
  for (const firing of firings) {
    next = {
      ...next,
      worldState: {
        ...next.worldState,
        firedMilestones: [...next.worldState.firedMilestones, firing.id],
      },
    };
    switch (firing.reaction.kind) {
      case "narration": {
        const prefix = next.history.narrativeSummary ? next.history.narrativeSummary + "\n" : "";
        next = {
          ...next,
          history: { ...next.history, narrativeSummary: prefix + firing.reaction.text },
        };
        break;
      }
      case "competitorValuationDelta": {
        const targetId = firing.reaction.competitorId;
        const deltaPct = firing.reaction.deltaPct;
        const competitors = next.worldState.competitors.map((c) =>
          c.id === targetId
            ? {
                ...c,
                scriptedState: {
                  ...c.scriptedState,
                  valuation: Math.floor(c.scriptedState.valuation * (1 + deltaPct / 100)),
                },
              }
            : c,
        );
        next = { ...next, worldState: { ...next.worldState, competitors } };
        break;
      }
      case "boardTensionDelta": {
        next = {
          ...next,
          playerState: {
            ...next.playerState,
            boardTension: clampTension(next.playerState.boardTension + firing.reaction.delta),
          },
        };
        break;
      }
    }
  }
  return next;
}

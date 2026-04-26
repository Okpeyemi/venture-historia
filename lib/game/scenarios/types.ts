// lib/game/scenarios/types.ts
import type { Product, Quarter } from "../types";

// ─── Milestone triggers (when a competitor reaction fires) ─────

export type MilestoneTrigger =
  | { kind: "playerMrrAtLeast"; mrr: number }
  | { kind: "playerCashAtLeast"; cash: number }
  | { kind: "playerProductsAtLeast"; count: number }
  | { kind: "atQuarter"; year: number; quarter: Quarter };

// ─── Milestone reactions (what happens when triggered) ─────────

export type MilestoneReaction =
  | { kind: "narration"; text: string }
  | { kind: "competitorValuationDelta"; competitorId: string; deltaPct: number }
  | { kind: "boardTensionDelta"; delta: number };

export type ScenarioMilestone = {
  // Stable id. Once fired, recorded in worldState.firedMilestones to
  // ensure idempotent application across trimesters.
  id: string;
  trigger: MilestoneTrigger;
  reaction: MilestoneReaction;
};

// ─── Competitor (scripted NPC defined at preset level) ─────────

export type ScenarioCompetitor = {
  id: string;
  name: string;
  scriptedPersona: string;
  initialValuation: number;
  initialTeamSize: number;
  milestones: ScenarioMilestone[];
};

// ─── Investor template (used to construct finance.raiseFunds Action) ─

export type ScenarioInvestorTemplate = {
  name: string;
  preferredRound: "seed" | "A" | "B" | "C";
  amount: number;
  equityPct: number;
  boardSeats: number;
  hasVeto: boolean;
};

// ─── Macro event (scheduled per quarter) ───────────────────────

export type ScenarioMacroEvent = {
  id: string;
  trigger: { year: number; quarter: Quarter };
  narration: string;
  effect:
    | { kind: "narration_only" }
    | { kind: "trigger_industry_collapse" }
    | { kind: "add_macro_flag"; flag: string };
};

// ─── Top-level preset ──────────────────────────────────────────

export type ScenarioPreset = {
  id: string;
  name: string;
  loreSummary: string;

  // Scenario coordinates
  era: number;
  region: string;
  sector: string;
  startingYear: number;
  startingQuarter: Quarter;

  // Initial state
  companyName: string;
  startingCash: number;
  startingTeamSize: number;
  startingProducts: Product[];

  // Scripted population
  competitors: ScenarioCompetitor[];
  investors: ScenarioInvestorTemplate[];
  macroEvents: ScenarioMacroEvent[];
};

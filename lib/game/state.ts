import type { GameState, ScenarioRef } from "./types";

export function monthlyBurn(teamSize: number): number {
  if (teamSize < 0) return 0;
  return teamSize * 10_000 + 5_000;
}

export function computeRunwayMonths(args: { cash: number; teamSize: number }): number {
  const burn = monthlyBurn(args.teamSize);
  if (burn <= 0) return 0;
  if (args.cash <= 0) return 0;
  return Math.floor(args.cash / burn);
}

export function createInitialState(args: {
  scenario: ScenarioRef;
  companyName: string;
  startingCash: number;
  startingTeamSize: number;
}): GameState {
  return {
    scenario: args.scenario,
    worldState: {
      marketConditions: "neutral",
      macroEventsActive: [],
      competitors: [],
    },
    playerState: {
      companyName: args.companyName,
      cash: args.startingCash,
      teamSize: args.startingTeamSize,
      mrr: 0,
      reputation: 50,
      runwayMonths: computeRunwayMonths({
        cash: args.startingCash,
        teamSize: args.startingTeamSize,
      }),
      founderBurnout: 20,
      products: [],
      investors: [],
      boardSeatsTaken: 0,
    },
    history: {
      trimestersPlayed: 0,
      narrativeSummary: "",
      keyDecisions: [],
      activeConsequences: [],
    },
  };
}

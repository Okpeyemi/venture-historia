import type {
  IGameMaster,
  GameMasterOpening,
  GameMasterClosing,
  IValidator,
  ValidatorVerdict,
  IAdvisor,
} from "./types";
import type { Decision, GameState } from "../types";
import { processAction } from "../actions";
import { applyBurnoutDelta, BURNOUT_DELTAS } from "../burnout";
import { computeRunwayMonths } from "../state";

/**
 * Deterministic GM used for tests. Generates a canned opening narration,
 * surfaces a single canned event every 3rd trimester, and at close time
 * folds player decisions into the next state by re-running each action
 * through the pure processors and applying baseline burnout deltas.
 */
export class MockGameMaster implements IGameMaster {
  async openTrimester(state: GameState): Promise<GameMasterOpening> {
    const narration = `[mock] Q${state.scenario.currentQuarter.slice(1)} ${state.scenario.currentYear}: market is ${state.worldState.marketConditions}.`;
    const fireEvent = state.history.trimestersPlayed > 0 && state.history.trimestersPlayed % 3 === 0;
    if (!fireEvent) return { narration, event: null };
    return {
      narration,
      event: {
        id: `evt-${state.history.trimestersPlayed}`,
        situation: "[mock event] An investor offers a quick term sheet.",
        choices: [
          { id: "accept", label: "Accept" },
          { id: "negotiate", label: "Negotiate" },
          { id: "decline", label: "Decline" },
        ],
      },
    };
  }

  async closeTrimester(state: GameState, decisions: Decision[]): Promise<GameMasterClosing> {
    let next = state;
    let firedSomeone = false;
    let raised = false;
    let shipped = false;

    for (const d of decisions) {
      if (d.kind !== "action") continue;
      try {
        next = processAction(next, d.action);
      } catch {
        // Mock GM tolerates invalid actions; real GM/Validator filter them earlier.
      }
      if (d.action.kind === "team.fire") firedSomeone = true;
      if (d.action.kind === "finance.raiseFunds") raised = true;
      if (d.action.kind === "product.launch") shipped = true;
    }

    // Burnout delta at close: accumulate, then apply once with clamping.
    let delta = BURNOUT_DELTAS.baseline;
    if (firedSomeone) delta += BURNOUT_DELTAS.firedSomeone;
    if (raised) delta += BURNOUT_DELTAS.successfulRaise;
    if (shipped) delta += BURNOUT_DELTAS.shippedProduct;
    const runway = computeRunwayMonths({
      cash: next.playerState.cash,
      teamSize: next.playerState.teamSize,
    });
    if (runway < 3) delta += BURNOUT_DELTAS.runwayCritical;

    const newPlayerState = {
      ...next.playerState,
      founderBurnout: applyBurnoutDelta(next.playerState.founderBurnout, delta),
      runwayMonths: runway,
    };

    // Tick consequences
    const consequences = next.history.activeConsequences
      .map((c) => ({ ...c, remainingQuarters: c.remainingQuarters - 1 }))
      .filter((c) => c.remainingQuarters > 0);

    // Advance time
    const order: Array<"Q1" | "Q2" | "Q3" | "Q4"> = ["Q1", "Q2", "Q3", "Q4"];
    const idx = order.indexOf(next.scenario.currentQuarter);
    const nextQuarter = order[(idx + 1) % 4]!;
    const nextYear =
      nextQuarter === "Q1" ? next.scenario.currentYear + 1 : next.scenario.currentYear;

    return {
      narration: `[mock] Closing Q${idx + 1} ${next.scenario.currentYear}. ${decisions.length} decisions applied.`,
      newState: {
        ...next,
        playerState: newPlayerState,
        scenario: { ...next.scenario, currentQuarter: nextQuarter, currentYear: nextYear },
        history: {
          ...next.history,
          trimestersPlayed: next.history.trimestersPlayed + 1,
          activeConsequences: consequences,
        },
      },
    };
  }
}

export class MockValidator implements IValidator {
  async validate(_state: GameState, naturalLanguage: string): Promise<ValidatorVerdict> {
    return { accepted: false, reason: `[mock] cannot interpret: "${naturalLanguage}"` };
  }
}

export class MockAdvisor implements IAdvisor {
  async recommend(state: GameState): Promise<string> {
    if (state.playerState.runwayMonths < 6) {
      return "[mock advice] Runway is short. Consider raising funds or cutting burn.";
    }
    return "[mock advice] State looks healthy. Keep building.";
  }
}

/**
 * Test-only validator that always accepts the input as a fixed canonical
 * Action. Use to exercise the acceptance path of validateNlActionAction
 * without depending on the real Anthropic SDK.
 */
export class MockValidatorAccepting implements IValidator {
  constructor(private readonly action: import("../types").Action) {}

  async validate(_state: GameState, _naturalLanguage: string): Promise<ValidatorVerdict> {
    return { accepted: true, action: this.action };
  }
}

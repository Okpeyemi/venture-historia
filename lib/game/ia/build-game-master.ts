// Factories for IA agents. Despite the filename, this module hosts all
// three: game-master, validator, advisor. Centralising them here makes
// the MOCK_IA toggle a single decision per agent kind.

import { env } from "@/lib/env";
import type { IGameMaster, IValidator, IAdvisor } from "./types";
import { MockGameMaster, MockValidator, MockAdvisor } from "./mock";
import { AnthropicGameMaster } from "./anthropic/game-master";
import { AnthropicValidator } from "./anthropic/validator";
import { AnthropicAdvisor } from "./anthropic/advisor";
import { ScriptedGameMaster } from "@/lib/game/scenarios/scripted-game-master";
import type { ScenarioPreset } from "@/lib/game/scenarios/types";

export type BuildGameMasterArgs = {
  preset: ScenarioPreset;
  gameId: string;
  trimesterIndex: number;
};

/**
 * Construct the GM stack for a server action. Always wraps with
 * ScriptedGameMaster (so preset reactions fire); the inner GM is
 * MockGameMaster when MOCK_IA=true (dev/E2E), otherwise
 * AnthropicGameMaster (real Claude calls).
 */
export function buildGameMaster(args: BuildGameMasterArgs): IGameMaster {
  const inner: IGameMaster = env.MOCK_IA
    ? new MockGameMaster()
    : new AnthropicGameMaster({
        gameId: args.gameId,
        trimesterIndex: args.trimesterIndex,
      });
  return new ScriptedGameMaster(args.preset, inner);
}

export type BuildValidatorArgs = {
  gameId: string;
};

/**
 * Construct the Validator. MOCK_IA=true uses MockValidator (always
 * rejects with a "[mock] cannot interpret" reason — fine for dev/E2E
 * since the rejection path is the easy one to exercise).
 */
export function buildValidator(args: BuildValidatorArgs): IValidator {
  if (env.MOCK_IA) return new MockValidator();
  return new AnthropicValidator({ gameId: args.gameId });
}

export type BuildAdvisorArgs = {
  gameId: string;
};

/**
 * Construct the Advisor. MOCK_IA=true uses MockAdvisor (returns a
 * canned recommendation that varies on runway).
 */
export function buildAdvisor(args: BuildAdvisorArgs): IAdvisor {
  if (env.MOCK_IA) return new MockAdvisor();
  return new AnthropicAdvisor({ gameId: args.gameId });
}

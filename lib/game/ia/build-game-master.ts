import { env } from "@/lib/env";
import type { IGameMaster } from "./types";
import { MockGameMaster } from "./mock";
import { AnthropicGameMaster } from "./anthropic/game-master";
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

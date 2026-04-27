import { anthropicClient, withRetry } from "./client";
import { recordIaCall } from "./cost-log";
import { serializeForPrompt } from "./state-serializer";
import {
  DEFAULT_MODEL,
  GAME_MASTER_SYSTEM,
  TOOL_APPLY_TRIMESTER_OPEN,
  TOOL_APPLY_TRIMESTER_CLOSE,
} from "./prompts";
import type {
  IGameMaster,
  GameMasterOpening,
  GameMasterClosing,
} from "../types";
import type { Decision, GameState, TrimesterEvent } from "@/lib/game/types";
import { MockGameMaster } from "../mock";

const DEFAULT_MAX_TOKENS = 1024;

export type AnthropicGameMasterOptions = {
  gameId: string | null;
  trimesterIndex: number | null;
  model?: string;
};

/**
 * Real Game Master backed by Claude. Composes an inner deterministic GM
 * (default: MockGameMaster) for state evolution (action processing,
 * burnout, time advance) and replaces only the narration + event
 * generation with a Claude call. This keeps the deterministic pipeline
 * deterministic while letting Claude do the human-quality writing.
 */
export class AnthropicGameMaster implements IGameMaster {
  constructor(
    private readonly options: AnthropicGameMasterOptions,
    private readonly inner: IGameMaster = new MockGameMaster(),
  ) {}

  async openTrimester(state: GameState): Promise<GameMasterOpening> {
    const model = this.options.model ?? DEFAULT_MODEL;
    const response = await withRetry(() =>
      anthropicClient.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: [
          { type: "text", text: GAME_MASTER_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        tools: [TOOL_APPLY_TRIMESTER_OPEN],
        tool_choice: { type: "tool", name: "apply_trimester_open" },
        messages: [
          {
            role: "user",
            content: `Ouvre le trimestre. État JSON:\n${serializeForPrompt(state)}`,
          },
        ],
      }),
    );

    await this.recordUsage(response, "game_master_open", model);

    const toolBlock = response.content.find(
      (b: { type: string }) => b.type === "tool_use",
    ) as { type: "tool_use"; name: string; input: { narration: string; event: TrimesterEvent | null } } | undefined;
    if (!toolBlock) {
      throw new Error("AnthropicGameMaster.openTrimester: no tool_use block in response");
    }
    return { narration: toolBlock.input.narration, event: toolBlock.input.event };
  }

  async closeTrimester(state: GameState, decisions: Decision[]): Promise<GameMasterClosing> {
    // Deterministic pipeline first.
    const baseClosing = await this.inner.closeTrimester(state, decisions);
    // Then ask Claude to narrate the result.
    const model = this.options.model ?? DEFAULT_MODEL;
    const response = await withRetry(() =>
      anthropicClient.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: [
          { type: "text", text: GAME_MASTER_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        tools: [TOOL_APPLY_TRIMESTER_CLOSE],
        tool_choice: { type: "tool", name: "apply_trimester_close" },
        messages: [
          {
            role: "user",
            content:
              `Clôture le trimestre. ` +
              `Décisions JSON: ${JSON.stringify(decisions)}\n` +
              `Nouvel état JSON: ${serializeForPrompt(baseClosing.newState)}`,
          },
        ],
      }),
    );

    await this.recordUsage(response, "game_master_close", model);

    const toolBlock = response.content.find(
      (b: { type: string }) => b.type === "tool_use",
    ) as { type: "tool_use"; name: string; input: { narration: string } } | undefined;
    if (!toolBlock) {
      throw new Error("AnthropicGameMaster.closeTrimester: no tool_use block in response");
    }
    return { narration: toolBlock.input.narration, newState: baseClosing.newState };
  }

  private async recordUsage(
    response: { usage: { input_tokens: number; cache_read_input_tokens?: number | null; output_tokens: number } },
    agentRole: "game_master_open" | "game_master_close",
    model: string,
  ): Promise<void> {
    await recordIaCall({
      gameId: this.options.gameId,
      trimesterIndex: this.options.trimesterIndex,
      agentRole,
      model,
      usage: {
        inputTokensTotal: response.usage.input_tokens,
        inputTokensCached: response.usage.cache_read_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    });
  }
}

import { anthropicClient, withRetry } from "./client";
import { recordIaCall } from "./cost-log";
import { serializeForPrompt } from "./state-serializer";
import { DEFAULT_MODEL, VALIDATOR_SYSTEM, TOOL_VALIDATE_ACTION } from "./prompts";
import type { IValidator, ValidatorVerdict } from "../types";
import type { Action, GameState } from "@/lib/game/types";

const DEFAULT_MAX_TOKENS = 512;

export type AnthropicValidatorOptions = {
  gameId: string | null;
  model?: string;
};

export class AnthropicValidator implements IValidator {
  constructor(private readonly options: AnthropicValidatorOptions) {}

  async validate(state: GameState, naturalLanguage: string): Promise<ValidatorVerdict> {
    const model = this.options.model ?? DEFAULT_MODEL;
    const response = await withRetry(() =>
      anthropicClient.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: [
          { type: "text", text: VALIDATOR_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        tools: [TOOL_VALIDATE_ACTION],
        tool_choice: { type: "tool", name: "validate_action" },
        messages: [
          {
            role: "user",
            content:
              `État JSON: ${serializeForPrompt(state)}\n` +
              `Action en langage naturel: "${naturalLanguage}"`,
          },
        ],
      }),
    );

    await recordIaCall({
      gameId: this.options.gameId,
      trimesterIndex: null,
      agentRole: "validator",
      model,
      usage: {
        inputTokensTotal: response.usage.input_tokens,
        inputTokensCached: response.usage.cache_read_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    });

    const toolBlock = response.content.find(
      (b: { type: string }) => b.type === "tool_use",
    ) as
      | {
          type: "tool_use";
          name: string;
          input: { accepted: boolean; action: Action | null; reason: string | null };
        }
      | undefined;
    if (!toolBlock) {
      throw new Error("AnthropicValidator: no tool_use block in response");
    }
    if (toolBlock.input.accepted) {
      if (!toolBlock.input.action) {
        throw new Error("AnthropicValidator: accepted but no action returned");
      }
      return { accepted: true, action: toolBlock.input.action };
    }
    return {
      accepted: false,
      reason: toolBlock.input.reason ?? "(no reason given)",
    };
  }
}

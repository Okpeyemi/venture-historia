import { anthropicClient, withRetry } from "./client";
import { recordIaCall } from "./cost-log";
import { serializeForPrompt } from "./state-serializer";
import { DEFAULT_MODEL, ADVISOR_SYSTEM } from "./prompts";
import type { IAdvisor } from "../types";
import type { GameState } from "@/lib/game/types";

const DEFAULT_MAX_TOKENS = 512;

export type AnthropicAdvisorOptions = {
  gameId: string | null;
  model?: string;
};

export class AnthropicAdvisor implements IAdvisor {
  constructor(private readonly options: AnthropicAdvisorOptions) {}

  async recommend(state: GameState): Promise<string> {
    const model = this.options.model ?? DEFAULT_MODEL;
    const response = await withRetry(() =>
      anthropicClient.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: [
          { type: "text", text: ADVISOR_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: `État JSON: ${serializeForPrompt(state)}\n\nRecommande une action.`,
          },
        ],
      }),
    );

    await recordIaCall({
      gameId: this.options.gameId,
      trimesterIndex: null,
      agentRole: "advisor",
      model,
      usage: {
        inputTokensTotal: response.usage.input_tokens,
        inputTokensCached: response.usage.cache_read_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    });

    const textBlock = response.content.find(
      (b: { type: string }) => b.type === "text",
    ) as { type: "text"; text: string } | undefined;
    if (!textBlock) {
      throw new Error("AnthropicAdvisor: no text block in response");
    }
    return textBlock.text;
  }
}

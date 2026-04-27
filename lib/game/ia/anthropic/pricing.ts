export type AnthropicModel =
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001"
  | "claude-opus-4-7";

export type ModelPricing = {
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok: number;
};

const PRICING: Record<AnthropicModel, ModelPricing> = {
  // USD per million tokens. Update when Anthropic revises pricing.
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15, cachedInputPerMTok: 0.3 },
  "claude-haiku-4-5-20251001": { inputPerMTok: 1, outputPerMTok: 5, cachedInputPerMTok: 0.1 },
  "claude-opus-4-7": { inputPerMTok: 15, outputPerMTok: 75, cachedInputPerMTok: 1.5 },
};

export function pricingForModel(model: string): ModelPricing {
  const p = PRICING[model as AnthropicModel];
  if (!p) throw new Error(`unknown model: ${model}`);
  return p;
}

export type Usage = {
  inputTokensTotal: number;
  inputTokensCached: number;
  outputTokens: number;
};

export function calcCostUsd(usage: Usage, model: string): number {
  const p = pricingForModel(model);
  const uncachedInput = Math.max(0, usage.inputTokensTotal - usage.inputTokensCached);
  return (
    (uncachedInput * p.inputPerMTok) / 1_000_000 +
    (usage.inputTokensCached * p.cachedInputPerMTok) / 1_000_000 +
    (usage.outputTokens * p.outputPerMTok) / 1_000_000
  );
}

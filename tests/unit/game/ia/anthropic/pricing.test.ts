import { describe, it, expect } from "vitest";
import { pricingForModel, calcCostUsd } from "@/lib/game/ia/anthropic/pricing";

describe("pricingForModel", () => {
  it("returns Sonnet 4.6 prices in $/MTok", () => {
    const p = pricingForModel("claude-sonnet-4-6");
    expect(p.inputPerMTok).toBe(3);
    expect(p.outputPerMTok).toBe(15);
    expect(p.cachedInputPerMTok).toBe(0.3);
  });

  it("returns Haiku 4.5 prices", () => {
    const p = pricingForModel("claude-haiku-4-5-20251001");
    expect(p.inputPerMTok).toBe(1);
    expect(p.outputPerMTok).toBe(5);
  });

  it("returns Opus 4.7 prices", () => {
    const p = pricingForModel("claude-opus-4-7");
    expect(p.inputPerMTok).toBe(15);
    expect(p.outputPerMTok).toBe(75);
  });

  it("throws on unknown model", () => {
    expect(() => pricingForModel("claude-unknown")).toThrow(/unknown model/i);
  });
});

describe("calcCostUsd", () => {
  it("computes (input - cached) * inputRate + cached * cachedRate + output * outputRate", () => {
    // Sonnet: 1000 input total, 200 cached, 500 output
    // = (1000 - 200) * 3/1e6 + 200 * 0.3/1e6 + 500 * 15/1e6
    // = 0.0024 + 0.00006 + 0.0075
    // = 0.00996
    const cost = calcCostUsd(
      { inputTokensTotal: 1000, inputTokensCached: 200, outputTokens: 500 },
      "claude-sonnet-4-6",
    );
    expect(cost).toBeCloseTo(0.00996, 6);
  });

  it("returns 0 for zero usage", () => {
    expect(
      calcCostUsd(
        { inputTokensTotal: 0, inputTokensCached: 0, outputTokens: 0 },
        "claude-sonnet-4-6",
      ),
    ).toBe(0);
  });
});

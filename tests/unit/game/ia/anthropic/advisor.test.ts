import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialState } from "@/lib/game/state";

vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
vi.stubEnv("AUTH_SECRET", "x".repeat(32));
vi.stubEnv("AUTH_GOOGLE_ID", "id");
vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

const recordIaCallMock = vi.fn();
vi.mock("@/lib/game/ia/anthropic/cost-log", () => ({
  recordIaCall: recordIaCallMock,
}));

const baseState = () =>
  createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 100_000,
    startingTeamSize: 2,
  });

beforeEach(() => {
  createMock.mockReset();
  recordIaCallMock.mockReset();
});

describe("AnthropicAdvisor.recommend", () => {
  it("returns the model's text recommendation and records cost", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "Lève une seed maintenant pour étendre ta piste de trésorerie." }],
      usage: { input_tokens: 900, cache_read_input_tokens: 0, output_tokens: 80 },
    });
    const { AnthropicAdvisor } = await import("@/lib/game/ia/anthropic/advisor");
    const a = new AnthropicAdvisor({ gameId: "g1" });
    const recommendation = await a.recommend(baseState());
    expect(recommendation).toContain("seed");
    expect(recordIaCallMock).toHaveBeenCalledOnce();
    expect(recordIaCallMock.mock.calls[0]?.[0].agentRole).toBe("advisor");
  });
});

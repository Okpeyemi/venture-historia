import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialState } from "@/lib/game/state";

// Stub env BEFORE the SDK + cost-log mocks (env validates at module load).
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

describe("AnthropicValidator.validate", () => {
  it("returns accepted=true with the parsed Action when the model accepts", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "validate_action",
          input: {
            accepted: true,
            action: { kind: "team.hire", level: "senior", salaryAnnual: 120_000 },
            reason: null,
          },
        },
      ],
      usage: { input_tokens: 800, cache_read_input_tokens: 0, output_tokens: 50 },
    });
    const { AnthropicValidator } = await import("@/lib/game/ia/anthropic/validator");
    const v = new AnthropicValidator({ gameId: "g1" });
    const verdict = await v.validate(baseState(), "j'embauche un senior à 120k");
    expect(verdict.accepted).toBe(true);
    if (verdict.accepted) {
      expect(verdict.action.kind).toBe("team.hire");
    }
    expect(recordIaCallMock).toHaveBeenCalledOnce();
    expect(recordIaCallMock.mock.calls[0]?.[0].agentRole).toBe("validator");
  });

  it("returns accepted=false with reason when the model rejects", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "validate_action",
          input: {
            accepted: false,
            action: null,
            reason: "Cash insuffisant pour cette dépense.",
          },
        },
      ],
      usage: { input_tokens: 700, cache_read_input_tokens: 0, output_tokens: 40 },
    });
    const { AnthropicValidator } = await import("@/lib/game/ia/anthropic/validator");
    const v = new AnthropicValidator({ gameId: "g1" });
    const verdict = await v.validate(baseState(), "j'achète un yacht à 10M$");
    expect(verdict.accepted).toBe(false);
    if (!verdict.accepted) {
      expect(verdict.reason).toContain("Cash insuffisant");
    }
  });
});

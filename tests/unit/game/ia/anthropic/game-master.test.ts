import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialState } from "@/lib/game/state";
import { MockGameMaster } from "@/lib/game/ia/mock";
import type { GameState } from "@/lib/game/types";

// Stub env vars before any import resolves @/lib/env (which client.ts imports).
vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
vi.stubEnv("AUTH_SECRET", "x".repeat(32));
vi.stubEnv("AUTH_GOOGLE_ID", "id");
vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");

// Mock the SDK before importing anything that uses it.
const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
    },
  };
});

// Mock the cost-log so it doesn't try to write to the DB in unit tests.
const recordIaCallMock = vi.fn();
vi.mock("@/lib/game/ia/anthropic/cost-log", () => ({
  recordIaCall: recordIaCallMock,
}));

const baseState = (): GameState =>
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

describe("AnthropicGameMaster.openTrimester", () => {
  it("returns narration from the apply_trimester_open tool call and records cost", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_open",
          input: {
            narration: "Q1 2005 démarre, marché tech porteur.",
            event: null,
          },
        },
      ],
      usage: { input_tokens: 1200, cache_read_input_tokens: 0, output_tokens: 120 },
    });
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const gm = new AnthropicGameMaster({ gameId: "g1", trimesterIndex: 1 });
    const result = await gm.openTrimester(baseState());
    expect(result.narration).toContain("Q1 2005");
    expect(result.event).toBeNull();
    expect(recordIaCallMock).toHaveBeenCalledOnce();
    expect(recordIaCallMock.mock.calls[0]?.[0].agentRole).toBe("game_master_open");
  });

  it("surfaces the event when the model returns one", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_open",
          input: {
            narration: "Un investisseur t'a contacté.",
            event: {
              id: "evt-1",
              situation: "Sequoia veut mener ta Série A.",
              choices: [
                { id: "accept", label: "Accepter" },
                { id: "negotiate", label: "Négocier" },
                { id: "decline", label: "Refuser" },
              ],
            },
          },
        },
      ],
      usage: { input_tokens: 1300, cache_read_input_tokens: 800, output_tokens: 200 },
    });
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const gm = new AnthropicGameMaster({ gameId: "g2", trimesterIndex: 3 });
    const result = await gm.openTrimester(baseState());
    expect(result.event?.choices).toHaveLength(3);
    expect(result.event?.id).toBe("evt-1");
  });
});

describe("AnthropicGameMaster.closeTrimester", () => {
  it("delegates state evolution to the inner mock + replaces narration with Claude output", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_close",
          input: { narration: "Trimestre solide. Ton équipe a livré." },
        },
      ],
      usage: { input_tokens: 1500, cache_read_input_tokens: 1200, output_tokens: 180 },
    });
    const inner = new MockGameMaster();
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const gm = new AnthropicGameMaster({ gameId: "g3", trimesterIndex: 1 }, inner);
    const decisions = [
      {
        kind: "action" as const,
        action: { kind: "finance.allocateBudget" as const, category: "marketing" as const, amount: 10_000 },
      },
    ];
    const result = await gm.closeTrimester(baseState(), decisions);
    // State delta from inner mock (cash debited)
    expect(result.newState.playerState.cash).toBe(90_000);
    // Narration from Claude
    expect(result.narration).toContain("Trimestre solide");
    // Cost recorded
    expect(recordIaCallMock).toHaveBeenCalledOnce();
    expect(recordIaCallMock.mock.calls[0]?.[0].agentRole).toBe("game_master_close");
  });
});

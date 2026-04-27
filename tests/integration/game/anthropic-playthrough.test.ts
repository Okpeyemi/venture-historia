import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { iaCallLog } from "@/lib/db/schema";
import { createInitialState } from "@/lib/game/state";
import { advanceTrimester } from "@/lib/game/engine";
import { ScriptedGameMaster } from "@/lib/game/scenarios/scripted-game-master";
import { getPreset } from "@/lib/game/scenarios/registry";
import { createGameFromPreset } from "@/lib/game/scenarios/persistence";
import { saveTrimester } from "@/lib/game/persistence";
import { createTestUser } from "../setup";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

describe("Anthropic GM playthrough with cost log", () => {
  let cleanups: Array<() => Promise<void>> = [];

  beforeEach(() => {
    createMock.mockReset();
  });

  afterEach(async () => {
    for (const c of cleanups.splice(0)) {
      await c();
    }
  });

  it("plays 3 trimesters with AnthropicGameMaster (stubbed) and writes 6 cost log rows", async () => {
    const user = await createTestUser("anthropic-pt");
    cleanups.push(user.cleanup);

    const game = await createGameFromPreset({
      userId: user.id,
      presetId: "sf_2005_saas_solo",
    });

    // Each trimester triggers 2 calls (open + close), so 3 trimesters = 6 calls.
    // Stub each call: open returns no event, close returns canned narration.
    const openResp = {
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_open",
          input: { narration: "[claude] opening", event: null },
        },
      ],
      usage: { input_tokens: 1500, cache_read_input_tokens: 1000, output_tokens: 100 },
    };
    const closeResp = {
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_close",
          input: { narration: "[claude] closing" },
        },
      ],
      usage: { input_tokens: 1700, cache_read_input_tokens: 1500, output_tokens: 150 },
    };
    // Sequence: open, close, open, close, open, close.
    createMock
      .mockResolvedValueOnce(openResp)
      .mockResolvedValueOnce(closeResp)
      .mockResolvedValueOnce(openResp)
      .mockResolvedValueOnce(closeResp)
      .mockResolvedValueOnce(openResp)
      .mockResolvedValueOnce(closeResp);

    // Build the game master after mocks are in place.
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const preset = getPreset("sf_2005_saas_solo")!;

    let state = createInitialState({
      scenario: {
        presetId: preset.id,
        era: preset.era,
        region: preset.region,
        sector: preset.sector,
        startingYear: preset.startingYear,
        currentQuarter: preset.startingQuarter,
        currentYear: preset.startingYear,
      },
      companyName: preset.companyName,
      startingCash: preset.startingCash,
      startingTeamSize: preset.startingTeamSize,
    });

    for (let i = 1; i <= 3; i++) {
      const inner = new AnthropicGameMaster({ gameId: game.id, trimesterIndex: i });
      const gm = new ScriptedGameMaster(preset, inner);
      const result = await advanceTrimester({ state, decisions: [], gm });
      await saveTrimester({
        gameId: game.id,
        trimesterIndex: i,
        state: result.newState,
        narrationOpening: result.opening.narration,
        narrationClosing: result.closing.narration,
        event: result.opening.event,
        decisions: [],
      });
      state = result.newState;
    }

    // Cost log should have exactly 6 rows for this game.
    const rows = await db.select().from(iaCallLog).where(eq(iaCallLog.gameId, game.id));
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.agentRole === "game_master_open")).toHaveLength(3);
    expect(rows.filter((r) => r.agentRole === "game_master_close")).toHaveLength(3);
    // Spot-check pricing: Sonnet 4.6 default. Cost should be > 0 and < 1c per call.
    for (const row of rows) {
      const cost = Number(row.costUsd);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01);
    }
  });
});

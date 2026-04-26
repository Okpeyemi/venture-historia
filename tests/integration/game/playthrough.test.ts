import { describe, it, expect, afterEach } from "vitest";
import { createInitialState } from "@/lib/game/state";
import { advanceTrimester } from "@/lib/game/engine";
import { MockGameMaster } from "@/lib/game/ia/mock";
import {
  createGame,
  loadGame,
  loadTrimester,
  saveTrimester,
  endGame,
} from "@/lib/game/persistence";
import { detectAutoEnding } from "@/lib/game/endings";
import { createTestUser } from "../setup";
import type { Decision } from "@/lib/game/types";

describe("game playthrough", () => {
  let cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const c of cleanups.splice(0)) {
      await c();
    }
  });

  it("plays 5 trimesters end-to-end, persists each, and finalises with no auto-ending", async () => {
    const user = await createTestUser("playthrough-happy");
    cleanups.push(user.cleanup);

    const initialState = createInitialState({
      scenario: {
        presetId: "it_happy",
        era: 2005,
        region: "Test",
        sector: "Test",
        startingYear: 2005,
        currentQuarter: "Q1",
        currentYear: 2005,
      },
      companyName: "PlaythroughCo",
      startingCash: 1_000_000,
      startingTeamSize: 3,
    });

    const game = await createGame({
      userId: user.id,
      scenarioPresetId: "it_happy",
      initialState,
    });
    expect(game.id).toBeTruthy();
    expect(game.currentTrimesterIndex).toBe(0);

    const gm = new MockGameMaster();
    let state = initialState;

    for (let i = 1; i <= 5; i++) {
      const decisions: Decision[] = [
        { kind: "action", action: { kind: "finance.allocateBudget", category: "marketing", amount: 10_000 } },
      ];
      const result = await advanceTrimester({ state, decisions, gm });
      await saveTrimester({
        gameId: game.id,
        trimesterIndex: i,
        state: result.newState,
        narrationOpening: result.opening.narration,
        narrationClosing: result.closing.narration,
        event: result.opening.event,
        decisions,
      });
      state = result.newState;
    }

    // Verify persistence
    const persisted = await loadGame(game.id);
    expect(persisted?.currentTrimesterIndex).toBe(5);

    const t5 = await loadTrimester(game.id, 5);
    expect(t5).not.toBeNull();
    expect(t5?.state.history.trimestersPlayed).toBe(5);
    expect(t5?.decisions).toHaveLength(1);
    expect(t5?.narrationOpening).toContain("[mock]");
    expect(t5?.narrationClosing).toContain("[mock]");

    // Cash should have decreased by 5 × 10_000 = 50_000
    expect(t5?.state.playerState.cash).toBe(1_000_000 - 50_000);

    // No auto-ending yet
    expect(detectAutoEnding(state)).toBeNull();
  });

  it("detects bankruptcy and stores the ending when cash hits 0", async () => {
    const user = await createTestUser("playthrough-bankruptcy");
    cleanups.push(user.cleanup);

    const initialState = createInitialState({
      scenario: {
        presetId: "it_broke",
        era: 2005,
        region: "Test",
        sector: "Test",
        startingYear: 2005,
        currentQuarter: "Q1",
        currentYear: 2005,
      },
      companyName: "BrokeCo",
      startingCash: 30_000,
      startingTeamSize: 1,
    });

    const game = await createGame({
      userId: user.id,
      scenarioPresetId: "it_broke",
      initialState,
    });

    const gm = new MockGameMaster();
    // Spend all cash in one trimester
    const decisions: Decision[] = [
      { kind: "action", action: { kind: "finance.allocateBudget", category: "marketing", amount: 30_000 } },
    ];
    const result = await advanceTrimester({ state: initialState, decisions, gm });
    await saveTrimester({
      gameId: game.id,
      trimesterIndex: 1,
      state: result.newState,
      narrationOpening: result.opening.narration,
      narrationClosing: result.closing.narration,
      event: result.opening.event,
      decisions,
    });

    expect(result.newState.playerState.cash).toBe(0);
    const ending = detectAutoEnding(result.newState);
    expect(ending?.kind).toBe("bankruptcy");

    if (ending) await endGame({ gameId: game.id, ending });
    const persisted = await loadGame(game.id);
    expect(persisted?.status).toBe("ended_fail");
    expect(persisted?.endingType).toBe("bankruptcy");
    expect(persisted?.endingSummary).toMatch(/BrokeCo/);
  });
});

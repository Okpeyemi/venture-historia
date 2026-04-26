import { describe, it, expect, afterEach } from "vitest";
import { advanceTrimester } from "@/lib/game/engine";
import { ScriptedGameMaster } from "@/lib/game/scenarios/scripted-game-master";
import { getPreset } from "@/lib/game/scenarios/registry";
import { createGameFromPreset } from "@/lib/game/scenarios/persistence";
import { loadGame, loadTrimester, saveTrimester } from "@/lib/game/persistence";
import { createTestUser } from "../setup";
import type { Decision, GameState } from "@/lib/game/types";

describe("SF 2005 SaaS preset playthrough", () => {
  let cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const c of cleanups.splice(0)) {
      await c();
    }
  });

  it("plays 12 trimesters end-to-end, fires the SOX macro event in Q1 2006, and accumulates firedMilestones", async () => {
    const user = await createTestUser("sf2005");
    cleanups.push(user.cleanup);

    const game = await createGameFromPreset({
      userId: user.id,
      presetId: "sf_2005_saas_solo",
    });
    expect(game.scenarioPresetId).toBe("sf_2005_saas_solo");

    // Reload the seeded state to start the playthrough.
    const t0 = await loadTrimester(game.id, 0);
    expect(t0).not.toBeNull();
    let state: GameState = t0!.state;
    expect(state.worldState.competitors).toHaveLength(3);
    expect(state.scenario.currentYear).toBe(2005);
    expect(state.scenario.currentQuarter).toBe("Q1");

    const preset = getPreset("sf_2005_saas_solo")!;
    const gm = new ScriptedGameMaster(preset);

    // Force player MRR upward over time so the VertexCRM reaction milestone
    // (playerMrrAtLeast: 50_000) eventually fires.
    for (let i = 1; i <= 12; i++) {
      const decisions: Decision[] = [];
      // Cheat MRR up by $10k per trimester so we cross the 50k threshold by Q3 2006.
      state = { ...state, playerState: { ...state.playerState, mrr: state.playerState.mrr + 10_000 } };

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

    // Verify final state
    const persisted = await loadGame(game.id);
    expect(persisted?.currentTrimesterIndex).toBe(12);

    const final = await loadTrimester(game.id, 12);
    expect(final).not.toBeNull();

    // SOX event fires at Q1 2006 — should be in firedMilestones by now.
    expect(final!.state.worldState.firedMilestones).toContain("sox_compliance_pressure");
    expect(final!.state.worldState.macroEventsActive).toContain("sox_pressure");

    // VertexCRM milestone should have fired once MRR crossed 50k.
    expect(final!.state.worldState.firedMilestones).toContain("vertexcrm_reacts_to_player_traction");

    // Time advance check: 12 trimesters from Q1 2005 = Q1 2008.
    expect(final!.state.scenario.currentYear).toBe(2008);
    expect(final!.state.scenario.currentQuarter).toBe("Q1");
  });
});

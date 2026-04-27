"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPreset } from "@/lib/game/scenarios/registry";
import { createGameFromPreset } from "@/lib/game/scenarios/persistence";
import {
  loadGame,
  loadTrimester,
  saveTrimester,
  appendDecisionToTrimester,
  closeTrimesterRow,
  setPendingOpening,
  clearPendingOpening,
  endGame,
} from "@/lib/game/persistence";
import { buildGameMaster } from "@/lib/game/ia/build-game-master";
import { detectAutoEnding, applyPlayerEnding } from "@/lib/game/endings";
import { processAction } from "@/lib/game/actions";
import type { Action, Decision, GameState } from "@/lib/game/types";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  return session.user.id;
}

export async function createGameAction(presetId: string): Promise<void> {
  const userId = await requireUserId();
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`unknown preset: ${presetId}`);

  // Create the game (writes T0 with seed state).
  const game = await createGameFromPreset({ userId, presetId });

  // Open trimester 1 immediately so the player has something to look at.
  const t0 = await loadTrimester(game.id, 0);
  if (!t0) throw new Error("createGameAction: T0 missing after createGameFromPreset");
  const gm = buildGameMaster({ preset, gameId: game.id, trimesterIndex: 1 });
  const opening = await gm.openTrimester(t0.state);

  // Insert T1 row with starting state = T0's state.
  await saveTrimester({
    gameId: game.id,
    trimesterIndex: 1,
    state: t0.state,
    narrationOpening: opening.narration,
    narrationClosing: null,
    event: opening.event,
    decisions: [],
  });
  await setPendingOpening({
    gameId: game.id,
    narrationOpening: opening.narration,
    event: opening.event,
  });

  redirect(`/games/${game.id}`);
}

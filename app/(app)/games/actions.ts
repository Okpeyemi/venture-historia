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

export async function addDecisionAction(args: {
  gameId: string;
  action: Action;
}): Promise<void> {
  await requireUserId();
  const game = await loadGame(args.gameId);
  if (!game || game.status !== "in_progress") {
    throw new Error("addDecisionAction: game not in_progress");
  }
  const decision: Decision = { kind: "action", action: args.action };
  await appendDecisionToTrimester({
    gameId: args.gameId,
    trimesterIndex: game.currentTrimesterIndex,
    decision,
  });
}

export async function chooseEventChoiceAction(args: {
  gameId: string;
  eventId: string;
  choiceId: string;
}): Promise<void> {
  await requireUserId();
  const game = await loadGame(args.gameId);
  if (!game || game.status !== "in_progress") {
    throw new Error("chooseEventChoiceAction: game not in_progress");
  }
  const decision: Decision = {
    kind: "eventChoice",
    eventId: args.eventId,
    choiceId: args.choiceId,
  };
  await appendDecisionToTrimester({
    gameId: args.gameId,
    trimesterIndex: game.currentTrimesterIndex,
    decision,
  });
  // Clear the event from pendingOpening so the modal stops showing.
  if (game.pendingOpening) {
    await setPendingOpening({
      gameId: args.gameId,
      narrationOpening: game.pendingOpening.narrationOpening,
      event: null,
    });
  }
}

export async function advanceTrimesterAction(gameId: string): Promise<void> {
  await requireUserId();
  const game = await loadGame(gameId);
  if (!game || game.status !== "in_progress") {
    throw new Error("advanceTrimesterAction: game not in_progress");
  }
  const preset = getPreset(game.scenarioPresetId);
  if (!preset) throw new Error(`unknown preset on game: ${game.scenarioPresetId}`);

  const currentRow = await loadTrimester(gameId, game.currentTrimesterIndex);
  if (!currentRow) throw new Error("advanceTrimesterAction: current trimester row missing");

  // 1. Apply each structured-action decision deterministically. Pure
  //    processors mutate the state predictably — the GM only narrates.
  let postActionState: GameState = currentRow.state;
  for (const d of currentRow.decisions) {
    if (d.kind !== "action") continue;
    try {
      postActionState = processAction(postActionState, d.action);
    } catch {
      // Invalid action — skip; the IA cost was paid but the state stays
      // safe. Plan #5b's NL escape will surface validator rejects to the
      // UI; for now we just no-op invalid structured actions.
    }
  }

  // 2. Run the GM close on the post-action state (GM produces narration
  //    only; state is already advanced by the processors above).
  const gm = buildGameMaster({
    preset,
    gameId,
    trimesterIndex: game.currentTrimesterIndex,
  });
  const closing = await gm.closeTrimester(postActionState, currentRow.decisions);

  // 3. Persist the close — narration + post-close state on the current row.
  await closeTrimesterRow({
    gameId,
    trimesterIndex: game.currentTrimesterIndex,
    narrationClosing: closing.narration,
    postCloseState: closing.newState,
  });

  // 4. Detect auto-endings BEFORE opening the next trimester. If the game
  //    just ended, persist the ending and stop.
  const ending = detectAutoEnding(closing.newState);
  if (ending) {
    await endGame({ gameId, ending });
    await clearPendingOpening(gameId);
    redirect(`/games/${gameId}/end`);
  }

  // 5. Open the next trimester.
  const nextIndex = game.currentTrimesterIndex + 1;
  const nextGm = buildGameMaster({ preset, gameId, trimesterIndex: nextIndex });
  const opening = await nextGm.openTrimester(closing.newState);
  await saveTrimester({
    gameId,
    trimesterIndex: nextIndex,
    state: closing.newState,
    narrationOpening: opening.narration,
    narrationClosing: null,
    event: opening.event,
    decisions: [],
  });
  await setPendingOpening({
    gameId,
    narrationOpening: opening.narration,
    event: opening.event,
  });

  redirect(`/games/${gameId}`);
}

export async function declarePlayerEndingAction(args: {
  gameId: string;
  action: Action;
}): Promise<void> {
  await requireUserId();
  const game = await loadGame(args.gameId);
  if (!game || game.status !== "in_progress") {
    throw new Error("declarePlayerEndingAction: game not in_progress");
  }
  const currentRow = await loadTrimester(args.gameId, game.currentTrimesterIndex);
  if (!currentRow) throw new Error("declarePlayerEndingAction: current trimester missing");
  const ending = applyPlayerEnding(currentRow.state, args.action);
  await endGame({ gameId: args.gameId, ending });
  await clearPendingOpening(args.gameId);
  redirect(`/games/${args.gameId}/end`);
}

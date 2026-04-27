import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, trimesters } from "@/lib/db/schema";
import type { Decision, GameState, TrimesterEvent, Ending, EndingKind } from "./types";

export type GameRow = typeof games.$inferSelect;
export type TrimesterRow = typeof trimesters.$inferSelect;

export async function createGame(args: {
  userId: string;
  scenarioPresetId: string;
  initialState: GameState;
}): Promise<GameRow> {
  const [game] = await db
    .insert(games)
    .values({
      userId: args.userId,
      scenarioPresetId: args.scenarioPresetId,
    })
    .returning();
  if (!game) throw new Error("createGame: insert returned no row");

  await db.insert(trimesters).values({
    gameId: game.id,
    trimesterIndex: 0,
    state: args.initialState,
  });

  return game;
}

export async function loadGame(gameId: string): Promise<GameRow | null> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return game ?? null;
}

export async function loadTrimester(
  gameId: string,
  trimesterIndex: number,
): Promise<TrimesterRow | null> {
  const [t] = await db
    .select()
    .from(trimesters)
    .where(and(eq(trimesters.gameId, gameId), eq(trimesters.trimesterIndex, trimesterIndex)))
    .limit(1);
  return t ?? null;
}

export async function saveTrimester(args: {
  gameId: string;
  trimesterIndex: number;
  state: GameState;
  narrationOpening: string | null;
  narrationClosing: string | null;
  event: TrimesterEvent | null;
  decisions: Decision[];
}): Promise<void> {
  // Refuse to write a new trimester if the game has already ended.
  // Returns the rows the games update touched; if zero, the game was
  // already ended (or doesn't exist) and the caller should treat the
  // saveTrimester as a no-op race / stale request.
  const updated = await db
    .update(games)
    .set({ currentTrimesterIndex: args.trimesterIndex, updatedAt: new Date() })
    .where(and(eq(games.id, args.gameId), eq(games.status, "in_progress")))
    .returning({ id: games.id });
  if (updated.length === 0) {
    throw new Error(
      `saveTrimester: game ${args.gameId} is not in_progress (already ended or missing)`,
    );
  }
  await db.insert(trimesters).values({
    gameId: args.gameId,
    trimesterIndex: args.trimesterIndex,
    state: args.state,
    narrationOpening: args.narrationOpening,
    narrationClosing: args.narrationClosing,
    event: args.event,
    decisions: args.decisions,
  });
}

export async function endGame(args: {
  gameId: string;
  ending: Ending;
}): Promise<boolean> {
  const successKinds: EndingKind[] = ["ipo", "acquisition", "lifestyle", "conglomerate"];
  const status = successKinds.includes(args.ending.kind) ? "ended_success" : "ended_fail";
  // Idempotency guard: only end games that are still in_progress. Returns
  // true if this call ended the game, false if it was already ended.
  const updated = await db
    .update(games)
    .set({
      status,
      endingType: args.ending.kind,
      endingSummary: args.ending.summary,
      updatedAt: new Date(),
    })
    .where(and(eq(games.id, args.gameId), eq(games.status, "in_progress")))
    .returning({ id: games.id });
  return updated.length > 0;
}

/**
 * Append a single Decision to the trimester row's `decisions` jsonb array
 * without overwriting it. Uses Postgres jsonb concatenation. Throws if the
 * game is not in_progress (defends against race conditions where the UI
 * sends a decision after the player ended the game in another tab).
 */
export async function appendDecisionToTrimester(args: {
  gameId: string;
  trimesterIndex: number;
  decision: Decision;
}): Promise<void> {
  // Verify the game is in_progress.
  const [game] = await db
    .select({ status: games.status })
    .from(games)
    .where(eq(games.id, args.gameId))
    .limit(1);
  if (!game || game.status !== "in_progress") {
    throw new Error(
      `appendDecisionToTrimester: game ${args.gameId} is not in_progress`,
    );
  }
  await db
    .update(trimesters)
    .set({
      decisions: sql`${trimesters.decisions} || ${JSON.stringify([args.decision])}::jsonb`,
    })
    .where(
      and(
        eq(trimesters.gameId, args.gameId),
        eq(trimesters.trimesterIndex, args.trimesterIndex),
      ),
    );
}

/**
 * Close a trimester: write the closing narration and the post-close state.
 * The post-close state is also what becomes the starting state of the next
 * trimester (the caller is responsible for inserting the next trimester
 * row with that state).
 */
export async function closeTrimesterRow(args: {
  gameId: string;
  trimesterIndex: number;
  narrationClosing: string;
  postCloseState: GameState;
}): Promise<void> {
  await db
    .update(trimesters)
    .set({
      narrationClosing: args.narrationClosing,
      state: args.postCloseState,
    })
    .where(
      and(
        eq(trimesters.gameId, args.gameId),
        eq(trimesters.trimesterIndex, args.trimesterIndex),
      ),
    );
}

/**
 * Set the game's pending opening (narration + optional event) — what the
 * player sees as the current trimester's intro. Cleared on advance.
 */
export async function setPendingOpening(args: {
  gameId: string;
  narrationOpening: string;
  event: TrimesterEvent | null;
}): Promise<void> {
  await db
    .update(games)
    .set({
      pendingOpening: { narrationOpening: args.narrationOpening, event: args.event },
      updatedAt: new Date(),
    })
    .where(eq(games.id, args.gameId));
}

export async function clearPendingOpening(gameId: string): Promise<void> {
  await db
    .update(games)
    .set({ pendingOpening: null, updatedAt: new Date() })
    .where(eq(games.id, gameId));
}

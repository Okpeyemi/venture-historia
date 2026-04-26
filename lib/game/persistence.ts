import { eq, and } from "drizzle-orm";
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

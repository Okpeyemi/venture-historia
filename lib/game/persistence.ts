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
  await db.insert(trimesters).values({
    gameId: args.gameId,
    trimesterIndex: args.trimesterIndex,
    state: args.state,
    narrationOpening: args.narrationOpening,
    narrationClosing: args.narrationClosing,
    event: args.event,
    decisions: args.decisions,
  });
  await db
    .update(games)
    .set({ currentTrimesterIndex: args.trimesterIndex, updatedAt: new Date() })
    .where(eq(games.id, args.gameId));
}

export async function endGame(args: {
  gameId: string;
  ending: Ending;
}): Promise<void> {
  const successKinds: EndingKind[] = ["ipo", "acquisition", "lifestyle", "conglomerate"];
  const status = successKinds.includes(args.ending.kind) ? "ended_success" : "ended_fail";
  await db
    .update(games)
    .set({
      status,
      endingType: args.ending.kind,
      endingSummary: args.ending.summary,
      updatedAt: new Date(),
    })
    .where(eq(games.id, args.gameId));
}

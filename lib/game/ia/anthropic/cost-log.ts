import { db } from "@/lib/db/client";
import { iaCallLog } from "@/lib/db/schema";
import { calcCostUsd, type Usage } from "./pricing";

export type AgentRole = "game_master_open" | "game_master_close" | "validator" | "advisor";

export async function recordIaCall(args: {
  gameId: string | null;
  trimesterIndex: number | null;
  agentRole: AgentRole;
  model: string;
  usage: Usage;
}): Promise<void> {
  const costUsd = calcCostUsd(args.usage, args.model);
  await db.insert(iaCallLog).values({
    gameId: args.gameId,
    trimesterIndex: args.trimesterIndex,
    agentRole: args.agentRole,
    model: args.model,
    inputTokensTotal: args.usage.inputTokensTotal,
    inputTokensCached: args.usage.inputTokensCached,
    outputTokens: args.usage.outputTokens,
    costUsd: costUsd.toFixed(6), // 6-decimal precision, store as string
  });
}

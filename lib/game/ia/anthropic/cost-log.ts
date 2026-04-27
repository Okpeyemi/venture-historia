import { db } from "@/lib/db/client";
import { iaCallLog } from "@/lib/db/schema";
import { calcCostUsd, type Usage } from "./pricing";

export type AgentRole = "game_master_open" | "game_master_close" | "validator" | "advisor";

/**
 * Record one IA call to the iaCallLog table. Failures here do NOT throw —
 * the Claude call already succeeded and the user has effectively been
 * billed (cost incurred). Throwing would cascade into a "trimester failed"
 * UX that wastes the player's session AND loses the cost record. Instead,
 * we log the failure to stderr so it's at least observable; Plan #7's
 * billing reconciliation can backfill from these structured stderr lines
 * if needed.
 *
 * Known limitation: cache_creation_input_tokens (the higher-rate cache
 * write tokens) are currently bundled into inputTokensTotal at the
 * standard input rate. Plan #7 will add a separate column + pricing line
 * to capture the ~25% premium accurately.
 */
export async function recordIaCall(args: {
  gameId: string | null;
  trimesterIndex: number | null;
  agentRole: AgentRole;
  model: string;
  usage: Usage;
}): Promise<void> {
  try {
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
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ia-cost-log] dropped record:", {
      gameId: args.gameId,
      trimesterIndex: args.trimesterIndex,
      agentRole: args.agentRole,
      model: args.model,
      usage: args.usage,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

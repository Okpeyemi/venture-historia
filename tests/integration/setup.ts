import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

/**
 * Create a throwaway user so each integration test has its own scope.
 * Cascade deletes wipe games + trimesters when the user is removed.
 */
export async function createTestUser(suffix: string): Promise<{ id: string; cleanup: () => Promise<void> }> {
  const email = `it-${suffix}-${Date.now()}@test.local`;
  const [row] = await db
    .insert(users)
    .values({ email, name: `Integration ${suffix}` })
    .returning({ id: users.id });
  if (!row) throw new Error("createTestUser: insert returned no row");
  return {
    id: row.id,
    cleanup: async () => {
      await db.delete(users).where(eq(users.id, row.id));
    },
  };
}

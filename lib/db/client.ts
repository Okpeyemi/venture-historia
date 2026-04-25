import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Cache the postgres client AND the Drizzle wrapper across HMR reloads so
// we don't leak connections every time Next.js Turbopack re-evaluates this
// module, AND so consumers that stash `db` in a closure keep a stable
// reference instead of a stale one after a hot reload.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

const client =
  globalForDb.client ?? postgres(env.DATABASE_URL, { max: 10 });

export const db = globalForDb.db ?? drizzle(client, { schema });

if (env.NODE_ENV !== "production") {
  globalForDb.client = client;
  globalForDb.db = db;
}

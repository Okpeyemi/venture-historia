import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Cache the postgres client across HMR reloads in dev so we don't leak
// connections every time Next.js Turbopack re-evaluates this module.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.client ?? postgres(env.DATABASE_URL, { max: 10 });

if (env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });

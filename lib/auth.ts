import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";

const nextAuth = NextAuth({
  adapter: DrizzleAdapter(db),
  // Database sessions (vs JWT) for server-side revocation, refresh-token
  // pairing with the `account` table, and long-lived player accounts.
  // Each auth() call is a DB roundtrip — see the React.cache() wrapper
  // below which dedupes calls within a single request render tree.
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  // trustHost is required in dev to compute callback URLs from request
  // headers without an explicit AUTH_URL. In production AUTH_URL must be
  // set explicitly to prevent host-header injection on the OAuth callback.
  trustHost: env.NODE_ENV !== "production",
});

export const { handlers, signIn, signOut } = nextAuth;

// ─── Dev auth bypass ─────────────────────────────────────────
// Activated by AUTH_DEV_BYPASS=true in non-production envs only (env.ts
// rejects the combo at boot). When active, auth() returns a synthetic
// session backed by a persistent user row so games table FKs work.
// Use case: local testing when real OAuth is unavailable (network issue,
// missing creds). The (app) layout shows a visible warning banner.

export const DEV_BYPASS_USER_ID = "dev-bypass-user";
export const DEV_BYPASS_USER_EMAIL = "dev-bypass@local.test";
export const DEV_BYPASS_USER_NAME = "Dev Bypass User";

let devUserEnsured = false;

async function ensureDevBypassUser(): Promise<void> {
  if (devUserEnsured) return;
  await db
    .insert(users)
    .values({
      id: DEV_BYPASS_USER_ID,
      email: DEV_BYPASS_USER_EMAIL,
      name: DEV_BYPASS_USER_NAME,
    })
    .onConflictDoNothing({ target: users.id });
  devUserEnsured = true;
}

if (env.AUTH_DEV_BYPASS && env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[AUTH_DEV_BYPASS] Auth is bypassed. All requests run as the dev-bypass user.",
  );
}

// Wrap auth() in React.cache so layout + page in the same render tree
// share one session lookup instead of round-tripping the DB twice.
export const auth = cache(async (): Promise<Session | null> => {
  if (env.AUTH_DEV_BYPASS && env.NODE_ENV !== "production") {
    await ensureDevBypassUser();
    return {
      user: {
        id: DEV_BYPASS_USER_ID,
        name: DEV_BYPASS_USER_NAME,
        email: DEV_BYPASS_USER_EMAIL,
        image: null,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as Session;
  }
  return nextAuth.auth();
});

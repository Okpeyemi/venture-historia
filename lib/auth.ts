import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { cache } from "react";
import { db } from "@/lib/db/client";
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

// Wrap auth() in React.cache so layout + page in the same render tree
// share one session lookup instead of round-tripping the DB twice.
export const auth = cache(nextAuth.auth);

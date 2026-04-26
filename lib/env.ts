import { z } from "zod";

const schema = z
  .object({
    DATABASE_URL: z.string().url().min(1),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    // Default to "production" so that if NODE_ENV is ever unset the app
    // fails safe — lib/auth.ts gates trustHost on this, and defaulting to
    // "development" would silently enable trustHost in an unconfigured
    // deploy, opening a host-header injection risk.
    NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
    // Dev-only auth bypass. When "true" AND NODE_ENV !== "production", the
    // auth() helper short-circuits and returns a synthetic session backed
    // by a persistent dev-bypass user row. Refused at boot in production.
    // See lib/auth.ts and the README troubleshooting section.
    AUTH_DEV_BYPASS: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .refine((data) => !(data.AUTH_DEV_BYPASS && data.NODE_ENV === "production"), {
    message:
      "AUTH_DEV_BYPASS=true is forbidden when NODE_ENV=production. " +
      "This flag exists only for local dev when real OAuth is unavailable.",
    path: ["AUTH_DEV_BYPASS"],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;

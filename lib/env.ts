import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  // Default to "production" so that if NODE_ENV is ever unset the app
  // fails safe — lib/auth.ts gates trustHost on this, and defaulting to
  // "development" would silently enable trustHost in an unconfigured
  // deploy, opening a host-header injection risk.
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("env loader", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    await expect(import("@/lib/env")).rejects.toThrow(/DATABASE_URL/);
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(import("@/lib/env")).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it("returns a typed env object when all vars are set", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    const { env } = await import("@/lib/env");
    expect(env.DATABASE_URL).toBe("postgres://u:p@localhost:5432/db");
    expect(env.AUTH_GOOGLE_ID).toBe("id");
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-test-key");
  });

  it("throws when AUTH_SECRET is shorter than 32 chars", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(31));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    await expect(import("@/lib/env")).rejects.toThrow(/AUTH_SECRET/);
  });

  it("defaults NODE_ENV to production when unset (fail-safe)", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    vi.stubEnv("NODE_ENV", undefined as unknown as string);
    const { env } = await import("@/lib/env");
    expect(env.NODE_ENV).toBe("production");
  });

  it("AUTH_DEV_BYPASS defaults to false when unset", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_DEV_BYPASS", undefined as unknown as string);
    const { env } = await import("@/lib/env");
    expect(env.AUTH_DEV_BYPASS).toBe(false);
  });

  it("AUTH_DEV_BYPASS=true is accepted in development", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    const { env } = await import("@/lib/env");
    expect(env.AUTH_DEV_BYPASS).toBe(true);
  });

  it("AUTH_DEV_BYPASS=true is REFUSED at boot when NODE_ENV=production", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NEXT_PHASE", undefined as unknown as string);
    await expect(import("@/lib/env")).rejects.toThrow(
      /AUTH_DEV_BYPASS=true is forbidden when NODE_ENV=production/,
    );
  });

  it("AUTH_DEV_BYPASS=true + NODE_ENV=production is ALLOWED during a Next.js build (NEXT_PHASE escape)", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const { env } = await import("@/lib/env");
    expect(env.AUTH_DEV_BYPASS).toBe(true);
  });
});

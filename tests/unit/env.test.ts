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
    await expect(import("@/lib/env")).rejects.toThrow(/DATABASE_URL/);
  });

  it("returns a typed env object when all vars are set", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    const { env } = await import("@/lib/env");
    expect(env.DATABASE_URL).toBe("postgres://u:p@localhost:5432/db");
    expect(env.AUTH_GOOGLE_ID).toBe("id");
  });

  it("throws when AUTH_SECRET is shorter than 32 chars", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(31));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    await expect(import("@/lib/env")).rejects.toThrow(/AUTH_SECRET/);
  });

  it("defaults NODE_ENV to production when unset (fail-safe)", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("NODE_ENV", undefined as unknown as string);
    const { env } = await import("@/lib/env");
    expect(env.NODE_ENV).toBe("production");
  });
});

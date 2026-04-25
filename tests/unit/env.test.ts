import { describe, it, expect, beforeEach, vi } from "vitest";

describe("env loader", () => {
  beforeEach(() => {
    vi.resetModules();
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
});

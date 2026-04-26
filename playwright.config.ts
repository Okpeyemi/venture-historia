import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Manually load .env.local into process.env so test code can read flags
// like AUTH_DEV_BYPASS. Playwright doesn't auto-load env files (Next.js
// does for the dev server it spawns, but not for the test process itself).
try {
  const envContent = readFileSync(path.resolve(__dirname, ".env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  // .env.local missing — fine, Playwright tests still work in CI where
  // env vars are injected by the runner.
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});

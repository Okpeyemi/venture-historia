import { test, expect } from "@playwright/test";

// These E2E tests verify the *real* auth flow: sign-in CTA visible, sign-in
// page exposes Google button, dashboard redirects unauthenticated users.
// AUTH_DEV_BYPASS=true bypasses the entire flow — synthesizing a session,
// auto-redirecting /signin to /dashboard, and making /dashboard reachable
// without a cookie. Skip the gate tests when bypass is on; the bypass has
// its own smoke test in the auth fix commit history.
const bypassActive = process.env.AUTH_DEV_BYPASS === "true";

test.describe("auth gates", () => {
  test.skip(bypassActive, "AUTH_DEV_BYPASS=true short-circuits real auth — gate tests do not apply");

  test("landing page shows the sign-in CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Venture Historia" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  });

  test("sign-in page exposes the Google button", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("button", { name: /Continuer avec Google/ })).toBeVisible();
  });

  test("dashboard redirects unauthenticated users to /signin", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin$/);
  });
});

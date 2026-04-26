import { test, expect } from "@playwright/test";

// AUTH_DEV_BYPASS=true short-circuits the real auth flow: synthesizes a
// session, auto-redirects /signin to /dashboard, and makes /dashboard
// reachable without a cookie. The two gate tests below assume the real
// flow and would always fail under bypass — skip them. The landing page
// test stays active because the public landing page is unchanged
// regardless of bypass state.
const bypassActive = process.env.AUTH_DEV_BYPASS === "true";

test.describe("auth gates", () => {
  test("landing page shows the sign-in CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Venture Historia" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  });

  test("sign-in page exposes the Google button", async ({ page }) => {
    test.skip(bypassActive, "AUTH_DEV_BYPASS auto-redirects /signin to /dashboard");
    await page.goto("/signin");
    await expect(page.getByRole("button", { name: /Continuer avec Google/ })).toBeVisible();
  });

  test("dashboard redirects unauthenticated users to /signin", async ({ page }) => {
    test.skip(bypassActive, "AUTH_DEV_BYPASS makes /dashboard reachable without a session");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin$/);
  });
});

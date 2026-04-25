import { test, expect } from "@playwright/test";

test.describe("auth gates", () => {
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

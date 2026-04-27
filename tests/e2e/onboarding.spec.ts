import { test, expect } from "@playwright/test";

const FLAG = "vh_tutorial_seen_v1";

test.describe("Onboarding — tutorial overlay, hints, tooltips", () => {
  test("first game shows tutorial overlay; clicking through finishes it", async ({ page }) => {
    // Fresh browser context — localStorage is empty by default; no addInitScript.
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    // Step 1 bubble is visible.
    await expect(page.getByText(/Étape 1 sur 6/)).toBeVisible();

    // Click "Suivant →" 5 times to traverse steps 2-6.
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /Suivant/ }).click();
    }
    // Final button is "Terminer" — click it to finish.
    await page.getByRole("button", { name: /Terminer/ }).click();

    // Overlay should be gone — no "Étape X sur 6" visible.
    await expect(page.getByText(/Étape \d sur 6/)).toHaveCount(0);

    // localStorage flag is set.
    const flag = await page.evaluate((k) => window.localStorage.getItem(k), FLAG);
    expect(flag).toBe("true");
  });

  test("tutorial does not reappear after dismissal (returning user)", async ({ page }) => {
    // Pre-set the flag — simulating a returning user.
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    await expect(page.getByText(/Étape 1 sur 6/)).toHaveCount(0);
  });

  test("'Sauter le tutoriel' dismisses immediately and sets the flag", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    await expect(page.getByText(/Étape 1 sur 6/)).toBeVisible();
    await page.getByRole("button", { name: /Sauter le tutoriel/ }).click();
    await expect(page.getByText(/Étape \d sur 6/)).toHaveCount(0);

    const flag = await page.evaluate((k) => window.localStorage.getItem(k), FLAG);
    expect(flag).toBe("true");
  });

  test("metric tooltip appears on hover", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    // Cash metric — locate by data attribute, hover the label span (which has the
    // tooltip handlers), expect tooltip text.
    const cashLabel = page.locator('[data-metric-id="cash"]').getByText(/Cash/);
    await cashLabel.hover();
    await expect(page.getByText(/Argent en banque/)).toBeVisible();
  });

  test("contextual hint matches game state (SF 2005 → runway-critical)", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    // SF 2005 starts with runway = 3 months → rule 1 fires.
    const hint = page.locator('[data-hint-id="runway-critical"]');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText(/Faillite imminente/);
  });

  test("'Revoir le tutoriel' replay button re-opens the overlay", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    await expect(page.getByText(/Étape 1 sur 6/)).toHaveCount(0);
    await page.getByRole("button", { name: /Revoir le tutoriel/ }).click();
    await expect(page.getByText(/Étape 1 sur 6/)).toBeVisible();
  });
});

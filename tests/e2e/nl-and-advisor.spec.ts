import { test, expect } from "@playwright/test";

test.describe("NL escape + Advisor", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
  });

  test("NL submit shows the mock validator's rejection reason", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("button", { name: /Démarrer/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    // Open the new "Action libre" tab.
    await page.getByRole("tab", { name: /Libre/ }).click();

    // Type a free-form action and submit.
    await page
      .getByPlaceholder("ex: j'embauche un CTO à 180k pour accélérer la R&D")
      .fill("j'embauche un CTO à 180k");
    await page.getByRole("button", { name: /Valider l'action/ }).click();

    // MockValidator always rejects with "[mock] cannot interpret: ..."
    await expect(page.getByText(/\[mock\] cannot interpret/)).toBeVisible();
  });

  test("Advisor button shows the mock advice text", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("button", { name: /Démarrer/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    // Click the advisor button.
    await page.getByRole("button", { name: /Demander/ }).click();

    // MockAdvisor returns "[mock advice] State looks healthy. Keep building."
    // when runway >= 6, else "[mock advice] Runway is short..."
    // SF 2005 starts with $50k cash + 1 team → monthlyBurn = 1*10k + 5k = 15k.
    // runway = floor(50k / 15k) = 3 months → "Runway is short" branch.
    await expect(page.getByText(/\[mock advice\] Runway is short/)).toBeVisible();
  });
});

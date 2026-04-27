import { test, expect } from "@playwright/test";

test.describe("game playthrough", () => {
  test("create → take an action → advance → end via player-driven IPO", async ({
    page,
  }) => {
    // Bypass auth — we're authenticated as dev-bypass-user.
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Tableau de bord" }),
    ).toBeVisible();

    // Start a new SF 2005 game.
    await page
      .getByRole("button", { name: /Démarrer/ })
      .first()
      .click();

    // Land on the game page.
    await expect(page).toHaveURL(/\/games\/[^/]+$/);
    await expect(page.getByText("NimbusCRM")).toBeVisible();
    await expect(page.getByText("Q1 2005").first()).toBeVisible();

    // Take a finance action — the default Finance tab is open.
    // The first "Ajouter" button is "Lever des fonds" (default form).
    await page.getByRole("button", { name: /Finance/ }).click();
    await page.getByRole("button", { name: "Ajouter" }).first().click();
    await expect(page.getByText(/finance\.raiseFunds/)).toBeVisible();

    // Advance the trimester.
    await page.getByRole("button", { name: /Avancer le trimestre/ }).click();

    // Should land back on the game page (next trimester).
    await expect(page).toHaveURL(/\/games\/[^/]+$/);
    await expect(page.getByText("Q2 2005").first()).toBeVisible();

    // Declare an IPO ending.
    await page.getByRole("button", { name: /Sortie/ }).click();
    await page.getByRole("button", { name: /IPO/ }).click();

    // Should land on the end screen.
    await expect(page).toHaveURL(/\/games\/[^/]+\/end$/);
    await expect(page.getByText(/Fin: succès/)).toBeVisible();
    await expect(page.getByText(/ipo/)).toBeVisible();
  });
});

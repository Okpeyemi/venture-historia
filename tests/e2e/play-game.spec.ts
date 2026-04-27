import { test, expect } from "@playwright/test";

test.describe("game playthrough", () => {
  test("create → take an action → advance → end via player-driven IPO", async ({
    page,
  }) => {
    // Auto-accept the confirmation dialog the IPO button triggers.
    page.on("dialog", (d) => d.accept());

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
    // SF 2005 preset starts at $50k cash. Locale-tolerant: matches
    // "$50,000" (en) or "$50 000" (fr) since toLocaleString() output
    // depends on Node's locale at render time.
    await expect(page.getByText(/\$50[,\s ]000/)).toBeVisible();

    // Take a finance action — the default Finance tab is open.
    // The first "Ajouter" button is "Lever des fonds" (default values:
    // seed round, $500,000, 15% equity, "Northstar Capital", 1 board seat,
    // no veto).
    await page.getByRole("button", { name: /Finance/ }).click();
    await page.getByRole("button", { name: "Ajouter" }).first().click();
    await expect(page.getByText(/finance\.raiseFunds/)).toBeVisible();

    // Advance the trimester.
    await page.getByRole("button", { name: /Avancer le trimestre/ }).click();

    // Should land back on the game page (next trimester).
    await expect(page).toHaveURL(/\/games\/[^/]+$/);
    await expect(page.getByText("Q2 2005").first()).toBeVisible();

    // Cash should be exactly $550,000 ($50k initial + $500k raise, applied
    // ONCE). If it shows $1,050,000, the action was double-applied — that
    // was a real bug found in Plan #5 final review and the fix is now
    // guarded by this assertion. Locale-tolerant regex.
    await expect(page.getByText(/\$550[,\s ]000/)).toBeVisible();

    // Declare an IPO ending.
    await page.getByRole("button", { name: /Sortie/ }).click();
    await page.getByRole("button", { name: /IPO/ }).click();

    // Should land on the end screen.
    await expect(page).toHaveURL(/\/games\/[^/]+\/end$/);
    await expect(page.getByText(/Fin: succès/)).toBeVisible();
    await expect(page.getByText(/ipo/)).toBeVisible();
  });
});

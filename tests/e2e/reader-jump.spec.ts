import { test, expect } from "@playwright/test";

test("landing demo supports click-to-jump in classic and guided reader modes", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  await page
    .getByLabel(/classic reader document/i)
    .getByRole("button", { name: /^payoff$/i })
    .click();

  await expect(
    page.locator('[data-reader-classic-active="true"]'),
  ).toContainText(/the practical payoff/i);

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^guided line$/i }).click();

  const targetLine = page
    .locator('[data-reader-line-index]:not([data-reader-line-active="true"])')
    .first();
  const targetIndex = await targetLine.getAttribute("data-reader-line-index");

  await targetLine.locator("[data-reader-token-index]").first().click();

  await expect(
    page.locator(`[data-reader-line-index="${targetIndex}"]`),
  ).toHaveAttribute("data-reader-line-active", "true");
});

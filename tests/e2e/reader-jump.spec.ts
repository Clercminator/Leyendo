import { test, expect } from "@playwright/test";

test("landing demo keeps fullscreen next to reader details in the reader toolbar", async ({
  page,
}) => {
  await page.goto("/");

  const readerCanvas = page.getByLabel(/reader canvas/i);
  const fullscreenButton = readerCanvas.getByRole("button", {
    name: /enter fullscreen/i,
  });
  const infoButton = readerCanvas.getByRole("button", {
    name: /reader details/i,
  });

  await expect(fullscreenButton).toBeVisible();
  await expect(infoButton).toBeVisible();

  const [fullscreenBox, infoBox] = await Promise.all([
    fullscreenButton.boundingBox(),
    infoButton.boundingBox(),
  ]);

  expect(fullscreenBox).not.toBeNull();
  expect(infoBox).not.toBeNull();
  expect(fullscreenBox!.x).toBeLessThan(infoBox!.x);
  expect(Math.abs(fullscreenBox!.y - infoBox!.y)).toBeLessThan(12);
});

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

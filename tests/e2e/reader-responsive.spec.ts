import { test, expect } from "@playwright/test";

test("tablet-width reader keeps compact chrome without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");

  await page.getByLabel(/document title/i).fill("Tablet note");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(
      "Tablet reading should preserve the classic reader layout without overflowing sideways.",
    );

  await page.getByRole("button", { name: /open in reader/i }).click();

  await expect(page).toHaveURL(/\/reader\?document=/);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  await expect(page.getByText(/tap the text to show controls/i)).toBeVisible();

  await page.getByLabel(/reader canvas/i).click();
  await page.getByRole("button", { name: /change reading mode/i }).click();

  await expect
    .poll(async () => {
      return page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
    })
    .toBe(true);

  await page.getByRole("button", { name: /^classic reader$/i }).click();
  await expect(page.getByLabel(/classic reader document/i)).toBeVisible();
});

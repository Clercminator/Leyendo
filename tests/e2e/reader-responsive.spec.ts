import { test, expect } from "@playwright/test";

import { createMinimalPdfBuffer } from "../fixtures/minimal-pdf";

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
  await expect(page.getByRole("button", { name: /controls/i })).toBeVisible();

  await page.getByRole("button", { name: /controls/i }).click();
  await page.getByRole("button", { name: /reading tools/i }).click();
  const toolsDialog = page.getByRole("dialog", { name: /reading tools/i });
  await expect(toolsDialog).toBeVisible();
  await toolsDialog.getByLabel(/close tools/i).click();
  await page.getByRole("button", { name: /controls/i }).click();
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

test("desktop PDF toolbar consolidates view, presets, and reader details", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("radio", { name: /upload a document/i }).click();
  await page
    .getByLabel(/choose a pdf, docx, rtf, markdown, or text file/i)
    .setInputFiles({
      name: "desktop-toolbar.pdf",
      mimeType: "application/pdf",
      buffer: createMinimalPdfBuffer([
        "Desktop toolbar PDF page one.",
        "Desktop toolbar PDF page two.",
      ]),
    });

  await page.getByRole("button", { name: /open imported file/i }).click();

  await expect(page).toHaveURL(/\/reader\?document=/);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /change preset/i }),
  ).toHaveCount(0);
  await expect(page.getByText(/^1 of 2$/)).toBeVisible();
  await expect(page.getByText(/^Page 1$/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /enter fullscreen/i }),
  ).toBeVisible();

  const infoButton = page.getByRole("button", { name: /reader details/i });
  await infoButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/time is an estimate/i)).toBeVisible();
  await expect(page.getByText(/complete/i).first()).toBeVisible();

  const viewButton = page.getByRole("button", { name: /view:/i });
  await expect(viewButton).toContainText(/fit width/i);
  await viewButton.click();
  await expect(page.getByText(/pdf view tools/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /zoom in/i })).toBeVisible();
  await page.keyboard.press("Escape");

  const moreButton = page.getByRole("button", { name: /more actions/i });
  await moreButton.click();
  await expect(page.getByText(/presets/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /beginner/i })).toBeVisible();
});

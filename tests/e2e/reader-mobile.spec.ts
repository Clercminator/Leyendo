import { test, expect } from "@playwright/test";

import { createMinimalPdfBuffer } from "../fixtures/minimal-pdf";
const READER_OPEN_TIMEOUT_MS = 20_000;

test("@mobile reader route stays usable at phone width for text modes", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel(/document title/i).fill("Phone note");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill("Phone reading should stay usable across the main reading modes.");

  await page.getByRole("button", { name: /open in reader/i }).click();

  await expect(page).toHaveURL(/\/reader\?document=/, {
    timeout: READER_OPEN_TIMEOUT_MS,
  });
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /controls/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /change preset/i }),
  ).toHaveCount(0);

  const mobileSidebarToggle = page.getByRole("button", {
    name: /notes, highlights, and bookmarks/i,
  });

  await expect(mobileSidebarToggle).toBeVisible();
  await mobileSidebarToggle.click();
  const mobileSidebar = page.getByRole("complementary", {
    name: /reader details/i,
  });

  await expect(mobileSidebar).toBeVisible();
  await mobileSidebar
    .getByRole("button", { name: /expand highlights and bookmarks/i })
    .click();
  await expect(mobileSidebar.getByText(/recent bookmarks/i)).toBeVisible();

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

test("@mobile phone users can save PDF bookmarks and highlights from a real imported PDF", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("radio", { name: /upload a document/i }).click();
  await page
    .getByLabel(/choose a pdf, docx, rtf, markdown, or text file/i)
    .setInputFiles({
      name: "sample.pdf",
      mimeType: "application/pdf",
      buffer: createMinimalPdfBuffer([
        "Leyendo PDF page one.",
        "Leyendo PDF page two.",
      ]),
    });

  await expect(
    page.getByRole("button", { name: /open imported file/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /open imported file/i }).click();

  await expect(page).toHaveURL(/\/reader\?document=/, {
    timeout: READER_OPEN_TIMEOUT_MS,
  });
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  await page.getByRole("button", { name: /controls/i }).click();
  await page.getByRole("button", { name: /reading tools/i }).click();

  const toolsDialog = page.getByRole("dialog", { name: /reading tools/i });

  await expect(toolsDialog).toBeVisible();
  await expect(toolsDialog.getByText(/presets/i)).toBeVisible();
  await expect(
    toolsDialog.getByRole("button", { name: /return to original page/i }),
  ).toBeVisible();
  await expect(
    toolsDialog.getByRole("textbox", { name: /jump to page/i }),
  ).toHaveValue("1");
  await toolsDialog.getByRole("textbox", { name: /jump to page/i }).fill("2");
  await toolsDialog.getByRole("button", { name: /^go$/i }).click();
  await expect(toolsDialog.getByText(/^2 of 2$/)).toBeVisible();
  await toolsDialog.getByRole("button", { name: /save bookmark/i }).click();
  await expect(toolsDialog).not.toBeVisible();

  const mobileSidebarToggle = page.getByRole("button", {
    name: /notes, highlights, and bookmarks/i,
  });

  await mobileSidebarToggle.click();
  const mobileSidebar = page.getByRole("complementary", {
    name: /reader details/i,
  });

  await expect(mobileSidebar).toBeVisible();
  await expect(
    mobileSidebar.getByText("Bookmark 1", { exact: true }),
  ).toBeVisible();
  await expect(mobileSidebar.getByText(/saved at paragraph 2/i)).toBeVisible();

  await page.getByRole("button", { name: /controls/i }).click();
  await page.getByRole("button", { name: /reading tools/i }).click();
  const highlightToolsDialog = page.getByRole("dialog", {
    name: /reading tools/i,
  });

  await expect(highlightToolsDialog).toBeVisible();
  await highlightToolsDialog
    .getByRole("button", { name: /save highlight/i })
    .click();
  await expect(highlightToolsDialog).not.toBeVisible();

  await expect(
    mobileSidebar.getByText("Highlight 1", { exact: true }),
  ).toBeVisible();
  await expect(
    mobileSidebar.getByRole("button", { name: /jump to highlight/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /controls/i }).click();
  await page.getByRole("button", { name: /reading tools/i }).click();
  const reopenedToolsDialog = page.getByRole("dialog", {
    name: /reading tools/i,
  });

  await expect(reopenedToolsDialog).toBeVisible();
  await reopenedToolsDialog
    .getByRole("textbox", { name: /jump to page/i })
    .fill("1");
  await reopenedToolsDialog.getByRole("button", { name: /^go$/i }).click();
  await expect(reopenedToolsDialog.getByText(/^1 of 2$/)).toBeVisible();
  await reopenedToolsDialog.getByLabel(/close tools/i).click();
  await expect(reopenedToolsDialog).not.toBeVisible();

  await mobileSidebar
    .getByRole("button", { name: /jump to bookmark/i })
    .click();
  await expect(page.getByText(/^2 of 2$/)).toBeVisible();

  await expect(
    mobileSidebar.getByRole("button", { name: /jump to highlight/i }),
  ).toBeVisible();
});

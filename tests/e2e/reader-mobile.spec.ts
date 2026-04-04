import { test, expect } from "@playwright/test";

import { createMinimalPdfBuffer } from "../fixtures/minimal-pdf";

test("@mobile reader route stays usable at phone width for text modes", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel(/document title/i).fill("Phone note");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill("Phone reading should stay usable across the main reading modes.");

  await page.getByRole("button", { name: /open in reader/i }).click();

  await expect(page).toHaveURL(/\/reader\?document=/);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();

  await page.getByLabel(/reader canvas/i).click();

  const mobileSidebarToggle = page.getByRole("button", {
    name: /notes, highlights, and bookmarks/i,
  });

  await expect(mobileSidebarToggle).toBeVisible();
  await mobileSidebarToggle.click();
  await expect(
    page.locator("#reader-sidebar-mobile").getByText(/recent bookmarks/i),
  ).toBeVisible();

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();
  await expect(page.getByLabel(/classic reader document/i)).toBeVisible();
});

test("@mobile phone users can save Standard PDF bookmarks and highlights from a real imported PDF", async ({
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

  await expect(page).toHaveURL(/\/reader\?document=/);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();

  await page.getByLabel(/reader canvas/i).click();

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^standard$/i }).click();

  await expect(
    page.getByRole("textbox", { name: /jump to page/i }),
  ).toHaveValue("1");
  await page.getByRole("textbox", { name: /jump to page/i }).fill("2");
  await page.getByRole("button", { name: /^go$/i }).click();
  await expect(page.getByText(/^2 of 2$/)).toBeVisible();

  await page
    .getByRole("button", { name: /pages, outline, and notes/i })
    .click();
  const pdfToolsDialog = page.getByRole("dialog", {
    name: /pages, outline, and notes/i,
  });

  await expect(pdfToolsDialog).toBeVisible();
  await expect(pdfToolsDialog.getByText(/page thumbnails/i)).toBeVisible();
  await expect(
    pdfToolsDialog.getByRole("button", { name: /save bookmark/i }),
  ).toBeVisible();

  await pdfToolsDialog.getByRole("button", { name: /save bookmark/i }).click();
  await expect(pdfToolsDialog).not.toBeVisible();

  await page
    .getByRole("button", { name: /pages, outline, and notes/i })
    .click();
  const bookmarkDialog = page.getByRole("dialog", {
    name: /pages, outline, and notes/i,
  });
  await expect(
    bookmarkDialog.getByText("Bookmark 1", { exact: true }),
  ).toBeVisible();
  await expect(bookmarkDialog.getByText(/saved on page 2/i)).toBeVisible();

  await bookmarkDialog
    .getByLabel(/note for selected text or current page/i)
    .fill("Keep this page for the contract summary.");
  await bookmarkDialog
    .getByRole("button", { name: /save page highlight/i })
    .click();
  await expect(bookmarkDialog).not.toBeVisible();

  await page
    .getByRole("button", { name: /pages, outline, and notes/i })
    .click();
  const highlightDialog = page.getByRole("dialog", {
    name: /pages, outline, and notes/i,
  });
  await expect(
    highlightDialog.getByText("Highlight 1", { exact: true }),
  ).toBeVisible();
  await expect(
    highlightDialog.getByText(/keep this page for the contract summary\./i),
  ).toBeVisible();

  await highlightDialog.getByRole("button", { name: /close/i }).click();
  await expect(highlightDialog).not.toBeVisible();

  await page.getByRole("textbox", { name: /jump to page/i }).fill("1");
  await page.getByRole("button", { name: /^go$/i }).click();
  await expect(page.getByText(/^1 of 2$/)).toBeVisible();

  await page
    .getByRole("button", { name: /pages, outline, and notes/i })
    .click();
  const reopenedPdfToolsDialog = page.getByRole("dialog", {
    name: /pages, outline, and notes/i,
  });

  await expect(reopenedPdfToolsDialog).toBeVisible();
  await reopenedPdfToolsDialog
    .getByRole("button", { name: /jump to bookmark/i })
    .click();
  await expect(page.getByText(/^2 of 2$/)).toBeVisible();

  await page
    .getByRole("button", { name: /pages, outline, and notes/i })
    .click();
  const highlightJumpDialog = page.getByRole("dialog", {
    name: /pages, outline, and notes/i,
  });
  await expect(
    highlightJumpDialog.getByRole("button", { name: /jump to highlight/i }),
  ).toBeVisible();
});

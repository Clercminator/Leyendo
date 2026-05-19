import { test, expect, type Locator, type Page } from "@playwright/test";

import { createMinimalPdfBuffer } from "../fixtures/minimal-pdf";

const READER_OPEN_TIMEOUT_MS = 20_000;

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

async function expectReaderRoute(page: Page) {
  await expect
    .poll(() => page.url(), { timeout: 90_000 })
    .toMatch(/\/reader\?document=/);
}

async function expectVisibleDropdownWithinCanvas(args: {
  canvas: Locator;
  page: Page;
}) {
  const { canvas, page } = args;
  const panel = page.locator(".reader-dropdown-panel:visible").last();

  await expect(panel).toBeVisible();

  const [panelBox, canvasBox] = await Promise.all([
    panel.boundingBox(),
    canvas.boundingBox(),
  ]);
  const viewport = page.viewportSize();

  if (!panelBox || !canvasBox || !viewport) {
    throw new Error("Expected visible reader dropdown bounds.");
  }

  expect(panelBox.x).toBeGreaterThanOrEqual(canvasBox.x - 1);
  expect(panelBox.y).toBeGreaterThanOrEqual(canvasBox.y - 1);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(
    Math.min(canvasBox.x + canvasBox.width, viewport.width) + 1,
  );
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(
    Math.min(canvasBox.y + canvasBox.height, viewport.height) + 1,
  );
}

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

  await expect(page.getByRole("button", { name: /open in reader/i })).toBeEnabled();
  await page.getByRole("button", { name: /open in reader/i }).click();

  await expectReaderRoute(page);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible({
    timeout: 60_000,
  });
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

test("desktop PDF workspace keeps the details panel visible without thumbnails", async ({
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

  await expect(page.getByRole("button", { name: /open imported file/i })).toBeEnabled();
  await page.getByRole("button", { name: /open imported file/i }).click();

  await expectReaderRoute(page);
  await expect(
    page.getByRole("button", { name: /open browser pdf/i }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("button", { name: /change preset/i }),
  ).toHaveCount(0);
  await expect(page.getByText(/^1 of 2$/)).toBeVisible();
  await expect(page.getByText(/^Page 1$/)).toBeVisible();

  const readerDetails = page
    .getByRole("complementary", { name: /reader details/i })
    .first();

  await expect(readerDetails).toBeVisible();
  await expect(readerDetails.getByText(/recent highlights/i)).toBeVisible();
  await expect(readerDetails.getByText(/recent bookmarks/i)).toBeVisible();
  await expect(readerDetails.getByText(/page thumbnails/i)).toHaveCount(0);

  const viewButton = page.getByRole("button", { name: /^view$/i });

  await expect(viewButton).toBeVisible();
  await viewButton.click();
  await expect(page.getByText(/pdf view tools/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /zoom in/i })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("desktop fullscreen reader hides chrome until edge hover and keeps the reading panel dominant", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");

  await page.getByLabel(/document title/i).fill("Fullscreen immersion");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(
      "Fullscreen reading should keep most of the viewport dedicated to the document while still letting the controls return quickly from the screen edges. ".repeat(
        18,
      ),
    );

  await expect(page.getByRole("button", { name: /open in reader/i })).toBeEnabled();
  await page.getByRole("button", { name: /open in reader/i }).click();

  await expectReaderRoute(page);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();
  await expect(page.getByLabel(/classic reader document/i)).toBeVisible();

  await page.getByRole("button", { name: /enter fullscreen/i }).click();
  await page.waitForFunction(() => {
    return document.fullscreenElement !== null;
  });

  const revealButton = page.locator('button[aria-label="Controls"]');

  await expect(revealButton).toBeVisible({ timeout: 10_000 });

  const panelHeightRatio = await page.locator(".reader-panel").first().evaluate((element) => {
      const rect = element.getBoundingClientRect();

      return rect.height / window.innerHeight;
    });

  expect(panelHeightRatio).toBeGreaterThan(0.88);

  await page.mouse.move(180, 6);

  await expect(page.getByRole("button", { name: /change theme/i })).toBeVisible();
  await expect(revealButton).toHaveCount(0);
});

test("desktop classic reader dropdowns stay within the reader canvas when the toolbar wraps", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1040, height: 900 });
  await page.goto("/");

  await page.getByLabel(/document title/i).fill("Classic reader bounds");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(
      "Classic Reader should keep its desktop dropdowns inside the reading panel even when the toolbar wraps across multiple lines. ".repeat(
        12,
      ),
    );

  await expect(page.getByRole("button", { name: /open in reader/i })).toBeEnabled();
  await page.getByRole("button", { name: /open in reader/i }).click();

  await expectReaderRoute(page);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();
  await expect(page.getByLabel(/classic reader document/i)).toBeVisible();

  const canvas = page.getByLabel(/reader canvas/i);
  const themeButton = page.getByRole("button", { name: /change theme/i });

  await themeButton.scrollIntoViewIfNeeded();
  await themeButton.click();
  await expectVisibleDropdownWithinCanvas({ canvas, page });
  await page.getByRole("button", { name: /^ember$/i }).click();
  await expect(themeButton).toContainText(/ember/i);

  for (const buttonName of [
    /^save$/i,
    /font scale settings/i,
    /more actions/i,
  ]) {
    const button = page.getByRole("button", { name: buttonName });

    await button.scrollIntoViewIfNeeded();
    await button.click();
    await expectVisibleDropdownWithinCanvas({ canvas, page });
    await button.click();
  }
});

test("site light mode applies distinct reader palette accents", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/");

  await page.getByLabel(/document title/i).fill("Light mode reader palette");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(
      "Light mode reader palettes should keep their own accent colors instead of collapsing into the same neutral treatment. ".repeat(
        10,
      ),
    );

  await expect(page.getByRole("button", { name: /open in reader/i })).toBeEnabled();
  await page.getByRole("button", { name: /open in reader/i }).click();

  await expectReaderRoute(page);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTitle(/^light$/i).click();

  const themeButton = page.getByRole("button", { name: /change theme/i });

  for (const [themeName, expectedAccent] of [
    ["midnight", "#3b82f6"],
    ["ember", "#ea580c"],
    ["indigo", "#6366f1"],
  ] as const) {
    await themeButton.click();
    await page
      .getByRole("button", { name: new RegExp(`^${themeName}$`, "i") })
      .click();

    await expect
      .poll(async () => {
        return page.locator(`[data-reader-theme="${themeName}"]`).evaluate((element) => {
          return getComputedStyle(element).getPropertyValue("--reader-accent").trim();
        });
      })
      .toBe(expectedAccent);
  }
});

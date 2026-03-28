import { test, expect } from "@playwright/test";

import { createLargeDocumentText } from "../fixtures/large-document";

test("landing page shows the Lee product framing", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: /skip to content/i }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: /paste text or upload the document you want to read faster/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /light/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /language/i })).toBeVisible();

  await page.getByRole("button", { name: /light/i }).click();
  await expect(page.locator("html")).toHaveClass(/light/);

  await page.getByRole("button", { name: /language/i }).click();
  await page.getByRole("menuitemradio", { name: /espanol/i }).click();
  await expect(
    page.getByRole("link", { name: /importar documento/i }),
  ).toBeVisible();
  await expect(page.getByText(/antes de importar/i)).toHaveCount(0);

  await page.getByRole("button", { name: /idioma/i }).click();
  await page.getByRole("menuitemradio", { name: /english/i }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: /paste text or upload the document you want to read faster/i,
    }),
  ).toBeVisible();
});

test("user can upload a text file and open it in the reader", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("radio", { name: /upload a document/i }).click();
  await page
    .getByLabel(/choose a pdf, docx, rtf, markdown, or text file/i)
    .setInputFiles({
      name: "sample.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Imported from file. Another sentence."),
    });

  await expect(page.getByLabel(/extracted content preview/i)).toHaveValue(
    /Imported from file/i,
  );

  await page.getByRole("button", { name: /open in reader/i }).click();

  await expect(page).toHaveURL(/\/reader\?document=/);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /imported from/i }),
  ).toBeVisible();
});

test("user can paste text and open it in the reader", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel(/document title/i).fill("Quick note");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill("This is the first sentence. This is the second sentence.");

  await page.getByRole("button", { name: /open in reader/i }).click();

  await expect(page).toHaveURL(/\/reader\?document=/);
  await expect(page.getByText(/^280 WPM$/).last()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /playback settings/i }),
  ).toContainText(/2 words/i);
  await expect(page.getByRole("heading", { name: /^This is$/i })).toBeVisible();
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  await expect(
    page.getByLabel(/reader canvas/i).getByText(/2 sentences/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /time left:/i }),
  ).toBeVisible();
  await expect(page.getByText(/highlights and bookmarks/i)).toBeVisible();

  await page.getByRole("button", { name: /playback settings/i }).click();
  await page
    .getByRole("button", { name: /increase chunk size/i })
    .dispatchEvent("click");
  await expect(
    page.getByRole("button", { name: /playback settings/i }),
  ).toContainText(/3 words/i);
  await expect(
    page.getByRole("heading", { name: /^This is the$/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(
    page.getByRole("heading", { name: /^first sentence\.$/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^save$/i }).click();
  await page.getByRole("button", { name: /save bookmark/i }).click();
  await expect(page.getByText("Bookmark 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/saved at paragraph/i)).toBeVisible();

  await page.getByLabel(/note for current passage/i).fill("Key idea for later");
  await page.getByRole("button", { name: /^save$/i }).click();
  await page
    .getByRole("button", { name: /save highlight/i })
    .dispatchEvent("click");
  await expect(page.getByText("Highlight 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/key idea for later/i)).toBeVisible();

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("lee-reader-db");

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("preferences", "readwrite");
        const store = transaction.objectStore("preferences");
        const getRequest = store.get("reader-preferences");

        getRequest.onerror = () => {
          reject(getRequest.error ?? new Error("Failed to load preferences"));
        };

        getRequest.onsuccess = () => {
          const record = getRequest.result;
          store.put({
            key: "reader-preferences",
            value: {
              ...record.value,
              chunkSize: 1,
            },
          });
        };

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };

        transaction.onerror = () => {
          reject(
            transaction.error ?? new Error("Failed to update preferences"),
          );
        };
      };
    });
  });

  await page.reload();
  await expect(
    page.getByRole("button", { name: /playback settings/i }),
  ).toContainText(/1 word/i);
  await expect(page.getByRole("heading", { name: /^first$/i })).toBeVisible();

  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(
    page.getByRole("heading", { name: /^sentence\.$/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /jump to bookmark/i }).click();
  await expect(page.getByRole("heading", { name: /^first$/i })).toBeVisible();

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: /resume where you left off/i }),
  ).toBeVisible();
  await expect(page.getByText(/paragraph 1/i).first()).toBeVisible();
  await expect(
    page.getByText(/just started|\d+% complete/i).first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /open reader/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/reader\?document=/);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: /recent highlights/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: /open highlight/i }).click();
  await expect(page).toHaveURL(/\/reader\?document=.*highlight=/);
  await expect(page.getByText("Highlight 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/key idea for later/i)).toBeVisible();
  await expect(page.getByText(/^first sentence\.$/i).first()).toBeVisible();

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: /recent bookmarks/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: /open bookmark/i }).click();
  await expect(page).toHaveURL(/\/reader\?document=.*bookmark=/);
  await expect(page.getByText("Bookmark 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/^first sentence\.$/i).first()).toBeVisible();

  await page.getByRole("button", { name: /change preset/i }).click();
  await page.getByRole("button", { name: /challenge 420 wpm/i }).click();
  await expect(page.getByText(/^420 WPM$/).last()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /playback settings/i }),
  ).toContainText(/1 word/i);
  await expect(
    page.getByLabel(/reader canvas/i).getByText(/2 sentences/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /change preset/i }),
  ).toContainText(/challenge/i);

  await page.getByRole("button", { name: /change theme/i }).click();
  await page.getByRole("button", { name: /^ember$/i }).click();
  await expect(
    page.getByRole("button", { name: /change theme/i }),
  ).toContainText(/ember/i);

  await page.getByRole("button", { name: /font scale settings/i }).click();
  await page
    .getByRole("button", { name: /increase font scale/i })
    .dispatchEvent("click");
  await expect(
    page.getByRole("button", { name: /font scale settings/i }),
  ).toContainText(/1.1x/i);

  await page.getByRole("button", { name: /playback settings/i }).click();
  await page
    .getByRole("button", { name: /increase reading speed/i })
    .dispatchEvent("click");
  await expect(
    page.getByRole("button", { name: /playback settings/i }),
  ).toContainText(/440 WPM/i);

  await page.getByRole("button", { name: /^Play$/ }).click();
  await expect(
    page.getByRole("heading", { name: /^This is$/i }),
  ).not.toBeVisible({ timeout: 4000 });

  await page.getByRole("button", { name: /^Pause$/ }).click();

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^phrase chunk$/i }).click();
  await expect(
    page.getByText(/read in natural phrase groups with a calmer cadence/i),
  ).toBeVisible();

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^guided line$/i }).click();
  await expect(
    page.getByText(
      /follow the highlighted line window to reduce page scatter/i,
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();
  await expect(page.locator("[data-reader-classic-active='true']")).toHaveCount(1);

  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.locator("[data-reader-classic-active='true']")).toHaveCount(1);
});

test("classic reader keeps controls visible while the document scrolls inside the canvas", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel(/document title/i).fill("Long read");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(createLargeDocumentText(48, 24));

  await page.getByRole("button", { name: /open in reader/i }).click();
  await expect(page).toHaveURL(/\/reader\?document=/);

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  const viewport = page.getByLabel(/classic reader document/i);
  const nextButton = page.getByRole("button", { name: /^Next$/ });
  const remainingTimeButton = page.getByRole("button", { name: /time left:/i });

  await expect(viewport).toBeVisible();
  await expect(nextButton).toBeVisible();
  await expect(remainingTimeButton).toBeVisible();
  const initialRemainingTime = await remainingTimeButton.textContent();

  const initialButtonBox = await nextButton.boundingBox();
  expect(initialButtonBox).not.toBeNull();

  const scrollMetrics = await viewport.evaluate((element) => {
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  });

  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight,
  );

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect
    .poll(async () => viewport.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);

  const scrolledButtonBox = await nextButton.boundingBox();
  expect(scrolledButtonBox).not.toBeNull();
  expect(
    Math.abs((scrolledButtonBox?.y ?? 0) - (initialButtonBox?.y ?? 0)),
  ).toBeLessThan(2);

  await nextButton.click();
  await expect(remainingTimeButton).not.toHaveText(initialRemainingTime ?? "");
});

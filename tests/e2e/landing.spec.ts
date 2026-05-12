import { test, expect, type Page } from "@playwright/test";

import { createLargeDocumentText } from "../fixtures/large-document";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

async function expectDemoCardsToMatchHeight(page: Page) {
  const copyCard = page.getByTestId("landing-reader-demo-copy");
  const readerCanvas = page.locator("#reader-canvas");

  await expect(copyCard).toBeVisible();
  await expect(readerCanvas).toBeVisible();

  const [copyBox, readerBox] = await Promise.all([
    copyCard.boundingBox(),
    readerCanvas.boundingBox(),
  ]);

  expect(copyBox).not.toBeNull();
  expect(readerBox).not.toBeNull();
  expect(copyBox?.height ?? 0).toBeGreaterThan(300);
  expect(readerBox?.height ?? 0).toBeGreaterThan(300);
}

async function waitForHomeInteractivity(page: Page) {
  const menuButton = page.getByRole("button", { name: /menu/i });
  const readerLink = page.getByRole("link", { name: /^reader$/i });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await menuButton.click();

    if (await readerLink.isVisible()) {
      break;
    }

    await page.waitForTimeout(1_000);
  }

  await expect(readerLink).toBeVisible({ timeout: 1_000 });
  await menuButton.click();
  await expect(readerLink).not.toBeVisible();
}

async function choosePasteInput(page: Page) {
  await page.getByRole("radio", { name: /paste text instantly/i }).check();
}

async function openReaderDocument(page: Page) {
  const openImportedFileButton = page.getByRole("button", {
    name: /open imported file/i,
  });
  const openInReaderButton = page.getByRole("button", {
    name: /open in reader/i,
  });

  if (await openImportedFileButton.isVisible()) {
    await expect(openImportedFileButton).toBeEnabled();
    await openImportedFileButton.click();
  } else {
    await expect(openInReaderButton).toBeEnabled();
    await openInReaderButton.click();
  }

  await expect
    .poll(() => page.url(), { timeout: 90_000 })
    .toMatch(/\/reader\?document=/);

  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
}

async function openCompactControls(page: Page) {
  const controlsButton = page.getByRole("button", { name: /^controls$/i });

  if (await controlsButton.isVisible()) {
    await controlsButton.click();
  }
}

async function openReadingTools(page: Page) {
  await openCompactControls(page);

  const readingToolsButton = page.getByRole("button", {
    name: /reading tools/i,
  });

  if (await readingToolsButton.isVisible()) {
    await readingToolsButton.click();
    await expect(
      page.getByRole("heading", { name: /reading tools/i }),
    ).toBeVisible();
  }
}

async function closeReadingTools(page: Page) {
  const closeToolsButton = page.getByRole("button", { name: /close tools/i });

  if (await closeToolsButton.isVisible()) {
    await closeToolsButton.click();
  }
}

async function getActiveClassicText(page: Page) {
  const activeTokens = await page.locator('[data-active="true"]').allTextContents();

  return activeTokens.join(" ").replace(/\s+/g, " ").trim();
}

test("landing page shows the Leyendo product framing", async ({ page }) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: /skip to content/i }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: /bring the document that needs more pace, more focus, or an easier way back in/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /use a live sample before you import your own document/i,
    }),
  ).toBeVisible();
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  await expectDemoCardsToMatchHeight(page);

  await openCompactControls(page);
  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();
  await expect(page.locator("[data-reader-classic-active='true']")).toHaveCount(
    1,
  );

  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(page.getByRole("button", { name: /menu/i })).toBeVisible();
  await page.getByRole("button", { name: /menu/i }).click();
  await expect(page.getByRole("link", { name: /^reader$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^library$/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^(guides|guias)$/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^(about|sobre)$/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /menu/i }).click();

  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.getByRole("button", { name: /light/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /language/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^menu$/i })).toBeVisible();

  await page.getByRole("button", { name: /light/i }).click();
  await expect(page.locator("html")).toHaveClass(/light/);

  await page.getByRole("button", { name: /language/i }).click();
  await page.getByRole("menuitemradio", { name: /espanol/i }).click();
  await expect(page.getByRole("button", { name: /idioma/i })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /trae el documento que necesita mas ritmo, mas foco o una forma mas facil de retomarlo/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /usa una muestra real antes de importar tu propio documento/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /idioma/i }).click();
  await page.getByRole("menuitemradio", { name: /portugues/i }).click();
  await expect(page.getByRole("button", { name: /idioma/i })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /traga o documento que precisa de mais ritmo, mais foco ou uma volta mais facil para dentro dele/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /use uma amostra real antes de importar seu proprio documento/i,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /idioma/i }).click();
  await page.getByRole("menuitemradio", { name: /english/i }).click();
  await expect(page.getByRole("button", { name: /language/i })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /bring the document that needs more pace, more focus, or an easier way back in/i,
    }),
  ).toBeVisible();
});

test("guides hub exposes public SEO articles", async ({ page }) => {
  await page.goto("/guides");

  await expect(
    page.getByRole("heading", {
      name: /public guides for reading real documents with better pace and comprehension/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /start by goal/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /reading speed for pdfs and long documents/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /lectura rapida para documentos reales/i,
    }),
  ).toHaveCount(0);

  await page.goto("/guides/reading-speed-for-real-documents");

  await expect(
    page.getByRole("heading", {
      name: /reading speed for pdfs and long documents/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /frequently asked questions/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /read this article faster with leyendo/i,
    }),
  ).toBeVisible();

  await page.goto("/guides/velocidad-de-lectura-y-comprension");

  await expect(
    page.getByRole("heading", {
      name: /velocidad de lectura y comprension lectora/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /preguntas frecuentes/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /leer este articulo mas rapido con leyendo/i,
    }),
  ).toBeVisible();

  await page.goto("/guides/ler-aumenta-o-qi");

  await expect(
    page.getByRole("heading", {
      name: /ler aumenta o qi\? nao diretamente, mas muda a forma como voce pensa/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /perguntas frequentes/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /ler este artigo mais rapido com leyendo/i,
    }),
  ).toBeVisible();
});

test("about page cross-links into the public guides", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByTestId("about-founder-photo")).toBeVisible();
  await expect(page.getByAltText(/david clerc portrait/i)).toHaveAttribute(
    "src",
    /David%20Clerc%20empresarial%20traje\.webp/i,
  );
  await expect(
    page.getByRole("heading", {
      name: /read the operating philosophy behind the product/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /browse all guides/i }),
  ).toBeVisible();
});

test("user can upload a text file and open it in the reader", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await page.getByRole("radio", { name: /upload a document/i }).check();
  await expect(page.locator('input[type="file"]')).toHaveCount(1);
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "sample.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Imported from file. Another sentence."),
    });

  await expect(page.getByLabel(/extracted content preview/i)).toHaveValue(
    /Imported from file/i,
  );

  const openImportedFileButton = page.getByRole("button", {
    name: /open imported file/i,
  });
  await expect(openImportedFileButton).toBeVisible();
  await openReaderDocument(page);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  await expect(page.getByLabel(/reader canvas/i)).toContainText(/Imported/i);
  await expect(page.getByLabel(/reader canvas/i)).toContainText(/from/i);
});

test("user can paste text and open it in the reader", async ({ page }) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await choosePasteInput(page);
  await page.getByLabel(/document title/i).fill("Quick note");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill("This is the first sentence. This is the second sentence.");

  await openReaderDocument(page);

  await expect(page.getByText(/^280 WPM$/).last()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /playback settings/i }),
  ).toContainText(/2 words/i);
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();
  const activeRun = page.locator(".reader-active-run:visible").first();
  await expect(activeRun).toBeVisible();
  const initialActiveRunText = (await activeRun.textContent())?.trim();
  await expect(
    page.getByLabel(/reader canvas/i).getByText(/^2 sentences · \d+ words left$/i),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /time left:/i })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: /reader details/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /playback settings/i }).click();
  await page
    .getByRole("button", { name: /increase chunk size/i })
    .dispatchEvent("click");
  await expect(
    page.getByRole("button", { name: /playback settings/i }),
  ).toContainText(/3 words/i);
  await expect(activeRun).toBeVisible();

  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(activeRun).not.toHaveText(initialActiveRunText ?? "");

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
  await expect(activeRun).toBeVisible();
  const reloadedActiveRunText = (await activeRun.textContent())?.trim() ?? "";

  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(activeRun).not.toHaveText(reloadedActiveRunText);
  const postNextActiveRunText = (await activeRun.textContent())?.trim() ?? "";

  await page.getByRole("button", { name: /jump to bookmark/i }).click();
  await expect(activeRun).not.toHaveText(postNextActiveRunText);

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

  await page.getByRole("button", { name: /language/i }).click();
  await page.getByRole("menuitemradio", { name: /espanol/i }).click();
  await expect(page.getByRole("button", { name: /idioma/i })).toBeVisible();

  await page.getByRole("button", { name: /idioma/i }).click();
  await page.getByRole("menuitemradio", { name: /english/i }).click();
  await expect(page.getByRole("button", { name: /language/i })).toBeVisible();

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: /recent highlights/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: /open highlight/i }).click();
  await expect(page).toHaveURL(/\/reader\?document=.*highlight=/);
  await expect(page.getByText("Highlight 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/key idea for later/i)).toBeVisible();
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: /recent bookmarks/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: /open bookmark/i }).click();
  await expect(page).toHaveURL(/\/reader\?document=.*bookmark=/);
  await expect(page.getByText("Bookmark 1", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();

  await page.getByRole("button", { name: /change preset/i }).click();
  await page.getByRole("button", { name: /challenge 420 wpm/i }).click();
  await expect(
    page.getByRole("button", { name: /change preset/i }),
  ).toContainText(/challenge/i);

  await expect(page.getByText(/^420 WPM$/).last()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /playback settings/i }),
  ).toContainText(/1 word/i);
  await expect(
    page.getByLabel(/reader canvas/i).getByText(/^2 sentences · \d+ words left$/i),
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
    page.getByText(/follow the active line while nearby lines stay visible/i),
  ).toBeVisible();

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();
  await expect(page.locator("[data-reader-classic-active='true']")).toHaveCount(
    1,
  );

  await page.getByRole("button", { name: /^Next$/ }).click();
  await expect(page.locator("[data-reader-classic-active='true']")).toHaveCount(
    1,
  );
});

test("classic reader keeps controls visible while the document scrolls inside the canvas", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await choosePasteInput(page);
  await page.getByLabel(/document title/i).fill("Long read");
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(createLargeDocumentText(48, 24));

  await openReaderDocument(page);

  await openCompactControls(page);
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
  await expect(nextButton).toBeVisible();
  await expect(remainingTimeButton).toBeVisible();

  await nextButton.click();
  await expect(remainingTimeButton).not.toHaveText(initialRemainingTime ?? "");
});

test("user can paste markdown and open a clean reader view", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await choosePasteInput(page);
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(
      "# Optiland AI Agent - Comprehensive Documentation\n\n## Table of Contents\n\n- [Buyer Handoff Snapshot](#buyer-handoff-snapshot)\n\n1. [Quick Start Guide](#quick-start-guide)\n   - [For Complete Beginners](#for-complete-beginners)\n\nParagraph with **bold** text.",
    );
  await page.getByRole("radio", { name: /clean markdown/i }).click();
  await openReaderDocument(page);

  await openCompactControls(page);
  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  const classicDocument = page.getByLabel(/classic reader document/i);

  await expect(classicDocument).toBeVisible();
  await expect(
    classicDocument.getByRole("heading", {
      level: 1,
      name: /optiland ai agent - comprehensive documentation/i,
    }),
  ).toBeVisible();
  await expect(
    classicDocument.getByRole("heading", {
      level: 2,
      name: /table of contents/i,
    }),
  ).toBeVisible();
  await expect(
    classicDocument.getByRole("link", { name: /buyer handoff snapshot/i }),
  ).toBeVisible();
  await expect(classicDocument).toContainText("For Complete Beginners");
  await expect(classicDocument).toContainText("Paragraph with bold text.");
  await expect(classicDocument).not.toContainText("## Table of Contents");
  await expect(classicDocument).not.toContainText("**bold**");
});

test("reader can switch a saved markdown document between clean and literal views", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await choosePasteInput(page);
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill("# Heading\n\n- Bullet item\n\nParagraph with **bold** text.");
  await page.getByRole("radio", { name: /clean markdown/i }).click();
  await openReaderDocument(page);

  await openCompactControls(page);
  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  const classicDocument = page.getByLabel(/classic reader document/i);

  await expect(classicDocument).not.toContainText("# Heading");
  await expect(classicDocument).not.toContainText("**bold**");

  await page.getByRole("button", { name: /change text view/i }).click();
  await page.getByRole("button", { name: /^literal text$/i }).click();

  await expect(classicDocument).toContainText("# Heading");
  await expect(classicDocument).toContainText("**bold**");

  await page.getByRole("button", { name: /change text view/i }).click();
  await page.getByRole("button", { name: /^clean markdown$/i }).click();

  await expect(classicDocument).not.toContainText("# Heading");
  await expect(classicDocument).not.toContainText("**bold**");
});

test("clean markdown view signals fenced code and mermaid blocks", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await choosePasteInput(page);
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(
      "# Heading\n\n```ts\nconst answer = 42;\n```\n\n```mermaid\ngraph TD\nA-->B\n```",
    );
  await page.getByRole("radio", { name: /clean markdown/i }).click();

  await openReaderDocument(page);

  await openCompactControls(page);
  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  const classicDocument = page.getByLabel(/classic reader document/i);

  await expect(classicDocument.locator("pre").nth(0)).toContainText(
    "const answer = 42;",
  );
  await expect(
    classicDocument.locator('[data-mermaid-diagram="true"]').first(),
  ).toBeVisible();

  await page.getByRole("button", { name: /change text view/i }).click();
  await page.getByRole("button", { name: /^literal text$/i }).click();

  await expect(classicDocument).toContainText("const answer = 42;");
  await expect(classicDocument).toContainText("graph TD");
});

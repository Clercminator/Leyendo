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

async function chooseUploadInput(page: Page) {
  await page.getByRole("radio", { name: /upload a document/i }).check();
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

async function uploadDocumentFromFile(page: Page, filePath: string) {
  await chooseUploadInput(page);
  await page.locator('input[type="file"]').setInputFiles(filePath);
}

async function getActiveClassicText(page: Page) {
  const activeTokens = await page.locator('[data-active="true"]').allTextContents();

  return activeTokens.join(" ").replace(/\s+/g, " ").trim();
}

const richAiClipboardHtml = `
  <div data-message-author-role="assistant">
    <h1>Rich response</h1>
    <p>The key idea is <strong>preserved structure</strong>.</p>
    <p>A second paragraph should stay visually close.</p>
    <h2>Next section</h2>
    <ol>
      <li>First item</li>
      <li>Second item</li>
    </ol>
    <button aria-label="Copy response">Copy</button>
  </div>
`;

async function pasteRichAiResponse(page: Page) {
  const textarea = page.getByRole("textbox", { name: /^paste text$/i });

  await textarea.evaluate((element, html) => {
    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        files: [],
        items: [],
        getData: (type: string) =>
          type === "text/html"
            ? html
            : "Rich response\n\nThe key idea is preserved structure.\n\nA second paragraph should stay visually close.\n\nNext section\n\n1. First item\n2. Second item",
      },
    });

    element.dispatchEvent(pasteEvent);
  }, richAiClipboardHtml);

  await expect(textarea).toHaveValue(/# Rich response/);
  await expect(textarea).toHaveValue(/\*\*preserved structure\*\*/);
  await expect(
    page.getByRole("radio", { name: /clean markdown/i }),
  ).toBeChecked();
}

async function expectCompactRichReaderLayout(page: Page) {
  const classicDocument = page.getByLabel(/classic reader document/i);

  await expect(classicDocument).toBeVisible();
  await expect(
    classicDocument.getByRole("heading", {
      level: 1,
      name: "Rich response",
    }),
  ).toBeVisible();
  await expect(
    classicDocument.getByRole("heading", {
      level: 2,
      name: "Next section",
    }),
  ).toBeVisible();
  await expect(classicDocument.getByText("First item")).toBeVisible();
  await expect(classicDocument.getByText("Second item")).toBeVisible();
  await expect(
    classicDocument.getByText(/^Classic Reader$/),
  ).toHaveCount(0);
  await expect(classicDocument.getByText("Copy response")).toHaveCount(0);

  const paragraphBlocks = classicDocument.locator(
    '[data-reader-markdown-node-type="paragraph"]',
  );
  const sectionHeading = classicDocument.locator(
    '[data-reader-markdown-node-type="heading"]',
  ).nth(1);

  await expect(paragraphBlocks).toHaveCount(2);

  const [firstParagraph, secondParagraph, nextHeading] = await Promise.all([
    paragraphBlocks.nth(0).boundingBox(),
    paragraphBlocks.nth(1).boundingBox(),
    sectionHeading.boundingBox(),
  ]);

  expect(firstParagraph).not.toBeNull();
  expect(secondParagraph).not.toBeNull();
  expect(nextHeading).not.toBeNull();

  const paragraphGap =
    (secondParagraph?.y ?? 0) -
    ((firstParagraph?.y ?? 0) + (firstParagraph?.height ?? 0));
  const sectionGap =
    (nextHeading?.y ?? 0) -
    ((secondParagraph?.y ?? 0) + (secondParagraph?.height ?? 0));

  expect(paragraphGap).toBeGreaterThanOrEqual(0);
  expect(paragraphGap).toBeLessThan(24);
  expect(sectionGap).toBeGreaterThan(paragraphGap);
  expect(sectionGap).toBeLessThan(48);

  if (process.env.PLAYWRIGHT_CAPTURE_RICH_CLIPBOARD === "1") {
    const viewportWidth = page.viewportSize()?.width ?? 0;

    await classicDocument.screenshot({
      path:
        viewportWidth < 700
          ? "test-results/rich-clipboard-reader-mobile.png"
          : "test-results/rich-clipboard-reader-desktop.png",
    });
  }
}

function createLargeMarkdownWithHtmlInterop() {
  return Array.from({ length: 220 }, (_, index) => {
    const sectionNumber = index + 1;
    const lines = [
      `## Section ${sectionNumber}`,
      "",
      `Paragraph ${sectionNumber} keeps navigation working in large Markdown.`,
    ];

    if (sectionNumber === 2) {
      lines.push("", '<div class="note">Injected HTML</div>');
    }

    return lines.join("\n");
  }).join("\n\n");
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
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /the promise should prove itself on your first real document/i,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: /choose the reading mode that fits the document/i,
    }),
  ).toHaveCount(0);

  await page.goto("/about");

  await expect(
    page.getByRole("heading", {
      name: /the promise should prove itself on your first real document/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /choose the reading mode that fits the document/i,
    }),
  ).toBeVisible();
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

  await chooseUploadInput(page);
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

test("markdown file upload keeps all reader modes usable and renders tables and diagrams in classic mode", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await uploadDocumentFromFile(
    page,
    "tests/fixtures/reader-rich-markdown-upload.md",
  );
  await openReaderDocument(page);

  await expect(page.getByLabel(/reader canvas/i)).toBeVisible();

  for (const modeName of ["Focus Word", "Phrase Chunk", "Guided Line"]) {
    await page.getByRole("button", { name: /change reading mode/i }).click();
    await page.getByRole("button", { name: new RegExp(`^${modeName}$`, "i") }).click();

    await expect(page.getByLabel(/reader canvas/i)).toBeVisible();

    await page.getByRole("button", { name: /change text view/i }).click();
    await expect(
      page.getByRole("button", { name: /^literal text$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^clean markdown$/i }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
  }

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  const classicDocument = page.getByLabel(/classic reader document/i);

  await expect(classicDocument).toBeVisible();
  await expect(classicDocument.getByRole("table")).toBeVisible();
  await expect(
    classicDocument.getByRole("columnheader", { name: /^surface$/i }),
  ).toBeVisible();
  await expect(
    classicDocument.locator('[data-mermaid-diagram="true"]').first(),
  ).toBeVisible();

  await page.getByRole("button", { name: /change text view/i }).click();
  await expect(
    page.getByRole("button", { name: /^clean markdown$/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^literal text$/i }),
  ).toBeVisible();
});

test("markdown upload keeps sentence and word counts stable across modes while time stays mode-sensitive", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await uploadDocumentFromFile(
    page,
    "tests/fixtures/reader-rich-markdown-upload.md",
  );
  await openReaderDocument(page);

  const readerCanvas = page.getByLabel(/reader canvas/i);
  const timeEstimateHelp = page.getByText(/time is an estimate/i);
  const countSummary = readerCanvas.getByText(/sentences .* words left/i).first();
  const timeButton = page.getByRole("button", { name: /time left:/i }).first();

  await expect(timeEstimateHelp).toBeVisible();

  const initialCount = (await countSummary.textContent())?.trim();
  const initialTime = (await timeButton.textContent())?.trim();

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^guided line$/i }).click();

  await expect(countSummary).toHaveText(initialCount ?? "");
  await expect(timeEstimateHelp).toBeVisible();

  const guidedTime = (await timeButton.textContent())?.trim();
  expect(guidedTime).not.toBe(initialTime);

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  await expect(countSummary).toHaveText(initialCount ?? "");
  await expect(timeButton).toHaveText(initialTime ?? "");
});

test("large markdown in classic reader keeps later paragraphs clickable and advances hidden sections @production", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await chooseUploadInput(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "large-reader-regression.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(createLargeMarkdownWithHtmlInterop()),
  });
  await openReaderDocument(page);

  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  const classicDocument = page.getByLabel(/classic reader document/i);
  const activeClassicBlock = page.locator(
    '[data-reader-markdown-block-index][data-reader-classic-active="true"]',
  );

  await expect(classicDocument).toBeVisible();
  await classicDocument
    .getByText("Paragraph 3 keeps navigation working in large Markdown.")
    .click();
  await expect(activeClassicBlock).toContainText(
    /paragraph 3 keeps navigation working in large markdown/i,
  );

  const hiddenSectionsButton = classicDocument.getByRole("button", {
    name: /later sections hidden to keep large markdown responsive/i,
  });

  await expect(hiddenSectionsButton).toBeVisible();
  await hiddenSectionsButton.click();
  await expect(activeClassicBlock).toContainText(
    /paragraph 18 keeps navigation working in large markdown/i,
  );
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

test("rich AI clipboard HTML opens with preserved structure and compact spacing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  await waitForHomeInteractivity(page);
  await choosePasteInput(page);
  await pasteRichAiResponse(page);
  await openReaderDocument(page);
  await expectCompactRichReaderLayout(page);
});

test("rich AI clipboard HTML stays compact on mobile @mobile", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHomeInteractivity(page);
  await choosePasteInput(page);
  await pasteRichAiResponse(page);
  await openReaderDocument(page);
  await expectCompactRichReaderLayout(page);
});

test("classic reader playback keeps simple markdown text locked while the active chunk advances", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  await waitForHomeInteractivity(page);

  await choosePasteInput(page);
  await page
    .getByRole("textbox", { name: /^paste text$/i })
    .fill(
      "### How Do We Run It?\n\n- **What is the minimum setup?** PostgreSQL, the Optiland AI agent, the Optiland portal, OPENROUTER_API_KEY, Cross System access, and at least one enabled intake channel.\n- **What channels can be enabled?** WhatsApp and email are supported. The deployment can enable either or both depending on operating needs.",
    );
  await page.getByRole("radio", { name: /clean markdown/i }).click();

  await openReaderDocument(page);
  await openCompactControls(page);
  await page.getByRole("button", { name: /change reading mode/i }).click();
  await page.getByRole("button", { name: /^classic reader$/i }).click();

  const classicDocument = page.getByLabel(/classic reader document/i);
  const activeClassicBlock = page.locator(
    '[data-reader-paragraph-index][data-reader-classic-active="true"]',
  );
  const headingBlock = page.locator('[data-reader-paragraph-index="0"]');
  const firstListBlock = page.locator('[data-reader-paragraph-index="1"]');
  const headingText = headingBlock.getByRole("heading", {
    name: /how do we run it\?/i,
  });
  const firstListParagraph = firstListBlock.locator("p").first();

  await expect(classicDocument).toBeVisible();
  await expect(headingBlock).toBeVisible();
  await expect(firstListBlock).toBeVisible();
  await expect(activeClassicBlock).toHaveAttribute("data-reader-paragraph-index", "0");

  if (process.env.PLAYWRIGHT_CAPTURE_CLASSIC_PLAYBACK === "1") {
    await classicDocument.screenshot({
      path: "test-results/classic-reader-playback-before.png",
    });
  }

  const beforeActiveText = await getActiveClassicText(page);
  const [beforeHeadingBox, beforeListBox, beforeHeadingFontSize, beforeListFontSize] =
    await Promise.all([
      headingBlock.boundingBox(),
      firstListBlock.boundingBox(),
      headingText.evaluate((element) => getComputedStyle(element).fontSize),
      firstListParagraph.evaluate((element) => getComputedStyle(element).fontSize),
    ]);

  expect(beforeHeadingBox).not.toBeNull();
  expect(beforeListBox).not.toBeNull();

  await page.getByRole("button", { name: /^Play$/i }).click();

  await expect.poll(
    async () => activeClassicBlock.getAttribute("data-reader-paragraph-index"),
    { timeout: 10_000 },
  ).toBe("1");
  await expect
    .poll(async () => getActiveClassicText(page), { timeout: 10_000 })
    .not.toBe(beforeActiveText);

  const [afterHeadingBox, afterListBox, afterHeadingFontSize, afterListFontSize] =
    await Promise.all([
      headingBlock.boundingBox(),
      firstListBlock.boundingBox(),
      headingText.evaluate((element) => getComputedStyle(element).fontSize),
      firstListParagraph.evaluate((element) => getComputedStyle(element).fontSize),
    ]);

  expect(afterHeadingBox).not.toBeNull();
  expect(afterListBox).not.toBeNull();
  expect(afterHeadingFontSize).toBe(beforeHeadingFontSize);
  expect(afterListFontSize).toBe(beforeListFontSize);
  expect(Math.abs((afterHeadingBox?.x ?? 0) - (beforeHeadingBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((afterHeadingBox?.y ?? 0) - (beforeHeadingBox?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((afterHeadingBox?.width ?? 0) - (beforeHeadingBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((afterHeadingBox?.height ?? 0) - (beforeHeadingBox?.height ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((afterListBox?.x ?? 0) - (beforeListBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((afterListBox?.y ?? 0) - (beforeListBox?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((afterListBox?.width ?? 0) - (beforeListBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((afterListBox?.height ?? 0) - (beforeListBox?.height ?? 0))).toBeLessThanOrEqual(1);

  if (process.env.PLAYWRIGHT_CAPTURE_CLASSIC_PLAYBACK === "1") {
    await classicDocument.screenshot({
      path: "test-results/classic-reader-playback-after.png",
    });
  }

  await page.getByRole("button", { name: /^Pause$/i }).click();
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

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const appUrl = process.env.LEYENDO_APP_URL ?? "http://127.0.0.1:3000";
const dataDir = path.resolve(process.cwd(), "data");
const outputDir = path.resolve(process.cwd(), "test-results");
const outputPath = path.join(outputDir, "pdf-library-validation.json");
const extractionTimeoutMs = 240_000;
const openTimeoutMs = 180_000;
const fileFilters = process.argv.slice(2).map((value) => value.toLowerCase());

function nowIso() {
  return new Date().toISOString();
}

function truncate(text, length = 220) {
  if (!text) {
    return "";
  }

  return text.length > length ? `${text.slice(0, length)}...` : text;
}

async function waitForExtractionResult(page, timeoutMs) {
  const handle = await page.waitForFunction(() => {
    const alert = document.querySelector('[role="alert"]');
    if (alert?.textContent?.trim()) {
      return {
        kind: "alert",
        text: alert.textContent.trim(),
      };
    }

    const buttons = Array.from(document.querySelectorAll("button"));
    const openImportedButton = buttons.find((button) => {
      const text = button.textContent?.trim() ?? "";
      return /open imported file|abrir archivo importado|abrir arquivo importado/i.test(text);
    });

    if (openImportedButton) {
      const statusText =
        document.querySelector('[role="status"]')?.textContent?.trim() ?? "";
      return {
        kind: "ready",
        text: statusText || openImportedButton.textContent?.trim() || "ready",
      };
    }

    return false;
  }, { timeout: timeoutMs });

  return handle.jsonValue();
}

async function waitForReaderOpen(page, timeoutMs) {
  const handle = await page.waitForFunction(() => {
    const alert = document.querySelector('[role="alert"]');
    if (alert?.textContent?.trim()) {
      return {
        kind: "alert",
        text: alert.textContent.trim(),
      };
    }

    const isReaderRoute = window.location.pathname === "/reader";
    const bodyText = document.body?.innerText ?? "";
    const looksLikeReaderWorkspace =
      /reader canvas/i.test(bodyText) && /highlights and bookmarks/i.test(bodyText);

    if (isReaderRoute && looksLikeReaderWorkspace) {
      const title =
        document.querySelector("main h1, main h2")?.textContent?.trim() ?? "";
      return {
        kind: "reader",
        text: title,
        url: window.location.href,
      };
    }

    return false;
  }, { timeout: timeoutMs });

  return handle.jsonValue();
}

async function collectPreviewData(page) {
  return page.evaluate(() => {
    const textarea = document.querySelector('#document-content');
    const value = textarea instanceof HTMLTextAreaElement ? textarea.value : "";

    return {
      charCount: value.length,
      imagePlaceholderCount: (value.match(/\[Image omitted from PDF\]/g) ?? []).length,
      previewSample: value.slice(0, 400),
    };
  });
}

async function collectUiState(page) {
  return page.evaluate(() => {
    const statusTexts = Array.from(document.querySelectorAll('[role="status"]')).map(
      (node) => node.textContent?.trim() ?? "",
    );
    const alertText = document.querySelector('[role="alert"]')?.textContent?.trim() ?? null;

    return {
      alertText,
      bodyText: document.body?.innerText?.slice(0, 800) ?? "",
      statusTexts,
      title: document.title,
      url: window.location.href,
    };
  });
}

async function validatePdf(browser, fileName) {
  const filePath = path.join(dataDir, fileName);
  const context = await browser.newContext();
  const page = await context.newPage();
  const startedAt = Date.now();
  let stage = "bootstrap";
  const consoleErrors = [];
  const pageErrors = [];

  page.setDefaultTimeout(Math.max(extractionTimeoutMs, openTimeoutMs));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    stage = "goto-home";
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    stage = "select-upload-mode";
    await page.getByRole("radio", { name: /upload a document/i }).click();
    stage = "attach-file";
    await page
      .getByLabel(/choose a pdf, docx, rtf, markdown, or text file/i)
      .setInputFiles(filePath);

    stage = "wait-for-extraction";
    const extraction = await waitForExtractionResult(page, extractionTimeoutMs);
    stage = "collect-preview";
    const preview = await collectPreviewData(page);

    const result = {
      fileName,
      status: "unknown",
      extraction: {
        outcome: extraction.kind,
        message: extraction.text,
      },
      preview: {
        charCount: preview.charCount,
        imagePlaceholderCount: preview.imagePlaceholderCount,
        sample: truncate(preview.previewSample),
      },
      open: null,
      durationMs: Date.now() - startedAt,
      testedAt: nowIso(),
    };

    if (extraction.kind !== "ready") {
      result.status = "selection-failed";
      result.consoleErrors = consoleErrors;
      result.pageErrors = pageErrors;
      result.uiState = await collectUiState(page);
      return result;
    }

    const openImportedButton = page.getByRole("button", {
      name: /open imported file/i,
    });
    const genericOpenButton = page.getByRole("button", {
      name: /^open in reader$/i,
    });

    stage = "open-reader";
    if (await openImportedButton.count()) {
      await openImportedButton.click();
    } else {
      await genericOpenButton.click();
    }

    stage = "wait-for-reader";
    const openResult = await waitForReaderOpen(page, openTimeoutMs);
    result.open = {
      outcome: openResult.kind,
      message: openResult.text,
      url: openResult.url ?? null,
    };
    result.durationMs = Date.now() - startedAt;
    result.status = openResult.kind === "reader" ? "passed" : "open-failed";

    return result;
  } catch (error) {
    return {
      fileName,
      status: "script-error",
      extraction: null,
      preview: null,
      open: null,
      durationMs: Date.now() - startedAt,
      testedAt: nowIso(),
      stage,
      error: error instanceof Error ? error.message : String(error),
      consoleErrors,
      pageErrors,
      uiState: await collectUiState(page),
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const entries = await readdir(dataDir, { withFileTypes: true });
  const pdfs = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name)
    .filter((name) =>
      fileFilters.length === 0
        ? true
        : fileFilters.some((filter) => name.toLowerCase().includes(filter)),
    )
    .sort((left, right) => left.localeCompare(right));

  if (pdfs.length === 0) {
    throw new Error(`No PDFs found in ${dataDir}`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const results = [];

    for (const fileName of pdfs) {
      console.log(`Testing ${fileName}`);
      results.push(await validatePdf(browser, fileName));
    }

    const summary = {
      appUrl,
      generatedAt: nowIso(),
      totals: {
        pdfCount: results.length,
        passed: results.filter((result) => result.status === "passed").length,
        selectionFailed: results.filter((result) => result.status === "selection-failed").length,
        openFailed: results.filter((result) => result.status === "open-failed").length,
        scriptError: results.filter((result) => result.status === "script-error").length,
      },
      results,
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
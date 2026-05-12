import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const appUrl = process.env.LEYENDO_APP_URL ?? "http://127.0.0.1:3000";
const dataDirFlag = process.argv.find((value) =>
  value.startsWith("--data-dir="),
);
const outputFlag = process.argv.find((value) => value.startsWith("--output="));
const startAfterFlag = process.argv.find((value) =>
  value.startsWith("--start-after="),
);
const timeoutFlag = process.argv.find((value) =>
  value.startsWith("--timeout-ms="),
);
const dataDir = path.resolve(
  process.cwd(),
  dataDirFlag ? dataDirFlag.slice("--data-dir=".length) : "data",
);
const outputDir = path.resolve(process.cwd(), "test-results");
const outputPath = outputFlag
  ? path.resolve(process.cwd(), outputFlag.slice("--output=".length))
  : path.join(outputDir, "pdf-preview-scan.json");
const extractionTimeoutMs = timeoutFlag
  ? Number(timeoutFlag.slice("--timeout-ms=".length))
  : 240_000;
const fileFilters = process.argv
  .slice(2)
  .filter((value) => !value.startsWith("--"))
  .map((value) => value.toLowerCase());
const startAfterFileName = startAfterFlag
  ? startAfterFlag.slice("--start-after=".length).toLowerCase()
  : null;

function nowIso() {
  return new Date().toISOString();
}

function truncate(text, length = 220) {
  if (!text) {
    return "";
  }

  return text.length > length ? `${text.slice(0, length)}...` : text;
}

async function writeScanSummary(nextOutputPath, input) {
  const summary = {
    appUrl,
    dataDir,
    generatedAt: nowIso(),
    mode: "preview-only",
    totals: {
      pdfCount: input.totalPdfCount,
      processed: input.results.length,
      remaining: Math.max(input.totalPdfCount - input.results.length, 0),
      passed: input.results.filter((result) => result.status === "passed")
        .length,
      selectionFailed: input.results.filter(
        (result) => result.status === "selection-failed",
      ).length,
      scriptError: input.results.filter(
        (result) => result.status === "script-error",
      ).length,
    },
    results: input.results,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(nextOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}

async function loadExistingScanResults(existingOutputPath) {
  try {
    const raw = await readFile(existingOutputPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed?.results)) {
      return [];
    }

    return parsed.results;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function waitForExtractionResult(page, timeoutMs) {
  const handle = await page.waitForFunction(
    () => {
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
        return /open imported file|abrir archivo importado|abrir arquivo importado/i.test(
          text,
        );
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
    },
    { timeout: timeoutMs },
  );

  return handle.jsonValue();
}

async function collectPreviewData(page) {
  return page.evaluate(() => {
    const textarea = document.querySelector("#document-content");
    const value = textarea instanceof HTMLTextAreaElement ? textarea.value : "";

    return {
      charCount: value.length,
      imagePlaceholderCount: (value.match(/\[Image omitted from PDF\]/g) ?? [])
        .length,
      previewSample: value.slice(0, 400),
    };
  });
}

async function collectUiState(page) {
  return page.evaluate(() => {
    const statusTexts = Array.from(
      document.querySelectorAll('[role="status"]'),
    ).map((node) => node.textContent?.trim() ?? "");
    const alertText =
      document.querySelector('[role="alert"]')?.textContent?.trim() ?? null;

    return {
      alertText,
      bodyText: document.body?.innerText?.slice(0, 800) ?? "",
      statusTexts,
      title: document.title,
      url: window.location.href,
    };
  });
}

async function validatePdfPreview(browser, fileName) {
  const filePath = path.join(dataDir, fileName);
  const context = await browser.newContext();
  const page = await context.newPage();
  const startedAt = Date.now();
  let stage = "bootstrap";
  const consoleErrors = [];
  const pageErrors = [];

  page.setDefaultTimeout(extractionTimeoutMs);
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

    return {
      consoleErrors,
      durationMs: Date.now() - startedAt,
      extraction: {
        outcome: extraction.kind,
        message: extraction.text,
      },
      fileName,
      pageErrors,
      preview: {
        charCount: preview.charCount,
        imagePlaceholderCount: preview.imagePlaceholderCount,
        sample: truncate(preview.previewSample),
      },
      status: extraction.kind === "ready" ? "passed" : "selection-failed",
      testedAt: nowIso(),
      uiState:
        extraction.kind === "ready" ? undefined : await collectUiState(page),
    };
  } catch (error) {
    return {
      consoleErrors,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      extraction: null,
      fileName,
      pageErrors,
      preview: null,
      stage,
      status: "script-error",
      testedAt: nowIso(),
      uiState: await collectUiState(page),
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const entries = await readdir(dataDir, { withFileTypes: true });
  const pdfs = entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"),
    )
    .map((entry) => entry.name)
    .filter((name) =>
      fileFilters.length === 0
        ? true
        : fileFilters.some((filter) => name.toLowerCase().includes(filter)),
    )
    .sort((left, right) => left.localeCompare(right))
    .filter((name) => {
      if (!startAfterFileName) {
        return true;
      }

      return name.toLowerCase().localeCompare(startAfterFileName) > 0;
    });

  if (pdfs.length === 0) {
    throw new Error(`No PDFs found in ${dataDir}`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const results = await loadExistingScanResults(outputPath);
    const processedFileNames = new Set(
      results
        .map((result) => result?.fileName)
        .filter((value) => typeof value === "string" && value.length > 0),
    );

    for (const fileName of pdfs) {
      if (processedFileNames.has(fileName)) {
        continue;
      }

      console.log(`Testing ${fileName}`);
      const result = await validatePdfPreview(browser, fileName);
      results.push(result);
      processedFileNames.add(fileName);

      await writeScanSummary(outputPath, {
        results,
        totalPdfCount: pdfs.length,
      });
    }

    const summary = await writeScanSummary(outputPath, {
      results,
      totalPdfCount: pdfs.length,
    });

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? (error.stack ?? error.message) : error,
  );
  process.exitCode = 1;
});
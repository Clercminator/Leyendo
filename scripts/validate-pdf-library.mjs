import { gzipSync } from "node:zlib";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const appUrl = process.env.LEYENDO_APP_URL ?? "http://127.0.0.1:3000";
const dataDirFlag = process.argv.find((value) =>
  value.startsWith("--data-dir="),
);
const outputFlag = process.argv.find((value) => value.startsWith("--output="));
const sampleFlag = process.argv.find((value) => value.startsWith("--sample="));
const shouldPublish = process.argv.includes("--publish");
const outputDir = path.resolve(process.cwd(), "test-results");
const knownSamples = {
  "how-to-sell": {
    dataDir: path.resolve(process.cwd(), "data"),
    defaultOutputPath: path.join(outputDir, "how-to-sell-scan.json"),
    fileName: "How To Sell Your Way Through Life. ( PDFDrive ).pdf",
    label: "How To Sell Your Way Through Life sample",
  },
  "corfo-legal": {
    dataDir: path.resolve(process.cwd(), "data", "legal files"),
    defaultOutputPath: path.join(outputDir, "corfo-legal-scan.json"),
    fileName:
      "RE N°1457 de 2025 de Corfo - Bases BIG 12 Start-Up Chile.pdf",
    label: "CORFO legal basis sample",
  },
};
const requestedSampleId = sampleFlag?.slice("--sample=".length);
const requestedSample = requestedSampleId
  ? knownSamples[requestedSampleId]
  : undefined;

if (requestedSampleId && !requestedSample) {
  throw new Error(`Unknown PDF scan sample: ${requestedSampleId}`);
}

const dataDir = requestedSample?.dataDir
  ? requestedSample.dataDir
  : path.resolve(
      process.cwd(),
      dataDirFlag ? dataDirFlag.slice("--data-dir=".length) : "data",
    );
const outputPath = outputFlag
  ? path.resolve(process.cwd(), outputFlag.slice("--output=".length))
  : requestedSample?.defaultOutputPath ??
    path.join(outputDir, "catalog-import-scan.json");
const extractionTimeoutMs = 240_000;
const openTimeoutMs = 180_000;
const fileFilters = process.argv
  .slice(2)
  .filter((value) => !value.startsWith("--"))
  .map((value) => value.toLowerCase());
const shouldResetOutput = process.argv.includes("--fresh") || Boolean(requestedSample);
const catalogWordsPerMinute = 220;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function slugifyCatalogTitle(value) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized.length > 0 ? normalized : "catalog-book";
}

function toCatalogDocumentId(catalogBookId) {
  return `catalog:${catalogBookId}`;
}

function toCatalogPayloadPath(slug) {
  return `catalog/${slug}.json.gz`;
}

function estimateCatalogReadingMinutes(tokenCount) {
  if (tokenCount <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(tokenCount / catalogWordsPerMinute));
}

function normalizeCatalogPayloadForPublish(payload, input) {
  return {
    ...payload,
    id: input.documentId,
    title: input.title?.trim() || payload.title,
    updatedAt: input.updatedAt ?? payload.updatedAt,
  };
}

function createSupabaseAdminClient() {
  if (!supabaseUrl.trim() || !supabaseServiceRoleKey.trim()) {
    throw new Error(
      "Publishing requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function nowIso() {
  return new Date().toISOString();
}

async function writeScanSummary(outputPath, input) {
  const summary = {
    appUrl,
    dataDir,
    generatedAt: nowIso(),
    mode: shouldPublish ? "scan-and-publish" : "scan-only",
    sample: requestedSample
      ? {
          fileName: requestedSample.fileName,
          id: requestedSampleId,
          label: requestedSample.label,
        }
      : null,
    totals: {
      pdfCount: input.totalPdfCount,
      processed: input.results.length,
      remaining: Math.max(input.totalPdfCount - input.results.length, 0),
      catalogReady: input.results.filter(
        (result) => result.catalogDecision === "catalog-ready",
      ).length,
      excluded: input.results.filter(
        (result) => result.catalogDecision === "excluded",
      ).length,
      openFailed: input.results.filter(
        (result) => result.status === "open-failed",
      ).length,
      published: input.results.filter(
        (result) => result.catalogDecision === "published",
      ).length,
      publishFailed: input.results.filter(
        (result) => result.catalogDecision === "publish-failed",
      ).length,
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
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

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

function truncate(text, length = 220) {
  if (!text) {
    return "";
  }

  return text.length > length ? `${text.slice(0, length)}...` : text;
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

async function waitForReaderOpen(page, timeoutMs) {
  const handle = await page.waitForFunction(
    () => {
      const alert = document.querySelector('[role="alert"]');
      if (alert?.textContent?.trim()) {
        return {
          kind: "alert",
          text: alert.textContent.trim(),
        };
      }

      const isReaderRoute = window.location.pathname === "/reader";
      const bodyText = document.body?.innerText ?? "";
      const looksLikePdfReader =
        /(pdf estándar|pdf standard|standard pdf)/i.test(bodyText) &&
        /(search in the document|buscar en el documento|buscar no documento)/i.test(
          bodyText,
        );
      const looksLikeClassicPdfReader =
        /(classic reader|lector clásico|leitor clássico)/i.test(bodyText) &&
        (/(search in the document|buscar en el documento|buscar no documento)/i.test(
          bodyText,
        ) ||
          /(reader canvas|lienzo del lector|canvas do leitor)/i.test(bodyText));
      const looksLikeTextReader =
        /(reader canvas|lienzo del lector|canvas do leitor)/i.test(bodyText) &&
        /(highlights and bookmarks|destacados y marcadores|destaques e marcadores)/i.test(
          bodyText,
        );
      const looksLikeReaderWorkspace =
        looksLikePdfReader || looksLikeClassicPdfReader || looksLikeTextReader;

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

async function collectDocumentRecord(page) {
  return page.evaluate(async () => {
    const url = new URL(window.location.href);
    const documentId = url.searchParams.get("document");

    if (!documentId) {
      return null;
    }

    const record = await new Promise((resolve, reject) => {
      const request = indexedDB.open("lee-reader-db");

      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB could not be opened."));
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("documents", "readonly");
        const store = transaction.objectStore("documents");
        const getRequest = store.get(documentId);

        getRequest.onerror = () => {
          reject(
            getRequest.error ?? new Error("Document record could not be read."),
          );
        };

        getRequest.onsuccess = () => {
          resolve(getRequest.result ?? null);
        };
      };
    });

    return {
      documentId,
      record,
    };
  });
}

async function publishCatalogDocument(supabase, input) {
  const title =
    input.record.title?.trim() || input.fileName.replace(/\.[^.]+$/u, "");
  const slug = slugifyCatalogTitle(title);
  const payloadPath = toCatalogPayloadPath(slug);
  const now = nowIso();
  const { data: existingRow, error: existingRowError } = await supabase
    .from("catalog_books")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingRowError) {
    throw existingRowError;
  }

  const catalogBookId = existingRow?.id ?? crypto.randomUUID();
  const documentId = toCatalogDocumentId(catalogBookId);
  const payload = normalizeCatalogPayloadForPublish(input.record.payload, {
    documentId,
    title,
    updatedAt: now,
  });
  const payloadJson = JSON.stringify(payload);
  const payloadBuffer = gzipSync(payloadJson);

  const { error: uploadError } = await supabase.storage
    .from("catalog-payloads")
    .upload(payloadPath, payloadBuffer, {
      contentType: "application/gzip",
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const excerpt = payload.excerpt.trim().slice(0, 280);
  const { data, error } = await supabase
    .from("catalog_books")
    .upsert(
      {
        excerpt,
        id: catalogBookId,
        is_published: true,
        payload_bytes: payloadBuffer.byteLength,
        payload_path: payloadPath,
        slug,
        source_kind: payload.sourceKind,
        title,
        total_chunks: payload.chunks.length,
        total_sections: payload.sections.length,
        estimated_reading_minutes: estimateCatalogReadingMinutes(
          payload.tokens.length,
        ),
        updated_at: now,
      },
      { onConflict: "slug" },
    )
    .select("id,slug,title")
    .single();

  if (error || !data) {
    throw error ?? new Error("Catalog row could not be saved.");
  }

  return {
    catalogBookId: data.id,
    slug: data.slug,
    title: data.title,
    updatedExisting: Boolean(existingRow?.id),
  };
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
      catalogDecision: "excluded",
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

    if (result.status === "passed") {
      const documentRecord = await collectDocumentRecord(page);
      const payload = documentRecord?.record?.payload;

      if (payload) {
        result.catalogDecision = "catalog-ready";
        result.document = {
          documentId: documentRecord.documentId,
          estimatedReadingMinutes: estimateCatalogReadingMinutes(
            Array.isArray(payload.tokens) ? payload.tokens.length : 0,
          ),
          excerpt: truncate(payload.excerpt ?? ""),
          payloadBytes: Buffer.byteLength(JSON.stringify(payload), "utf8"),
          title: payload.title,
          tokenCount: Array.isArray(payload.tokens) ? payload.tokens.length : 0,
          totalChunks: Array.isArray(payload.chunks)
            ? payload.chunks.length
            : 0,
          totalSections: Array.isArray(payload.sections)
            ? payload.sections.length
            : 0,
        };

        result.documentRecord = documentRecord.record;
      } else {
        result.status = "script-error";
        result.catalogDecision = "excluded";
        result.error =
          "The imported document payload was not found in IndexedDB.";
      }
    }

    return result;
  } catch (error) {
    return {
      catalogDecision: "excluded",
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
  const pdfs = requestedSample
    ? [requestedSample.fileName]
    : (await readdir(dataDir, { withFileTypes: true }))
        .filter(
          (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"),
        )
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
  const supabase = shouldPublish ? createSupabaseAdminClient() : null;

  try {
    const results = shouldResetOutput
      ? []
      : await loadExistingScanResults(outputPath);
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
      const result = await validatePdf(browser, fileName);

      if (
        shouldPublish &&
        result.catalogDecision === "catalog-ready" &&
        result.documentRecord?.payload
      ) {
        try {
          result.publish = await publishCatalogDocument(supabase, {
            fileName,
            record: result.documentRecord,
          });
          result.catalogDecision = "published";
        } catch (error) {
          result.catalogDecision = "publish-failed";
          result.publishError =
            error instanceof Error
              ? error.message
              : JSON.stringify(error, null, 2);
        }
      }

      delete result.documentRecord;
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

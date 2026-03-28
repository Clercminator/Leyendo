import { describe, expect, it } from "vitest";

import { clearPerfMetrics, getPerfMetrics } from "@/lib/perf/instrumentation";
import {
  extractDocumentFromFileAsync,
  isPdfTooLargeForBrowser,
  MAX_BROWSER_PDF_BYTES,
  PDF_EXTRACTION_WORKER_THRESHOLD_BYTES,
  shouldOffloadPdfExtraction,
} from "@/features/ingest/extract/file-text-client";

describe("document extraction client", () => {
  it("keeps smaller PDFs on the main thread", () => {
    const file = new File([new Uint8Array(256)], "sample.pdf", {
      type: "application/pdf",
    });

    expect(shouldOffloadPdfExtraction(file)).toBe(false);
  });

  it("offloads larger PDFs once the threshold is crossed", () => {
    const file = new File(
      [new Uint8Array(PDF_EXTRACTION_WORKER_THRESHOLD_BYTES)],
      "large.pdf",
      {
        type: "application/pdf",
      },
    );

    expect(shouldOffloadPdfExtraction(file)).toBe(true);
  });

  it("flags oversized PDFs before browser extraction starts", () => {
    const file = new File([new Uint8Array(1)], "huge.pdf", {
      type: "application/pdf",
    });

    Object.defineProperty(file, "size", {
      configurable: true,
      value: MAX_BROWSER_PDF_BYTES + 1,
    });

    expect(isPdfTooLargeForBrowser(file)).toBe(true);
  });

  it("records extraction timing metrics", async () => {
    clearPerfMetrics();

    const file = new File(["Hello from text import."], "notes.txt", {
      type: "text/plain",
    });

    const result = await extractDocumentFromFileAsync(file);

    expect(result.processingMode).toBe("main-thread");
    expect(result.payload.rawText).toBe("Hello from text import.");
    expect(
      getPerfMetrics().some((metric) => metric.name === "import.extract"),
    ).toBe(true);
  });
});

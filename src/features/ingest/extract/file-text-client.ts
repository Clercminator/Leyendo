import { measureAsync } from "@/lib/perf/instrumentation";

import {
  extractDocumentFromFile,
  extractPdfDocumentFromArrayBuffer,
  type ExtractedDocumentPayload,
} from "@/features/ingest/extract/file-text";

export const PDF_EXTRACTION_WORKER_THRESHOLD_BYTES = 1_500_000;
export const MAX_BROWSER_PDF_BYTES = 75_000_000;
export const PDF_EXTRACTION_TIMEOUT_MS = 250_000;

export interface DocumentExtractionResult {
  payload: ExtractedDocumentPayload;
  processingMode: "main-thread" | "worker";
}

export function shouldOffloadPdfExtraction(file: File) {
  return (
    isPdfFile(file) &&
    file.size >= PDF_EXTRACTION_WORKER_THRESHOLD_BYTES
  );
}

export function isPdfFile(file: Pick<File, "name" | "type">) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

export function isPdfTooLargeForBrowser(file: Pick<File, "name" | "size" | "type">) {
  return isPdfFile(file) && file.size > MAX_BROWSER_PDF_BYTES;
}

export async function extractDocumentFromFileAsync(
  file: File,
): Promise<DocumentExtractionResult> {
  if (!shouldOffloadPdfExtraction(file) || typeof Worker === "undefined") {
    const payload = await measureAsync(
      "import.extract",
      {
        sourceKind: file.type || "unknown",
        fileSize: file.size,
        processingMode: "main-thread",
      },
      () => extractDocumentFromFile(file),
    );

    return {
      payload,
      processingMode: "main-thread",
    };
  }

  const payload = await measureAsync(
    "import.extract",
    {
      sourceKind: "pdf",
      fileSize: file.size,
      processingMode: "worker",
    },
    async () => {
      const arrayBuffer = await file.arrayBuffer();

      return new Promise<ExtractedDocumentPayload>((resolve, reject) => {
        const worker = new Worker(
          new URL("./file-text.worker.ts", import.meta.url),
          { type: "module" },
        );
        const timeoutId = window.setTimeout(() => {
          worker.terminate();
          reject(
            new Error(
              "This PDF is taking too long to process in the browser. Try a smaller PDF or split the file into sections.",
            ),
          );
        }, PDF_EXTRACTION_TIMEOUT_MS);

        const clearTimeoutIfPending = () => {
          window.clearTimeout(timeoutId);
        };

        worker.onmessage = (
          event: MessageEvent<
            | {
                ok: true;
                rawText: string;
                sourceBlocks?: ExtractedDocumentPayload["sourceBlocks"];
              }
            | { ok: false; message: string }
          >,
        ) => {
          clearTimeoutIfPending();
          worker.terminate();

          if (!event.data.ok) {
            reject(new Error(event.data.message));
            return;
          }

          resolve({
            sourceBlocks: event.data.sourceBlocks,
            sourceKind: "pdf",
            rawText: event.data.rawText,
            title: file.name.replace(/\.[^.]+$/u, ""),
          });
        };

        worker.onerror = async () => {
          clearTimeoutIfPending();
          worker.terminate();

          try {
            const { rawText, sourceBlocks } =
              await extractPdfDocumentFromArrayBuffer(arrayBuffer);
            resolve({
              sourceBlocks,
              sourceKind: "pdf",
              rawText,
              title: file.name.replace(/\.[^.]+$/u, ""),
            });
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new Error("Something went wrong while extracting that PDF."),
            );
          }
        };

        worker.postMessage({ arrayBuffer }, [arrayBuffer]);
      });
    },
  );

  return {
    payload,
    processingMode: "worker",
  };
}

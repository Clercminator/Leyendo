import { measureAsync } from "@/lib/perf/instrumentation";

import {
  extractDocumentFromFile,
  type ExtractedDocumentPayload,
} from "@/features/ingest/extract/file-text";
import {
  extractPdfDocumentFromArrayBuffer,
  type PdfExtractionProgress,
} from "@/features/ingest/extract/file-text-pdf";

export const PDF_EXTRACTION_WORKER_THRESHOLD_BYTES = 150_000_000;
export const MAX_BROWSER_PDF_BYTES = 150_000_000;
export const PDF_EXTRACTION_TIMEOUT_MS = 420_000;

type PdfWorkerResponse =
  | {
      type: "success";
      rawText: string;
      sourceBlocks?: ExtractedDocumentPayload["sourceBlocks"];
    }
  | ({ type: "progress" } & PdfExtractionProgress)
  | { type: "error"; message: string };

export interface DocumentExtractionResult {
  payload: ExtractedDocumentPayload;
  processingMode: "main-thread" | "worker";
}

export interface DocumentExtractionOptions {
  onPdfProgress?: (progress: PdfExtractionProgress) => void;
}

function createPdfPayload(args: {
  file: Pick<File, "name">;
  rawText: string;
  sourceBlocks?: ExtractedDocumentPayload["sourceBlocks"];
}) {
  return {
    sourceBlocks: args.sourceBlocks,
    sourceKind: "pdf" as const,
    rawText: args.rawText,
    title: args.file.name.replace(/\.[^.]+$/u, ""),
  } satisfies ExtractedDocumentPayload;
}

function createPdfExtractionError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (message) {
      return error;
    }

    if (error.name && error.name !== "Error") {
      return new Error(error.name);
    }
  }

  if (typeof error === "string" && error.trim()) {
    return new Error(error.trim());
  }

  return new Error("Something went wrong while extracting that PDF.");
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
  options: DocumentExtractionOptions = {},
): Promise<DocumentExtractionResult> {
  if (!shouldOffloadPdfExtraction(file) || typeof Worker === "undefined") {
    const payload = await measureAsync(
      "import.extract",
      {
        sourceKind: file.type || "unknown",
        fileSize: file.size,
        processingMode: "main-thread",
      },
      () =>
        extractDocumentFromFile(file, {
          onPdfProgress: options.onPdfProgress,
        }),
    );

    return {
      payload,
      processingMode: "main-thread",
    };
  }

  let processingMode: "main-thread" | "worker" = "worker";

  const payload = await measureAsync(
    "import.extract",
    {
      sourceKind: "pdf",
      fileSize: file.size,
      processingMode: "worker",
    },
    async () => {
      const extractPdfOnMainThread = async () => {
        const { rawText, sourceBlocks } = await extractPdfDocumentFromArrayBuffer(
          await file.arrayBuffer(),
          {
            onProgress: options.onPdfProgress,
          },
        );

        processingMode = "main-thread";
        return createPdfPayload({
          file,
          rawText,
          sourceBlocks,
        });
      };

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

        worker.onmessage = async (
          event: MessageEvent<PdfWorkerResponse>,
        ) => {
          if (event.data.type === "progress") {
            options.onPdfProgress?.({
              pageCount: event.data.pageCount,
              processedPages: event.data.processedPages,
            });
            return;
          }

          clearTimeoutIfPending();
          worker.terminate();

          if (event.data.type === "error") {
            try {
              resolve(await extractPdfOnMainThread());
            } catch (error) {
              const extractionError = createPdfExtractionError(error);
              reject(
                extractionError.message ===
                  "Something went wrong while extracting that PDF."
                  ? new Error(event.data.message)
                  : extractionError,
              );
            }
            return;
          }

          resolve(
            createPdfPayload({
              file,
              rawText: event.data.rawText,
              sourceBlocks: event.data.sourceBlocks,
            }),
          );
        };

        worker.onerror = async (event) => {
          clearTimeoutIfPending();
          worker.terminate();

          const workerBootstrapError =
            event.message.trim().length > 0
              ? new Error(event.message)
              : new Error("The PDF extraction worker failed to start.");

          try {
            resolve(await extractPdfOnMainThread());
          } catch (error) {
            const extractionError = createPdfExtractionError(error);
            reject(
              extractionError.message ===
                "Something went wrong while extracting that PDF."
                ? workerBootstrapError
                : extractionError,
            );
          }
        };

        worker.postMessage({ arrayBuffer }, [arrayBuffer]);
      });
    },
  );

  return {
    payload,
    processingMode,
  };
}

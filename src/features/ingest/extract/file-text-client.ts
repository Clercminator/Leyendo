import { measureAsync } from "@/lib/perf/instrumentation";

import {
  extractDocumentFromFile,
  extractPdfTextFromArrayBuffer,
  type ExtractedDocumentPayload,
} from "@/features/ingest/extract/file-text";

export const PDF_EXTRACTION_WORKER_THRESHOLD_BYTES = 1_500_000;

export interface DocumentExtractionResult {
  payload: ExtractedDocumentPayload;
  processingMode: "main-thread" | "worker";
}

export function shouldOffloadPdfExtraction(file: File) {
  return (
    file.type === "application/pdf" &&
    file.size >= PDF_EXTRACTION_WORKER_THRESHOLD_BYTES
  );
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

        worker.onmessage = (
          event: MessageEvent<
            { ok: true; rawText: string } | { ok: false; message: string }
          >,
        ) => {
          worker.terminate();

          if (!event.data.ok) {
            reject(new Error(event.data.message));
            return;
          }

          resolve({
            sourceKind: "pdf",
            rawText: event.data.rawText,
            title: file.name.replace(/\.[^.]+$/u, ""),
          });
        };

        worker.onerror = async () => {
          worker.terminate();

          try {
            const rawText = await extractPdfTextFromArrayBuffer(arrayBuffer);
            resolve({
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

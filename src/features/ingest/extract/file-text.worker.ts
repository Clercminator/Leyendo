/// <reference lib="webworker" />

import {
  extractPdfDocumentFromArrayBuffer,
  type PdfExtractionProgress,
} from "@/features/ingest/extract/file-text-pdf";
import type { ExtractedDocumentPayload } from "@/features/ingest/extract/file-text";

declare const self: DedicatedWorkerGlobalScope;

type PdfWorkerResponse =
  | ({ type: "success" } & Pick<ExtractedDocumentPayload, "rawText" | "sourceBlocks">)
  | ({ type: "progress" } & PdfExtractionProgress)
  | { type: "error"; message: string };

function getWorkerErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (message) {
      return message;
    }

    if (error.name && error.name !== "Error") {
      return error.name;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return "Something went wrong while extracting that PDF.";
}

self.onmessage = async (event: MessageEvent<{ arrayBuffer: ArrayBuffer }>) => {
  try {
    const extracted = await extractPdfDocumentFromArrayBuffer(
      event.data.arrayBuffer,
      {
        onProgress: (progress) => {
          self.postMessage({
            type: "progress",
            ...progress,
          } satisfies PdfWorkerResponse);
        },
      },
    );
    self.postMessage({
      type: "success",
      rawText: extracted.rawText,
      sourceBlocks: extracted.sourceBlocks,
    } satisfies PdfWorkerResponse);
  } catch (error) {
    self.postMessage({
      type: "error",
      message: getWorkerErrorMessage(error),
    } satisfies PdfWorkerResponse);
  }
};

export {};

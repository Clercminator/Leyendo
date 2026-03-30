/// <reference lib="webworker" />

import { extractPdfDocumentFromArrayBuffer } from "@/features/ingest/extract/file-text";

declare const self: DedicatedWorkerGlobalScope;

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
    );
    self.postMessage({
      ok: true,
      rawText: extracted.rawText,
      sourceBlocks: extracted.sourceBlocks,
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      message: getWorkerErrorMessage(error),
    });
  }
};

export {};

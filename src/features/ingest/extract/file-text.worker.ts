/// <reference lib="webworker" />

import { extractPdfDocumentFromArrayBuffer } from "@/features/ingest/extract/file-text";

declare const self: DedicatedWorkerGlobalScope;

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
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while extracting that PDF.",
    });
  }
};

export {};

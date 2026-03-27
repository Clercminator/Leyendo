/// <reference lib="webworker" />

import { extractPdfTextFromArrayBuffer } from "@/features/ingest/extract/file-text";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<{ arrayBuffer: ArrayBuffer }>) => {
  try {
    const rawText = await extractPdfTextFromArrayBuffer(event.data.arrayBuffer);
    self.postMessage({ ok: true, rawText });
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

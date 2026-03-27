/// <reference lib="webworker" />

import {
  buildDocumentModel,
  type BuildDocumentModelInput,
} from "@/features/ingest/build/document-model";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<BuildDocumentModelInput>) => {
  try {
    const document = buildDocumentModel(event.data);
    self.postMessage({ ok: true, document });
  } catch (error) {
    self.postMessage({
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while building the document model.",
    });
  }
};

export {};

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildDocumentModelAsync,
  DOCUMENT_MODEL_WORKER_TIMEOUT_MS,
  DOCUMENT_MODEL_WORKER_THRESHOLD,
  shouldOffloadDocumentBuild,
} from "@/features/ingest/build/document-model-client";

describe("document model worker thresholds", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps smaller documents on the main thread", () => {
    expect(shouldOffloadDocumentBuild("short note")).toBe(false);
  });

  it("offloads large documents once they cross the threshold", () => {
    expect(
      shouldOffloadDocumentBuild("a".repeat(DOCUMENT_MODEL_WORKER_THRESHOLD)),
    ).toBe(true);
  });

  it("rejects large document builds that never return from the worker", async () => {
    vi.useFakeTimers();

    class SilentWorker {
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      postMessage() {}

      terminate() {}
    }

    vi.stubGlobal("Worker", SilentWorker);

    const buildPromise = buildDocumentModelAsync({
      title: "Large PDF",
      rawText: "a".repeat(DOCUMENT_MODEL_WORKER_THRESHOLD),
      sourceKind: "pdf",
    });
    const rejection = expect(buildPromise).rejects.toThrow(
      /preparing it for the reader is taking too long/i,
    );

    await vi.advanceTimersByTimeAsync(DOCUMENT_MODEL_WORKER_TIMEOUT_MS + 1);

    await rejection;
  });
});

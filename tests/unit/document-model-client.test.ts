import { describe, expect, it } from "vitest";

import {
  DOCUMENT_MODEL_WORKER_THRESHOLD,
  shouldOffloadDocumentBuild,
} from "@/features/ingest/build/document-model-client";

describe("document model worker thresholds", () => {
  it("keeps smaller documents on the main thread", () => {
    expect(shouldOffloadDocumentBuild("short note")).toBe(false);
  });

  it("offloads large documents once they cross the threshold", () => {
    expect(
      shouldOffloadDocumentBuild("a".repeat(DOCUMENT_MODEL_WORKER_THRESHOLD)),
    ).toBe(true);
  });
});

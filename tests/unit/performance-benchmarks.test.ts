import { describe, expect, it } from "vitest";

import { buildDocumentModelAsync } from "@/features/ingest/build/document-model-client";
import { deriveRuntimeChunks } from "@/features/reader/engine/navigation";
import {
  deriveChunkDurationMs,
  derivePlaybackDriftMs,
} from "@/features/reader/engine/timing";
import { clearPerfMetrics, getPerfMetrics } from "@/lib/perf/instrumentation";
import { defaultReaderPreferences } from "@/types/reader";

import { createLargeDocumentText } from "../fixtures/large-document";

describe("performance benchmark fixtures", () => {
  it("records build and runtime chunk timings for a large synthetic document", async () => {
    clearPerfMetrics();

    const rawText = createLargeDocumentText();
    const { document } = await buildDocumentModelAsync({
      title: "Large synthetic document",
      rawText,
      sourceKind: "plain-text",
    });
    const runtimeChunks = deriveRuntimeChunks(document, 4);

    expect(runtimeChunks.length).toBeGreaterThan(0);
    expect(
      getPerfMetrics().some(
        (metric) => metric.name === "import.build-document",
      ),
    ).toBe(true);
    expect(
      getPerfMetrics().some(
        (metric) => metric.name === "reader.derive-runtime-chunks",
      ),
    ).toBe(true);
  });

  it("derives playback drift for instrumentation consumers", () => {
    const expectedDurationMs = 320;
    const actualDurationMs = 377;

    expect(derivePlaybackDriftMs(expectedDurationMs, actualDurationMs)).toBe(
      57,
    );

    const rawText = createLargeDocumentText(4, 12);
    const chunkText = rawText.split(/\s+/).slice(0, 4).join(" ");

    expect(
      deriveChunkDurationMs(
        {
          index: 0,
          text: `${chunkText}.`,
          tokenIndexes: [0, 1, 2, 3],
          paragraphIndex: 0,
          sentenceIndex: 0,
          sectionIndex: 0,
          absoluteReadingPosition: 0,
        },
        defaultReaderPreferences,
      ),
    ).toBeGreaterThan(0);
  });
});

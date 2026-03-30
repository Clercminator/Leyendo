import { describe, expect, it } from "vitest";

import { deriveChunkDurationMs } from "@/features/reader/engine/timing";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
import { defaultReaderPreferences } from "@/types/reader";

describe("reader timing helpers", () => {
  const document = buildDocumentModel({
    title: "Timing sample",
    rawText: "Alpha beta gamma, delta. Final line here.",
    sourceKind: "plain-text",
    chunkSize: 2,
  });

  it("slows terminal punctuation when natural pauses are enabled", () => {
    const terminalChunk = document.chunks.find((chunk) =>
      chunk.text.endsWith("."),
    );
    const plainChunk = document.chunks.find(
      (chunk) => !chunk.text.endsWith("."),
    );

    expect(terminalChunk).toBeDefined();
    expect(plainChunk).toBeDefined();

    const withPause = deriveChunkDurationMs(
      terminalChunk!,
      defaultReaderPreferences,
    );
    const withoutPause = deriveChunkDurationMs(
      plainChunk!,
      defaultReaderPreferences,
    );

    expect(withPause).toBeGreaterThan(withoutPause);
  });

  it("responds to higher words-per-minute settings", () => {
    const chunk = document.chunks[0]!;
    const slower = deriveChunkDurationMs(chunk, {
      ...defaultReaderPreferences,
      wordsPerMinute: 200,
    });
    const faster = deriveChunkDurationMs(chunk, {
      ...defaultReaderPreferences,
      wordsPerMinute: 500,
    });

    expect(faster).toBeLessThan(slower);
  });

  it("paces guided line more slowly than classic reader for the same chunk", () => {
    const chunk = document.chunks[0]!;
    const classicDuration = deriveChunkDurationMs(chunk, {
      ...defaultReaderPreferences,
      mode: "classic-reader",
    });
    const guidedDuration = deriveChunkDurationMs(chunk, {
      ...defaultReaderPreferences,
      mode: "guided-line",
    });

    expect(guidedDuration).toBeGreaterThan(classicDuration);
  });

  it("paces phrase chunk more slowly than classic reader for the same chunk", () => {
    const chunk = document.chunks[0]!;
    const classicDuration = deriveChunkDurationMs(chunk, {
      ...defaultReaderPreferences,
      mode: "classic-reader",
    });
    const phraseDuration = deriveChunkDurationMs(chunk, {
      ...defaultReaderPreferences,
      mode: "phrase-chunk",
    });

    expect(phraseDuration).toBeGreaterThan(classicDuration);
  });
});

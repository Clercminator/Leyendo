import { describe, expect, it } from "vitest";

import {
  clampChunkIndex,
  deriveParagraphTokenRange,
  deriveReaderProgress,
  deriveRuntimeChunks,
  findChunkIndexByToken,
  jumpChunkIndex,
  repeatChunkIndex,
  resolveSessionChunkIndex,
  restartParagraphChunkIndex,
} from "@/features/reader/engine/navigation";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
import { defaultReaderPreferences } from "@/types/reader";

describe("reader navigation helpers", () => {
  const document = buildDocumentModel({
    title: "Navigation sample",
    rawText: "Alpha beta gamma. Delta epsilon.\n\nZeta eta theta.",
    sourceKind: "plain-text",
    chunkSize: 1,
  });

  it("clamps chunk indexes safely", () => {
    expect(clampChunkIndex(document.chunks.length, -3)).toBe(0);
    expect(clampChunkIndex(document.chunks.length, 999)).toBe(
      document.chunks.length - 1,
    );
  });

  it("jumps by chunk delta while staying in bounds", () => {
    expect(jumpChunkIndex(document.chunks.length, 2, 5)).toBe(
      document.chunks.length - 1,
    );
    expect(jumpChunkIndex(document.chunks.length, 4, -3)).toBe(1);
  });

  it("repeats the current chunk index unchanged", () => {
    expect(repeatChunkIndex(3)).toBe(3);
  });

  it("restarts from the first chunk in the current paragraph", () => {
    const currentChunkIndex = document.chunks.findIndex(
      (chunk) => chunk.text === "theta.",
    );
    expect(restartParagraphChunkIndex(document.chunks, currentChunkIndex)).toBe(
      document.chunks.findIndex((chunk) => chunk.text === "Zeta"),
    );
  });

  it("derives percent progress from the current chunk position", () => {
    expect(deriveReaderProgress(document, 0)).toBe(0);
    expect(deriveReaderProgress(document, document.chunks.length - 1)).toBe(
      100,
    );
  });

  it("derives runtime chunks from the requested chunk size", () => {
    const runtimeChunks = deriveRuntimeChunks(document, 2);

    expect(runtimeChunks[0]?.text).toBe("Alpha beta");
    expect(runtimeChunks[1]?.text).toBe("gamma.");
  });

  it("reuses cached runtime chunks for the same document and chunk size", () => {
    const first = deriveRuntimeChunks(document, 2);
    const second = deriveRuntimeChunks(document, 2);
    const third = deriveRuntimeChunks(document, 3);

    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });

  it("derives focus mode as anchor-based sliding windows", () => {
    const runtimeChunks = deriveRuntimeChunks(document, {
      ...defaultReaderPreferences,
      mode: "focus-word",
      chunkSize: 2,
    });

    expect(runtimeChunks[0]).toMatchObject({
      text: "Alpha beta",
      anchorTokenIndex: 0,
    });
    expect(runtimeChunks[1]).toMatchObject({
      text: "Alpha beta gamma.",
      anchorTokenIndex: 1,
    });
    expect(findChunkIndexByToken(runtimeChunks, 1)).toBe(1);
  });

  it("derives phrase chunks with natural boundaries instead of fixed slices", () => {
    const phraseDocument = buildDocumentModel({
      title: "Phrase sample",
      rawText: "Alpha beta gamma, delta epsilon zeta.",
      sourceKind: "plain-text",
      chunkSize: 1,
    });

    const runtimeChunks = deriveRuntimeChunks(phraseDocument, {
      ...defaultReaderPreferences,
      mode: "phrase-chunk",
      chunkSize: 2,
    });

    expect(runtimeChunks.map((chunk) => chunk.text)).toEqual([
      "Alpha beta gamma,",
      "delta epsilon zeta.",
    ]);
  });

  it("derives guided line chunks as paragraph lines instead of fixed token groups", () => {
    const guidedDocument = buildDocumentModel({
      title: "Guided sample",
      rawText: "Alpha beta gamma delta epsilon zeta eta theta, iota kappa lambda mu.",
      sourceKind: "plain-text",
      chunkSize: 1,
    });

    const runtimeChunks = deriveRuntimeChunks(guidedDocument, {
      ...defaultReaderPreferences,
      mode: "guided-line",
      chunkSize: 2,
    });

    expect(runtimeChunks.map((chunk) => chunk.text)).toEqual([
      "Alpha beta gamma delta epsilon zeta eta theta,",
      "iota kappa lambda mu.",
    ]);
  });

  it("derives paragraph token ranges from precomputed block bounds", () => {
    const paragraphTokens = deriveParagraphTokenRange(document, 1);

    expect(paragraphTokens.map((token) => token.value)).toEqual([
      "Zeta",
      "eta",
      "theta.",
    ]);
  });

  it("finds the runtime chunk containing a token anchor", () => {
    const runtimeChunks = deriveRuntimeChunks(document, 2);

    expect(findChunkIndexByToken(runtimeChunks, 0)).toBe(0);
    expect(findChunkIndexByToken(runtimeChunks, 2)).toBe(1);
  });

  it("resolves session position from a token anchor ahead of chunk index", () => {
    const runtimeChunks = deriveRuntimeChunks(document, 1);

    expect(
      resolveSessionChunkIndex(runtimeChunks, {
        currentChunkIndex: 1,
        currentTokenIndex: 3,
      }),
    ).toBe(3);
  });
});

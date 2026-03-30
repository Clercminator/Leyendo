import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PhraseChunkView } from "@/components/reader/phrase-chunk-view";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
import { deriveRuntimeChunks } from "@/features/reader/engine/navigation";
import { defaultReaderPreferences } from "@/types/reader";

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

describe("PhraseChunkView", () => {
  it("renders sentence context from the provided document model", () => {
    const documentModel = buildDocumentModel({
      title: "Phrase reader sample",
      rawText: "First sentence here. Second sentence has more words. Third sentence closes.",
      sourceKind: "plain-text",
      chunkSize: 1,
    });
    const chunks = deriveRuntimeChunks(documentModel, {
      ...defaultReaderPreferences,
      mode: "phrase-chunk",
      chunkSize: 2,
    });
    const activeChunk = chunks.find((chunk) => chunk.sentenceIndex === 1);

    expect(activeChunk).toBeDefined();

    render(
      <PhraseChunkView
        document={documentModel}
        chunk={activeChunk!}
        chunks={chunks}
      />,
    );

    expect(screen.getByText("First sentence here.")).toBeInTheDocument();
    expect(screen.getByText("Third sentence closes.")).toBeInTheDocument();
  });
});
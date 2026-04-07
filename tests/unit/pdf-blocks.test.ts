import { describe, expect, it } from "vitest";

import {
  buildPdfBlocks,
  normalizePdfSourceBlocks,
  type PdfLine,
} from "@/features/ingest/extract/file-text";

describe("pdf block normalization", () => {
  it("merges broken paragraph joins and fixes hyphenated line breaks", () => {
    const normalized = normalizePdfSourceBlocks([
      {
        kind: "paragraph",
        sourcePageIndex: 0,
        text: "This para-",
      },
      {
        kind: "paragraph",
        sourcePageIndex: 0,
        text: "graph continues on the next extracted block without punctuation",
      },
    ]);

    expect(normalized).toEqual([
      expect.objectContaining({
        kind: "paragraph",
        text: "This paragraph continues on the next extracted block without punctuation",
      }),
    ]);
  });

  it("keeps front-matter and table-of-contents lines separate", () => {
    const lines: PdfLine[] = [
      {
        center: 300,
        entryKind: "text",
        fontSize: 22,
        left: 190,
        pageIndex: 0,
        pageWidth: 600,
        right: 410,
        text: "Crime and Punishment",
        y: 720,
      },
      {
        center: 300,
        entryKind: "text",
        fontSize: 14,
        left: 220,
        pageIndex: 0,
        pageWidth: 600,
        right: 380,
        text: "Translated by Constance Garnett",
        y: 680,
      },
      {
        center: 300,
        entryKind: "image-placeholder",
        fontSize: 12,
        left: 120,
        pageIndex: 0,
        pageWidth: 600,
        right: 480,
        text: "[Image omitted from PDF]",
        y: 580,
      },
      {
        center: 300,
        entryKind: "text",
        fontSize: 15,
        left: 180,
        pageIndex: 1,
        pageWidth: 600,
        right: 420,
        text: "CONTENTS",
        y: 720,
      },
      {
        center: 300,
        entryKind: "text",
        fontSize: 12,
        left: 90,
        pageIndex: 1,
        pageWidth: 600,
        right: 510,
        text: "Translator's Preface ........ 3",
        y: 690,
      },
    ];

    const blocks = buildPdfBlocks(lines);

    expect(blocks.map((block) => block.text)).toEqual([
      "Crime and Punishment",
      "Translated by Constance Garnett",
      "[Image omitted from PDF]",
      "CONTENTS",
      "Translator's Preface ........ 3",
    ]);
  });
});

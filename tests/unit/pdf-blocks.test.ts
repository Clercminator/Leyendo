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

  it("normalizes common PDF glyph artifacts inside paragraph text", () => {
    const normalized = normalizePdfSourceBlocks([
      {
        kind: "paragraph",
        sourcePageIndex: 0,
        text: "co\u00adoperation\u00a0and ﬁnance\u200b stay aligned",
      },
    ]);

    expect(normalized).toEqual([
      expect.objectContaining({
        kind: "paragraph",
        text: "cooperation and finance stay aligned",
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

  it("keeps short bold lines as headings and recognizes broader bullet markers", () => {
    const lines: PdfLine[] = [
      {
        center: 300,
        entryKind: "text",
        fontSize: 12,
        isBold: true,
        left: 216,
        pageIndex: 0,
        pageWidth: 600,
        right: 384,
        text: "Important Terms",
        y: 720,
      },
      {
        center: 155,
        entryKind: "text",
        fontSize: 12,
        left: 72,
        pageIndex: 0,
        pageWidth: 600,
        right: 238,
        text: "• First item",
        y: 676,
      },
      {
        center: 168,
        entryKind: "text",
        fontSize: 12,
        left: 96,
        pageIndex: 0,
        pageWidth: 600,
        right: 240,
        text: "continues on the next line",
        y: 660,
      },
      {
        center: 143,
        entryKind: "text",
        fontSize: 12,
        left: 72,
        pageIndex: 0,
        pageWidth: 600,
        right: 214,
        text: "▪ Second item",
        y: 620,
      },
    ];

    const blocks = buildPdfBlocks(lines);

    expect(blocks).toEqual([
      expect.objectContaining({
        kind: "heading",
        text: "Important Terms",
      }),
      expect.objectContaining({
        kind: "list-item",
        marker: "•",
        text: "First item continues on the next line",
      }),
      expect.objectContaining({
        kind: "list-item",
        marker: "▪",
        text: "Second item",
      }),
    ]);
  });

  it("merges centered body text lines into a single paragraph for book layouts", () => {
    const lines: PdfLine[] = [
      {
        center: 300,
        entryKind: "text",
        fontSize: 12,
        left: 120,
        pageIndex: 2,
        pageWidth: 600,
        right: 480,
        text: "IKE millions of others, I am a big fan of Napoleon Hill's timeless",
        y: 600,
      },
      {
        center: 300,
        entryKind: "text",
        fontSize: 12,
        left: 125,
        pageIndex: 2,
        pageWidth: 600,
        right: 475,
        text: "classic, Think and Grow Rich. First published in 1937, it has the",
        y: 584,
      },
      {
        center: 300,
        entryKind: "text",
        fontSize: 12,
        left: 122,
        pageIndex: 2,
        pageWidth: 600,
        right: 478,
        text: "distinction of being the best read self-help book of the twentieth century.",
        y: 568,
      },
    ];

    const blocks = buildPdfBlocks(lines);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual(
      expect.objectContaining({
        kind: "paragraph",
        text: expect.stringContaining(
          "IKE millions of others, I am a big fan of Napoleon Hill's timeless classic, Think and Grow Rich.",
        ),
      }),
    );
  });

  it("inserts space on font change even when gap is small (bold/regular transitions)", () => {
    const lines: PdfLine[] = [
      {
        center: 300,
        entryKind: "text",
        fontSize: 10,
        left: 72,
        pageIndex: 0,
        pageWidth: 600,
        right: 500,
        text: "Que, por Resolución Electrónica Exenta N°1.424, de 2024",
        y: 700,
      },
    ];

    const blocks = buildPdfBlocks(lines);

    expect(blocks[0]!.text).toContain("por Resolución");
    expect(blocks[0]!.text).not.toContain("porResolución");
  });
});

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

  it("keeps drop-cap book paragraphs merged even when the first line shifts off center", () => {
    const lines: PdfLine[] = [
      {
        center: 272.5,
        entryKind: "text",
        fontSize: 11,
        left: 134,
        pageIndex: 12,
        pageWidth: 435,
        right: 411,
        text: "IKE millions of others, I am a big fan of Napoleon Hill's timeless",
        y: 456,
      },
      {
        center: 255.6,
        entryKind: "text",
        fontSize: 11,
        left: 100.4,
        pageIndex: 12,
        pageWidth: 435,
        right: 410.8,
        text: "classic, Think and Grow Rich. First published in 1937, it has the",
        y: 443.1,
      },
      {
        center: 255,
        entryKind: "text",
        fontSize: 11,
        left: 102,
        pageIndex: 12,
        pageWidth: 435,
        right: 408,
        text: "distinction of being the best read self-help book of the twentieth century.",
        y: 430,
      },
    ];

    const blocks = buildPdfBlocks(lines);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual(
      expect.objectContaining({
        alignment: "left",
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

  it("preserves heading levels, indentation, list depth, and page breaks for legal layouts", () => {
    const lines: PdfLine[] = [
      {
        center: 300,
        entryKind: "text",
        fontSize: 20,
        left: 150,
        pageIndex: 0,
        pageWidth: 600,
        right: 450,
        text: "CONTRATO DE PRESTACION DE SERVICIOS",
        y: 720,
      },
      {
        center: 160,
        entryKind: "text",
        fontSize: 12,
        left: 72,
        pageIndex: 1,
        pageWidth: 600,
        right: 248,
        text: "1. Objeto del contrato",
        y: 720,
      },
      {
        center: 190,
        entryKind: "text",
        fontSize: 12,
        left: 96,
        pageIndex: 1,
        pageWidth: 600,
        right: 284,
        text: "1.1. Alcance del servicio",
        y: 692,
      },
      {
        center: 232,
        entryKind: "text",
        fontSize: 12,
        left: 120,
        pageIndex: 1,
        pageWidth: 600,
        right: 344,
        text: "a) Incluye soporte y reportes periodicos",
        y: 664,
      },
      {
        center: 278,
        entryKind: "text",
        fontSize: 12,
        left: 144,
        pageIndex: 1,
        pageWidth: 600,
        right: 412,
        text: "durante toda la vigencia del contrato",
        y: 648,
      },
      {
        center: 292,
        entryKind: "text",
        fontSize: 12,
        left: 96,
        pageIndex: 1,
        pageWidth: 600,
        right: 488,
        text: "Que, por Resolucion Exenta vigente, se instruye su seguimiento",
        y: 612,
      },
      {
        center: 308,
        entryKind: "text",
        fontSize: 12,
        left: 120,
        pageIndex: 1,
        pageWidth: 600,
        right: 496,
        text: "y control permanente por parte de la unidad tecnica.",
        y: 596,
      },
    ];

    const blocks = buildPdfBlocks(lines);

    expect(blocks).toEqual([
      expect.objectContaining({
        headingLevel: 1,
        kind: "heading",
        text: "CONTRATO DE PRESTACION DE SERVICIOS",
      }),
      expect.objectContaining({
        kind: "list-item",
        listDepth: 1,
        marker: "1.",
        pageBreakBefore: true,
        text: "Objeto del contrato",
      }),
      expect.objectContaining({
        indentLevel: 1,
        kind: "list-item",
        listDepth: 2,
        marker: "1.1.",
        text: "Alcance del servicio",
      }),
      expect.objectContaining({
        indentLevel: 2,
        kind: "list-item",
        listDepth: 3,
        marker: "a)",
        text: "Incluye soporte y reportes periodicos durante toda la vigencia del contrato",
      }),
      expect.objectContaining({
        indentLevel: 1,
        kind: "paragraph",
        text: "Que, por Resolucion Exenta vigente, se instruye su seguimiento y control permanente por parte de la unidad tecnica.",
      }),
    ]);
  });
});

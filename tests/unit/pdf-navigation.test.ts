import { describe, expect, it, vi } from "vitest";

import {
  buildResolvedPdfOutline,
  getPdfPageLabel,
  resolvePdfDestinationPageIndex,
  resolvePdfPageInput,
  resolvePdfSelectionAnchor,
  resolveSourcePageIndexForAnchor,
} from "@/features/reader/pdf/navigation";
import { buildDocumentModel } from "@/features/ingest/build/document-model";

describe("pdf navigation helpers", () => {
  it("maps reader anchors back to source PDF pages", () => {
    const document = buildDocumentModel({
      rawText: "Agreement\n\nFirst clause.",
      sourceBlocks: [
        { kind: "heading", sourcePageIndex: 0, text: "Agreement" },
        { kind: "paragraph", sourcePageIndex: 1, text: "First clause." },
      ],
      sourceKind: "pdf",
    });

    expect(
      resolveSourcePageIndexForAnchor(document, {
        chunkIndex: 1,
        paragraphIndex: 1,
        tokenIndex: 2,
      }),
    ).toBe(1);
  });

  it("maps selected PDF quote text back to a stable reader anchor", () => {
    const document = buildDocumentModel({
      rawText:
        "Agreement\n\nFirst clause on page one.\n\nSecond clause on page two.",
      sourceBlocks: [
        {
          kind: "heading",
          sourcePageIndex: 0,
          text: "Agreement",
        },
        {
          kind: "paragraph",
          sourcePageIndex: 0,
          text: "First clause on page one.",
        },
        {
          kind: "paragraph",
          sourcePageIndex: 1,
          text: "Second clause on page two.",
        },
      ],
      sourceKind: "pdf",
    });

    expect(
      resolvePdfSelectionAnchor({
        document,
        pageIndex: 1,
        quote: "Second clause on page two.",
      }),
    ).toEqual(
      expect.objectContaining({
        paragraphIndex: 2,
        sourcePageIndex: 1,
      }),
    );
  });

  it("prefers contextual matches for repeated legal phrases on the same page", () => {
    const document = buildDocumentModel({
      rawText:
        "BASES\n\nPRIMERO. La entidad beneficiaria debe presentar antecedentes dentro de cinco dias habiles.\n\nSEGUNDO. La entidad beneficiaria debe presentar antecedentes dentro de diez dias habiles.",
      sourceBlocks: [
        { kind: "heading", sourcePageIndex: 0, text: "BASES" },
        {
          kind: "paragraph",
          sourcePageIndex: 0,
          text: "PRIMERO. La entidad beneficiaria debe presentar antecedentes dentro de cinco dias habiles.",
        },
        {
          kind: "paragraph",
          sourcePageIndex: 0,
          text: "SEGUNDO. La entidad beneficiaria debe presentar antecedentes dentro de diez dias habiles.",
        },
      ],
      sourceKind: "pdf",
    });

    expect(
      resolvePdfSelectionAnchor({
        document,
        pageIndex: 0,
        preferredTokenIndex: document.blocks[2]?.tokenStart,
        prefixText: "SEGUNDO.",
        quote: "La entidad beneficiaria debe presentar antecedentes",
        suffixText: "dentro de diez dias habiles.",
      }),
    ).toEqual(
      expect.objectContaining({
        paragraphIndex: 2,
        sourcePageIndex: 0,
      }),
    );
  });

  it("prefers an explicit source page index when restoring PDF anchors", () => {
    const document = buildDocumentModel({
      rawText: "Agreement\n\nFirst clause.\n\nSecond clause.",
      sourceBlocks: [
        { kind: "heading", sourcePageIndex: 0, text: "Agreement" },
        { kind: "paragraph", sourcePageIndex: 1, text: "First clause." },
        { kind: "paragraph", sourcePageIndex: 2, text: "Second clause." },
      ],
      sourceKind: "pdf",
    });

    expect(
      resolveSourcePageIndexForAnchor(document, {
        chunkIndex: 1,
        sourcePageIndex: 2,
        tokenIndex: 2,
      }),
    ).toBe(2);
  });

  it("resolves named and explicit destinations to zero-based page indexes", async () => {
    const pdfDocument = {
      getDestination: vi.fn().mockResolvedValue([{ gen: 0, num: 42 }]),
      getOutline: vi.fn().mockResolvedValue(null),
      getPageIndex: vi.fn().mockResolvedValue(3),
    };

    await expect(
      resolvePdfDestinationPageIndex(pdfDocument, "chapter-1"),
    ).resolves.toBe(3);
    await expect(
      resolvePdfDestinationPageIndex(pdfDocument, [5]),
    ).resolves.toBe(5);
  });

  it("builds a resolved outline tree with page indexes", async () => {
    const pdfDocument = {
      getDestination: vi
        .fn()
        .mockImplementation(async (id: string) => [{ gen: 0, num: id.length }]),
      getOutline: vi.fn().mockResolvedValue([
        {
          dest: "intro",
          items: [
            {
              dest: [2],
              items: [],
              title: "Subsection",
            },
          ],
          title: "Introduction",
        },
      ]),
      getPageIndex: vi.fn().mockResolvedValue(1),
    };

    const outline = await buildResolvedPdfOutline(pdfDocument);

    expect(outline[0]).toEqual(
      expect.objectContaining({
        pageIndex: 1,
        title: "Introduction",
      }),
    );
    expect(outline[0]?.items[0]).toEqual(
      expect.objectContaining({
        pageIndex: 2,
        title: "Subsection",
      }),
    );
  });

  it("falls back to numeric page labels when a PDF has none", () => {
    expect(getPdfPageLabel(0, null)).toBe("1");
    expect(getPdfPageLabel(2, ["i", "ii", "1"])).toBe("1");
  });

  it("resolves page jump input from page labels before numeric fallback", () => {
    expect(
      resolvePdfPageInput({
        input: "ii",
        pageCount: 3,
        pageLabels: ["i", "ii", "1"],
      }),
    ).toBe(1);

    expect(
      resolvePdfPageInput({
        input: "2",
        pageCount: 3,
        pageLabels: ["i", "ii", "1"],
      }),
    ).toBe(1);

    expect(
      resolvePdfPageInput({
        input: "99",
        pageCount: 3,
        pageLabels: ["i", "ii", "1"],
      }),
    ).toBeNull();
  });
});

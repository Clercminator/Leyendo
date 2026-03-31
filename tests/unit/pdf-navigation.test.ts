import { describe, expect, it, vi } from "vitest";

import {
  buildResolvedPdfOutline,
  getPdfPageLabel,
  resolvePdfDestinationPageIndex,
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

  it("resolves named and explicit destinations to zero-based page indexes", async () => {
    const pdfDocument = {
      getDestination: vi.fn().mockResolvedValue([{ gen: 0, num: 42 }]),
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
});

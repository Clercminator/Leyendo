import { describe, expect, it } from "vitest";

import { buildDocumentModel } from "@/features/ingest/build/document-model";

describe("buildDocumentModel", () => {
  it("builds a plain-text model with chunks and sections", () => {
    const document = buildDocumentModel({
      title: "Notes",
      rawText: "First sentence. Second sentence.\n\nThird paragraph.",
      sourceKind: "plain-text",
      chunkSize: 2,
    });

    expect(document.title).toBe("Notes");
    expect(document.blocks).toHaveLength(2);
    expect(document.sentences).toHaveLength(3);
    expect(document.sections).toHaveLength(1);
    expect(document.chunks[0]?.text).toBe("First sentence.");
    expect(document.chunks.at(-1)?.text).toBe("Third paragraph.");
  });

  it("derives structure from markdown headings and list items", () => {
    const document = buildDocumentModel({
      rawText:
        "# Chapter One\n\nThis is a paragraph.\n\n- First bullet\n- Second bullet",
      sourceKind: "markdown",
      chunkSize: 2,
    });

    expect(document.title).toBe("Chapter One");
    expect(document.sections[0]?.title).toBe("Chapter One");
    expect(document.blocks.some((block) => block.kind === "list-item")).toBe(
      true,
    );
    expect(document.chunks.length).toBeGreaterThan(0);
  });

  it("preserves structured block metadata when provided", () => {
    const document = buildDocumentModel({
      rawText: "Agreement\n\n1.1. First clause.",
      sourceBlocks: [
        {
          alignment: "center",
          headingLevel: 1,
          kind: "heading",
          pageBreakBefore: true,
          sourcePageIndex: 0,
          text: "Agreement",
        },
        {
          indentLevel: 1,
          kind: "list-item",
          listDepth: 2,
          marker: "1.1.",
          sourcePageIndex: 1,
          text: "First clause.",
        },
      ],
      sourceKind: "pdf",
    });

    expect(document.title).toBe("Agreement");
    expect(document.blocks[0]).toEqual(
      expect.objectContaining({
        alignment: "center",
        headingLevel: 1,
        kind: "heading",
        pageBreakBefore: true,
        sourcePageIndex: 0,
      }),
    );
    expect(document.blocks[1]).toEqual(
      expect.objectContaining({
        indentLevel: 1,
        kind: "list-item",
        listDepth: 2,
        marker: "1.1.",
        sourcePageIndex: 1,
      }),
    );
    expect(document.sentences[0]?.sourcePageIndex).toBe(0);
    expect(document.tokens[0]?.sourcePageIndex).toBe(0);
    expect(document.chunks[0]?.sourcePageIndex).toBe(0);
    expect(document.sections[0]?.sourcePageIndex).toBe(0);
    expect(document.pages).toEqual([
      expect.objectContaining({
        index: 0,
        label: "1",
      }),
      expect.objectContaining({
        index: 1,
        label: "2",
      }),
    ]);
  });

  it("resolves inline span hints into block token ranges", () => {
    const document = buildDocumentModel({
      rawText: "Important terms stay visible in the reader.",
      sourceBlocks: [
        {
          inlineSpans: [
            {
              kind: "strong",
              text: "Important terms",
            },
          ],
          kind: "paragraph",
          text: "Important terms stay visible in the reader.",
        },
      ],
      sourceKind: "pdf",
    });

    expect(document.blocks[0]?.inlineSpans).toEqual([
      {
        kind: "strong",
        tokenEnd: 1,
        tokenStart: 0,
      },
    ]);
  });

  it("skips leading PDF image placeholders when deriving the excerpt", () => {
    const document = buildDocumentModel({
      rawText:
        "[Image omitted from PDF]\n\n[Image omitted from PDF]\n\nHow To Sell Your Way Through Life\n\nA book about selling.",
      sourceBlocks: [
        {
          kind: "paragraph",
          text: "[Image omitted from PDF]",
        },
        {
          kind: "paragraph",
          text: "[Image omitted from PDF]",
        },
        {
          kind: "heading",
          text: "How To Sell Your Way Through Life",
        },
        {
          kind: "paragraph",
          text: "A book about selling.",
        },
      ],
      sourceKind: "pdf",
    });

    expect(document.excerpt).toContain("How To Sell Your Way Through Life");
    expect(document.excerpt).not.toContain("[Image omitted from PDF]");
  });
});

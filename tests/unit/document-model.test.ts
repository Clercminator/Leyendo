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
});

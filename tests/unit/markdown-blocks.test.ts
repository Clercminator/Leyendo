import { describe, expect, it } from "vitest";

import { extractMarkdownBlocks } from "@/features/ingest/normalize/markdown-blocks";

describe("extractMarkdownBlocks", () => {
  it("extracts headings, paragraphs, and list items from markdown", () => {
    const blocks = extractMarkdownBlocks(
      "# Heading\n\nA paragraph.\n\n- One\n- Two",
    );

    expect(blocks).toEqual([
      { kind: "heading", text: "Heading" },
      { kind: "paragraph", text: "A paragraph." },
      { kind: "list-item", text: "One" },
      { kind: "list-item", text: "Two" },
    ]);
  });
});

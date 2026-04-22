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

  it("surfaces fenced code and mermaid blocks as clean-view placeholders", () => {
    const blocks = extractMarkdownBlocks(
      "# Heading\n\n```ts\nconst answer = 42;\n```\n\n```mermaid\ngraph TD\nA-->B\n```",
    );

    expect(blocks).toEqual([
      { kind: "heading", text: "Heading" },
      {
        kind: "paragraph",
        text: "Code snippet included in this section. Switch to Literal text to inspect the code.",
      },
      {
        kind: "paragraph",
        text: "Mermaid diagram included in this section. Switch to Literal text to inspect the diagram source.",
      },
    ]);
  });
});

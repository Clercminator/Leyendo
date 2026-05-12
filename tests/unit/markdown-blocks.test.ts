import { describe, expect, it } from "vitest";

import {
  extractMarkdownBlocks,
  MARKDOWN_CODE_BLOCK_PLACEHOLDER,
  MARKDOWN_FOOTNOTE_PLACEHOLDER,
  MARKDOWN_HTML_PLACEHOLDER,
  MARKDOWN_MATH_PLACEHOLDER,
  MARKDOWN_MERMAID_PLACEHOLDER,
  MARKDOWN_TABLE_PLACEHOLDER,
} from "@/features/ingest/normalize/markdown-blocks";

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
        text: MARKDOWN_CODE_BLOCK_PLACEHOLDER,
      },
      {
        kind: "paragraph",
        text: MARKDOWN_MERMAID_PLACEHOLDER,
      },
    ]);
  });

  it("keeps structural markers for lists and placeholders for non-text blocks", () => {
    const blocks = extractMarkdownBlocks(
      "1. Ordered item\n- [x] Completed item\n\n| Plan | Status |\n| --- | --- |\n| Reader | Ready |\n\n![Architecture](diagram.png)\n\n<div>Inline HTML block</div>\n\n$$\nE = mc^2\n$$\n\n[^1]: Supporting note",
    );

    expect(blocks).toEqual([
      { kind: "list-item", marker: "1.", text: "Ordered item" },
      { kind: "list-item", marker: "[x]", text: "Completed item" },
      { kind: "paragraph", text: MARKDOWN_TABLE_PLACEHOLDER },
      { kind: "paragraph", text: "Image reference: Architecture" },
      { kind: "paragraph", text: MARKDOWN_HTML_PLACEHOLDER },
      { kind: "paragraph", text: MARKDOWN_MATH_PLACEHOLDER },
      { kind: "paragraph", text: MARKDOWN_FOOTNOTE_PLACEHOLDER },
    ]);
  });
});

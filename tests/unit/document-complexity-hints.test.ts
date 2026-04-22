import { describe, expect, it } from "vitest";

import { deriveDocumentComplexityHints } from "@/features/ingest/build/document-complexity-hints";

describe("deriveDocumentComplexityHints", () => {
  it("flags advanced markdown structures that clean view may simplify", () => {
    const hints = deriveDocumentComplexityHints({
      rawText:
        "# Heading\n\n```ts\nconst answer = 42;\n```\n\n```mermaid\ngraph TD\nA-->B\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] Done\n\n![Alt](image.png)\n\nInline math $x+y$\n\n[^1]: Footnote\n\n<div>HTML</div>",
      sourceKind: "markdown",
    });

    expect(hints).toEqual([
      "markdown-code-blocks",
      "markdown-mermaid-diagrams",
      "markdown-tables",
      "markdown-task-lists",
      "markdown-images",
      "markdown-html",
      "markdown-math",
      "markdown-footnotes",
    ]);
  });

  it("adds generic rich-content warnings for DOCX and RTF imports", () => {
    expect(
      deriveDocumentComplexityHints({
        rawText: "Converted content",
        sourceKind: "docx",
      }),
    ).toEqual(["docx-rich-content"]);

    expect(
      deriveDocumentComplexityHints({
        rawText: "Converted content",
        sourceKind: "rtf",
      }),
    ).toEqual(["rtf-rich-content"]);
  });
});

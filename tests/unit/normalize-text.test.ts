import { describe, expect, it } from "vitest";

import { normalizeText } from "@/lib/text/normalize-text";

describe("normalizeText", () => {
  it("preserves paragraph boundaries while removing noisy whitespace", () => {
    const result = normalizeText(
      "  First sentence.   Second sentence.\n\n  Third paragraph.  ",
    );

    expect(result.raw).toBe(
      "First sentence. Second sentence.\n\nThird paragraph.",
    );
    expect(result.paragraphs).toEqual([
      "First sentence. Second sentence.",
      "Third paragraph.",
    ]);
    expect(result.sentences).toEqual([
      "First sentence.",
      "Second sentence.",
      "Third paragraph.",
    ]);
  });
});

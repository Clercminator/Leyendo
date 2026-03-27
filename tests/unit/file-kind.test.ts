import { describe, expect, it } from "vitest";

import { detectDocumentSourceKind } from "@/features/ingest/detect/file-kind";

describe("detectDocumentSourceKind", () => {
  it("detects supported source kinds by mime type and extension", () => {
    expect(detectDocumentSourceKind("notes.md")).toBe("markdown");
    expect(detectDocumentSourceKind("draft.docx")).toBe("docx");
    expect(detectDocumentSourceKind("scan.pdf", "application/pdf")).toBe("pdf");
    expect(detectDocumentSourceKind("essay.txt", "text/plain")).toBe(
      "plain-text",
    );
  });

  it("returns null for unsupported files", () => {
    expect(detectDocumentSourceKind("archive.zip")).toBeNull();
  });
});

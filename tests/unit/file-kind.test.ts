import { describe, expect, it } from "vitest";

import {
  detectDocumentSourceKind,
  isLegacyWordDocument,
} from "@/features/ingest/detect/file-kind";

describe("detectDocumentSourceKind", () => {
  it("detects supported source kinds by mime type and extension", () => {
    expect(detectDocumentSourceKind("notes.md")).toBe("markdown");
    expect(detectDocumentSourceKind("draft.docx")).toBe("docx");
    expect(detectDocumentSourceKind("notes.rtf", "application/rtf")).toBe(
      "rtf",
    );
    expect(detectDocumentSourceKind("scan.pdf", "application/pdf")).toBe("pdf");
    expect(detectDocumentSourceKind("essay.txt", "text/plain")).toBe(
      "plain-text",
    );
  });

  it("identifies legacy word documents separately from supported formats", () => {
    expect(isLegacyWordDocument("notes.doc")).toBe(true);
    expect(isLegacyWordDocument("notes.docx")).toBe(false);
    expect(isLegacyWordDocument("notes", "application/msword")).toBe(true);
  });

  it("returns null for unsupported files", () => {
    expect(detectDocumentSourceKind("archive.zip")).toBeNull();
    expect(detectDocumentSourceKind("legacy.doc", "application/msword")).toBeNull();
  });
});

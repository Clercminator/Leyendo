import { describe, expect, it, vi } from "vitest";

import { extractDocumentFromFile } from "@/features/ingest/extract/file-text";

vi.mock("mammoth/mammoth.browser", () => ({
  default: {
    extractRawText: vi.fn(async () => ({
      value: "DOCX paragraph one.\n\nDOCX paragraph two.",
    })),
  },
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: [{ str: "PDF" }, { str: "content" }, { str: "here." }],
        }),
      }),
    }),
  })),
}));

describe("extractDocumentFromFile", () => {
  it("extracts plain text files directly", async () => {
    const file = new File(["Hello from text import."], "notes.txt", {
      type: "text/plain",
    });

    const extracted = await extractDocumentFromFile(file);

    expect(extracted.sourceKind).toBe("plain-text");
    expect(extracted.rawText).toBe("Hello from text import.");
    expect(extracted.title).toBe("notes");
  });

  it("extracts markdown files directly", async () => {
    const file = new File(["# Heading\n\nBody text."], "article.md", {
      type: "text/markdown",
    });

    const extracted = await extractDocumentFromFile(file);

    expect(extracted.sourceKind).toBe("markdown");
    expect(extracted.rawText).toContain("# Heading");
  });

  it("extracts docx files through mammoth", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "draft.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const extracted = await extractDocumentFromFile(file);

    expect(extracted.sourceKind).toBe("docx");
    expect(extracted.rawText).toContain("DOCX paragraph one.");
  });

  it("extracts pdf files through pdf.js", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "scan.pdf", {
      type: "application/pdf",
    });

    const extracted = await extractDocumentFromFile(file);

    expect(extracted.sourceKind).toBe("pdf");
    expect(extracted.rawText).toBe("PDF content here.");
  });

  it("rejects unsupported files", async () => {
    const file = new File(["zip"], "archive.zip", {
      type: "application/zip",
    });

    await expect(extractDocumentFromFile(file)).rejects.toThrow(
      /not supported/i,
    );
  });
});

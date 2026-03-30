import { describe, expect, it, vi } from "vitest";

import { extractDocumentFromFile } from "@/features/ingest/extract/file-text";

const pdfjsMock = vi.hoisted(() => ({
  GlobalWorkerOptions: {
    workerSrc: "",
  },
  OPS: {
    paintFormXObjectBegin: 74,
    paintFormXObjectEnd: 75,
    paintImageXObject: 85,
    paintInlineImageXObject: 86,
    paintInlineImageXObjectGroup: 87,
    paintImageXObjectRepeat: 88,
    restore: 11,
    save: 10,
    transform: 12,
  },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getViewport: () => ({ width: 612 }),
        getOperatorList: async () => ({
          argsArray: [
            [],
            [160, 0, 0, 100, 170, 735],
            [{ data: new Uint8ClampedArray([0]), height: 100, width: 160 }],
            [],
          ],
          fnArray: [10, 12, 86, 11],
        }),
        getTextContent: async () => ({
          items: [
            {
              str: "CONTRATO MARCO DE PRESTACION DE SERVICIOS",
              transform: [1, 0, 0, 18, 122, 780],
              width: 368,
              height: 18,
            },
            {
              str: "SOCIEDAD COMERCIAL FERNANDEZ Y ASOCIADOS LIMITADA",
              transform: [1, 0, 0, 18, 88, 752],
              width: 436,
              height: 18,
            },
            {
              str: "En",
              transform: [1, 0, 0, 12, 54, 692],
              width: 14,
              height: 12,
            },
            {
              str: "Santiago",
              transform: [1, 0, 0, 12, 72, 692],
              width: 52,
              height: 12,
            },
            {
              str: "de",
              transform: [1, 0, 0, 12, 128, 692],
              width: 16,
              height: 12,
            },
            {
              str: "Chile,",
              transform: [1, 0, 0, 12, 148, 692],
              width: 34,
              height: 12,
            },
            {
              str: "PRIMERO:",
              transform: [1, 0, 0, 14, 54, 644],
              width: 78,
              height: 14,
            },
            {
              str: "Declaraciones.",
              transform: [1, 0, 0, 14, 136, 644],
              width: 112,
              height: 14,
            },
            {
              str: "1.1.",
              transform: [1, 0, 0, 12, 54, 616],
              width: 24,
              height: 12,
            },
            {
              str: "Que",
              transform: [1, 0, 0, 12, 96, 616],
              width: 24,
              height: 12,
            },
            {
              str: "es",
              transform: [1, 0, 0, 12, 124, 616],
              width: 12,
              height: 12,
            },
            {
              str: "una",
              transform: [1, 0, 0, 12, 140, 616],
              width: 20,
              height: 12,
            },
            {
              str: "sociedad",
              transform: [1, 0, 0, 12, 164, 616],
              width: 48,
              height: 12,
            },
            {
              str: "valida.",
              transform: [1, 0, 0, 12, 216, 616],
              width: 36,
              height: 12,
            },
          ],
        }),
      }),
    }),
  })),
}));

vi.mock("mammoth/mammoth.browser", () => ({
  default: {
    extractRawText: vi.fn(async () => ({
      value: "DOCX paragraph one.\n\nDOCX paragraph two.",
    })),
  },
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => pdfjsMock);

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

  it("extracts rtf files through the built-in parser", async () => {
    const file = new File(
      [
        "{\\rtf1\\ansi\\deff0 This is \\b bold\\b0.\\par Second line with \\tab spacing.}",
      ],
      "draft.rtf",
      {
      type: "application/rtf",
      },
    );

    const extracted = await extractDocumentFromFile(file);

    expect(extracted.sourceKind).toBe("rtf");
    expect(extracted.rawText).toBe("This is bold.\nSecond line with \tspacing.");
  });

  it("extracts pdf files through pdf.js", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "scan.pdf", {
      type: "application/pdf",
    });

    const extracted = await extractDocumentFromFile(file);

    expect(extracted.sourceKind).toBe("pdf");
    expect(extracted.rawText).toContain(
      "CONTRATO MARCO DE PRESTACION DE SERVICIOS",
    );
    expect(extracted.rawText).toContain("[Image omitted from PDF]");
    expect(extracted.sourceBlocks?.[0]).toEqual(
      expect.objectContaining({
        alignment: "center",
        kind: "heading",
      }),
    );
    expect(extracted.sourceBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "paragraph",
          text: "[Image omitted from PDF]",
        }),
      ]),
    );
    expect(extracted.sourceBlocks?.at(-1)).toEqual(
      expect.objectContaining({
        kind: "list-item",
        marker: "1.1.",
        text: expect.stringContaining("Que es una sociedad valida."),
      }),
    );
    expect(pdfjsMock.GlobalWorkerOptions.workerSrc).toContain(
      "/pdfjs/pdf.worker.min.mjs",
    );
    expect(pdfjsMock.getDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        cMapPacked: true,
        cMapUrl: expect.stringContaining("/pdfjs/cmaps/"),
        iccUrl: expect.stringContaining("/pdfjs/iccs/"),
        standardFontDataUrl: expect.stringContaining("/pdfjs/standard_fonts/"),
        wasmUrl: expect.stringContaining("/pdfjs/wasm/"),
      }),
    );
  });

  it("rejects legacy .doc files with a migration hint", async () => {
    const file = new File(["legacy"], "legacy.doc", {
      type: "application/msword",
    });

    await expect(extractDocumentFromFile(file)).rejects.toThrow(/save the file as \.docx/i);
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

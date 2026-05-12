import {
  detectDocumentSourceKind,
  isLegacyWordDocument,
} from "@/features/ingest/detect/file-kind";
import { extractDocxTextFromArrayBuffer } from "./file-text-docx";
import { extractPdfDocumentFromArrayBuffer } from "./file-text-pdf";
import { extractRtfTextFromArrayBuffer } from "./file-text-rtf";
import type { DocumentBlockInput, DocumentSourceKind } from "@/types/document";

export {
  buildPdfBlocks,
  extractPdfDocumentFromArrayBuffer,
  extractPdfTextFromArrayBuffer,
  normalizePdfSourceBlocks,
  type ExtractedPdfDocument,
  type PdfLine,
} from "./file-text-pdf";

export interface ExtractedDocumentPayload {
  sourceKind: DocumentSourceKind;
  rawText: string;
  sourceBlocks?: DocumentBlockInput[];
  title: string;
}

function deriveTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/u, "");
}

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

async function extractDocxText(file: File) {
  return extractDocxTextFromArrayBuffer(await file.arrayBuffer());
}

async function extractRtfText(file: File) {
  return extractRtfTextFromArrayBuffer(await file.arrayBuffer());
}

async function extractTextByKind(file: File, sourceKind: DocumentSourceKind) {
  switch (sourceKind) {
    case "docx":
      return extractDocxText(file);
    case "rtf":
      return extractRtfText(file);
    case "markdown":
    case "plain-text":
      return normalizeExtractedText(await file.text());
    default:
      return "";
  }
}

export async function extractDocumentFromFile(
  file: File,
): Promise<ExtractedDocumentPayload> {
  if (isLegacyWordDocument(file.name, file.type)) {
    throw new Error(
      "Legacy .doc files are not supported yet. Save the file as .docx and upload that instead.",
    );
  }

  const sourceKind = detectDocumentSourceKind(file.name, file.type);
  if (!sourceKind) {
    throw new Error("This file type is not supported yet.");
  }

  if (sourceKind === "pdf") {
    const { rawText, sourceBlocks } = await extractPdfDocumentFromArrayBuffer(
      await file.arrayBuffer(),
    );

    return {
      sourceBlocks,
      sourceKind,
      rawText,
      title: deriveTitle(file.name),
    };
  }

  const rawText = await extractTextByKind(file, sourceKind);
  if (!rawText) {
    throw new Error("We couldn't extract any readable text from that file.");
  }

  return {
    sourceKind,
    rawText,
    title: deriveTitle(file.name),
  };
}

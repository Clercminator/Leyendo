import mammoth from "mammoth/mammoth.browser";

import { detectDocumentSourceKind } from "@/features/ingest/detect/file-kind";
import type { DocumentSourceKind } from "@/types/document";

export interface ExtractedDocumentPayload {
  sourceKind: DocumentSourceKind;
  rawText: string;
  title: string;
}

function deriveTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/u, "");
}

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

export async function extractPdfTextFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      pageTexts.push(pageText);
    }
  }

  const rawText = normalizeExtractedText(pageTexts.join("\n\n"));
  if (!rawText) {
    throw new Error(
      "This PDF appears to have no selectable text. Scanned PDFs are not supported in the MVP.",
    );
  }

  return rawText;
}

export async function extractDocxTextFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = normalizeExtractedText(result.value);

  if (!rawText) {
    throw new Error("We couldn't extract readable text from that DOCX file.");
  }

  return rawText;
}

async function extractPdfText(file: File) {
  return extractPdfTextFromArrayBuffer(await file.arrayBuffer());
}

async function extractDocxText(file: File) {
  return extractDocxTextFromArrayBuffer(await file.arrayBuffer());
}

async function extractTextByKind(file: File, sourceKind: DocumentSourceKind) {
  switch (sourceKind) {
    case "pdf":
      return extractPdfText(file);
    case "docx":
      return extractDocxText(file);
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
  const sourceKind = detectDocumentSourceKind(file.name, file.type);
  if (!sourceKind) {
    throw new Error("This file type is not supported yet.");
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

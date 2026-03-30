import type { DocumentSourceKind } from "@/types/document";

const extensionMap = new Map<string, DocumentSourceKind>([
  ["pdf", "pdf"],
  ["docx", "docx"],
  ["rtf", "rtf"],
  ["md", "markdown"],
  ["markdown", "markdown"],
  ["txt", "plain-text"],
]);

const legacyWordMimeTypes = new Set(["application/msword"]);

const plainTextMimeTypes = new Set(["text/plain"]);

const rtfMimeTypes = new Set([
  "application/rtf",
  "application/x-rtf",
  "text/rtf",
  "text/richtext",
]);

export function isLegacyWordDocument(fileName: string, mimeType?: string) {
  const normalizedMime = mimeType?.toLowerCase();
  if (normalizedMime && legacyWordMimeTypes.has(normalizedMime)) {
    return true;
  }

  return fileName.split(".").pop()?.toLowerCase() === "doc";
}

export function detectDocumentSourceKind(
  fileName: string,
  mimeType?: string,
): DocumentSourceKind | null {
  const normalizedMime = mimeType?.toLowerCase();
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : undefined;

  if (normalizedMime === "application/pdf") {
    return "pdf";
  }
  if (
    normalizedMime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (normalizedMime && rtfMimeTypes.has(normalizedMime)) {
    return "rtf";
  }
  if (normalizedMime === "text/markdown") {
    return "markdown";
  }
  if (extension) {
    return extensionMap.get(extension) ?? null;
  }

  if (normalizedMime && plainTextMimeTypes.has(normalizedMime)) {
    return "plain-text";
  }

  return null;
}

import type { DocumentSourceKind } from "@/types/document";

const extensionMap = new Map<string, DocumentSourceKind>([
  ["pdf", "pdf"],
  ["docx", "docx"],
  ["md", "markdown"],
  ["markdown", "markdown"],
  ["txt", "plain-text"],
]);

export function detectDocumentSourceKind(
  fileName: string,
  mimeType?: string,
): DocumentSourceKind | null {
  const normalizedMime = mimeType?.toLowerCase();
  if (normalizedMime === "application/pdf") {
    return "pdf";
  }
  if (
    normalizedMime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (normalizedMime === "text/markdown") {
    return "markdown";
  }
  if (normalizedMime?.startsWith("text/")) {
    return "plain-text";
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension ? (extensionMap.get(extension) ?? null) : null;
}

import type { DocumentSourceKind } from "@/types/document";

type PastedTextSourceKind = Extract<DocumentSourceKind, "plain-text" | "markdown">;

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

const markdownFencePattern = /^(```|~~~)/;
const markdownHeadingPattern = /^#{1,6}\s+\S/;
const markdownListItemPattern = /^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?\S/;
const markdownTaskListPattern = /^\s*(?:[-*+]|\d+\.)\s+\[[ xX]\]\s+\S/;
const markdownBlockquotePattern = /^\s*>\s+\S/;
const markdownTableRowPattern = /^\|.+\|$/;
const markdownTableSeparatorPattern =
  /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/;
const markdownLinkPattern = /\[[^\]]+\]\([^)]+\)/;
const markdownStrongPattern = /(\*\*|__)\S[\s\S]*?\1/;

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

export function detectPastedTextSourceKind(
  text: string,
): PastedTextSourceKind {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();

  if (!normalizedText) {
    return "plain-text";
  }

  const lines = normalizedText.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  const hasTable = lines.some((line, index) => {
    const currentLine = line.trim();
    const nextLine = lines[index + 1]?.trim();

    return (
      markdownTableRowPattern.test(currentLine) &&
      typeof nextLine === "string" &&
      markdownTableSeparatorPattern.test(nextLine)
    );
  });

  if (
    nonEmptyLines.some((line) => {
      const trimmedLine = line.trim();

      return (
        markdownFencePattern.test(trimmedLine) ||
        markdownHeadingPattern.test(trimmedLine) ||
        markdownBlockquotePattern.test(trimmedLine) ||
        markdownTaskListPattern.test(trimmedLine)
      );
    }) ||
    hasTable
  ) {
    return "markdown";
  }

  const listItemCount = nonEmptyLines.filter((line) => {
    return markdownListItemPattern.test(line);
  }).length;

  if (listItemCount >= 2) {
    return "markdown";
  }

  const inlineCueCount = [markdownLinkPattern, markdownStrongPattern].reduce(
    (count, pattern) => count + Number(pattern.test(normalizedText)),
    0,
  );

  if (
    inlineCueCount >= 2 ||
    (inlineCueCount >= 1 && normalizedText.includes("\n\n") && nonEmptyLines.length >= 2)
  ) {
    return "markdown";
  }

  return "plain-text";
}

import { buildDocumentModel } from "@/features/ingest/build/document-model";
import { deriveDocumentComplexityHints } from "@/features/ingest/build/document-complexity-hints";
import { clampChunkIndex } from "@/features/reader/engine/navigation";
import type { AppLocale } from "@/lib/locale";
import type { Chunk, DocumentComplexityHint, DocumentModel } from "@/types/document";
import type { ReaderMode } from "@/types/reader";

const LITERAL_PREFERRED_MARKDOWN_HINTS = new Set<DocumentComplexityHint>([
  "markdown-code-blocks",
  "markdown-mermaid-diagrams",
  "markdown-tables",
  "markdown-task-lists",
  "markdown-images",
  "markdown-html",
  "markdown-math",
  "markdown-footnotes",
]);

export function formatRemainingTimeLabel(ms: number, locale: AppLocale) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  switch (locale) {
    case "es":
      if (hours > 0) {
        return `Quedan ${hours}h ${minutes}m`;
      }

      if (minutes > 0) {
        return `Quedan ${minutes}m ${seconds}s`;
      }

      return `Quedan ${seconds}s`;
    case "pt":
      if (hours > 0) {
        return `Faltam ${hours}h ${minutes}m`;
      }

      if (minutes > 0) {
        return `Faltam ${minutes}m ${seconds}s`;
      }

      return `Faltam ${seconds}s`;
    default:
      if (hours > 0) {
        return `${hours}h ${minutes}m left`;
      }

      if (minutes > 0) {
        return `${minutes}m ${seconds}s left`;
      }

      return `${seconds}s left`;
  }
}

export function formatRemainingTimeAnnouncement(args: {
  locale: AppLocale;
  modeLabel: string;
  remainingMs: number;
  remainingWords: number;
  wordsPerMinute: number;
}) {
  const { locale, modeLabel, remainingMs, remainingWords, wordsPerMinute } =
    args;
  const timeLabel = formatRemainingTimeLabel(remainingMs, locale);

  switch (locale) {
    case "es":
      return `${timeLabel}. Estimado con ${remainingWords} palabras restantes, ${wordsPerMinute} palabras por minuto y el modo ${modeLabel}.`;
    case "pt":
      return `${timeLabel}. Estimativa com ${remainingWords} palavras restantes, ${wordsPerMinute} palavras por minuto e o modo ${modeLabel}.`;
    default:
      return `${timeLabel}. Estimated from ${remainingWords} words remaining, ${wordsPerMinute} words per minute, in ${modeLabel} mode.`;
  }
}

function normalizeChunkText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function findChunkIndexByText(
  chunks: Chunk[],
  anchorText: string | undefined,
  preferredIndex: number,
) {
  if (!anchorText) {
    return undefined;
  }

  const normalizedAnchor = normalizeChunkText(anchorText);
  if (!normalizedAnchor) {
    return undefined;
  }

  const matches: number[] = [];

  chunks.forEach((chunk, index) => {
    if (normalizeChunkText(chunk.text) === normalizedAnchor) {
      matches.push(index);
    }
  });

  if (matches.length === 0) {
    return undefined;
  }

  return matches.reduce((bestIndex, currentIndex) => {
    return Math.abs(currentIndex - preferredIndex) <
      Math.abs(bestIndex - preferredIndex)
      ? currentIndex
      : bestIndex;
  });
}

export function mapChunkIndexBetweenChunks(args: {
  anchorText?: string;
  currentChunkIndex: number;
  sourceChunks: Chunk[];
  targetChunks: Chunk[];
}) {
  const { anchorText, currentChunkIndex, sourceChunks, targetChunks } = args;

  if (targetChunks.length === 0) {
    return 0;
  }

  const progressRatio =
    sourceChunks.length <= 1
      ? 0
      : Math.max(0, currentChunkIndex) / (sourceChunks.length - 1);
  const preferredIndex =
    targetChunks.length <= 1
      ? 0
      : Math.round(progressRatio * (targetChunks.length - 1));
  const matchedIndex = findChunkIndexByText(
    targetChunks,
    anchorText,
    preferredIndex,
  );

  return clampChunkIndex(targetChunks.length, matchedIndex ?? preferredIndex);
}

export function rebuildStoredTextDocument(
  document: DocumentModel,
  sourceKind: Extract<DocumentModel["sourceKind"], "markdown" | "plain-text">,
) {
  const rawText = document.rawText?.trim() ? document.rawText : document.text;
  const rebuilt = buildDocumentModel({
    title: document.title,
    rawText,
    sourceKind,
  });

  return {
    ...rebuilt,
    id: document.id,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    pages: document.pages,
    rawText,
  } satisfies DocumentModel;
}

const LARGE_MARKDOWN_RAW_TEXT_THRESHOLD = 80_000;
const LARGE_MARKDOWN_BLOCK_THRESHOLD = 400;
const LARGE_MARKDOWN_SENTENCE_THRESHOLD = 2_000;
const LARGE_MARKDOWN_TOKEN_THRESHOLD = 20_000;

export function shouldSimplifyClassicMarkdown(
  document: DocumentModel | undefined,
): boolean {
  if (
    !document ||
    document.sourceKind !== "markdown" ||
    !document.rawText?.trim()
  ) {
    return false;
  }

  return (
    document.rawText.length >= LARGE_MARKDOWN_RAW_TEXT_THRESHOLD ||
    document.blocks.length >= LARGE_MARKDOWN_BLOCK_THRESHOLD ||
    document.sentences.length >= LARGE_MARKDOWN_SENTENCE_THRESHOLD ||
    document.tokens.length >= LARGE_MARKDOWN_TOKEN_THRESHOLD
  );
}

export function shouldPreferLiteralMarkdownForMode(args: {
  document: DocumentModel | undefined;
  mode: ReaderMode;
}): boolean {
  const { document, mode } = args;

  if (
    !document ||
    document.sourceKind !== "markdown" ||
    !document.rawText?.trim() ||
    mode === "classic-reader" ||
    mode === "pdf-page"
  ) {
    return false;
  }

  const complexityHints =
    document.complexityHints ??
    deriveDocumentComplexityHints({
      rawText: document.rawText,
      sourceKind: document.sourceKind,
    });

  return complexityHints.some((hint) =>
    LITERAL_PREFERRED_MARKDOWN_HINTS.has(hint),
  );
}
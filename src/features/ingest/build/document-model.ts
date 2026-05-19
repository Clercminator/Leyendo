import { nanoid } from "nanoid";

import { deriveDocumentComplexityHints } from "@/features/ingest/build/document-complexity-hints";
import { normalizeText } from "@/lib/text/normalize-text";
import type {
  Block,
  Chunk,
  DocumentBlockInput,
  DocumentInlineSpan,
  DocumentInlineSpanInput,
  DocumentModel,
  DocumentRecord,
  DocumentSourceKind,
  HeadingLevel,
  Section,
  SourcePage,
  Sentence,
  Token,
} from "@/types/document";
import { extractMarkdownBlocks } from "@/features/ingest/normalize/markdown-blocks";

export interface BuildDocumentModelInput {
  title?: string;
  rawText: string;
  sourceKind: DocumentSourceKind;
  sourceBlocks?: DocumentBlockInput[];
  chunkSize?: number;
}

interface MutableSection {
  title: string;
  blockIndexes: number[];
  chunkStart: number;
  chunkEnd: number;
  sourcePageIndex?: number;
}

const sentenceBoundary = /(?<=[.!?])\s+/;
const tokenBoundary = /\s+/;

function normalizeInlineSpanMatchText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00a0\u2007\u202f]/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function mergeAdjacentInlineSpans(spans: DocumentInlineSpan[]) {
  const merged: DocumentInlineSpan[] = [];

  spans.forEach((span) => {
    const previousSpan = merged.at(-1);

    if (
      previousSpan &&
      previousSpan.kind === span.kind &&
      previousSpan.tokenEnd + 1 >= span.tokenStart
    ) {
      previousSpan.tokenEnd = Math.max(previousSpan.tokenEnd, span.tokenEnd);
      return;
    }

    merged.push({ ...span });
  });

  return merged;
}

function resolveInlineSpans(
  inlineSpans: DocumentInlineSpanInput[] | undefined,
  blockTokens: Token[],
) {
  if (!inlineSpans?.length || blockTokens.length === 0) {
    return undefined;
  }

  const tokenKeys = blockTokens.map((token) =>
    normalizeInlineSpanMatchText(token.value),
  );
  const resolvedInlineSpans: DocumentInlineSpan[] = [];
  let searchCursor = 0;

  inlineSpans.forEach((inlineSpan) => {
    const spanKeys = normalizeInlineSpanMatchText(inlineSpan.text)
      .split(tokenBoundary)
      .map((part) => part.trim())
      .filter(Boolean);

    if (spanKeys.length === 0) {
      return;
    }

    let matchStart = -1;

    for (
      let start = searchCursor;
      start <= tokenKeys.length - spanKeys.length;
      start += 1
    ) {
      let matches = true;

      for (let offset = 0; offset < spanKeys.length; offset += 1) {
        if (tokenKeys[start + offset] !== spanKeys[offset]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        matchStart = start;
        break;
      }
    }

    if (matchStart < 0) {
      return;
    }

    const matchEnd = matchStart + spanKeys.length - 1;
    const startToken = blockTokens[matchStart];
    const endToken = blockTokens[matchEnd];

    if (!startToken || !endToken) {
      return;
    }

    resolvedInlineSpans.push({
      kind: inlineSpan.kind,
      tokenEnd: endToken.index,
      tokenStart: startToken.index,
    });
    searchCursor = matchEnd + 1;
  });

  const mergedInlineSpans = mergeAdjacentInlineSpans(resolvedInlineSpans);
  return mergedInlineSpans.length > 0 ? mergedInlineSpans : undefined;
}

function buildPlainTextBlocks(rawText: string): DocumentBlockInput[] {
  const normalized = normalizeText(rawText);

  return normalized.paragraphs.map((paragraph) => ({
    kind: "paragraph" as const,
    text: paragraph,
  }));
}

function resolveBlocks(input: BuildDocumentModelInput) {
  if (input.sourceBlocks && input.sourceBlocks.length > 0) {
    return input.sourceBlocks;
  }

  if (input.sourceKind === "markdown") {
    const markdownBlocks = extractMarkdownBlocks(input.rawText);
    if (markdownBlocks.length > 0) {
      return markdownBlocks;
    }
  }

  return buildPlainTextBlocks(input.rawText);
}

function deriveTitle(
  inputTitle: string | undefined,
  blocks: DocumentBlockInput[],
) {
  const explicitTitle = inputTitle?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const heading = blocks.find((block) => block.kind === "heading")?.text;
  if (heading) {
    return heading;
  }

  return blocks[0]?.text.slice(0, 60) || "Untitled document";
}

function deriveExcerpt(
  sourceKind: DocumentSourceKind,
  blocks: DocumentBlockInput[],
) {
  const excerptBlocks =
    sourceKind === "pdf"
      ? blocks.filter((block) => block.text !== "[Image omitted from PDF]")
      : blocks;
  const excerptSourceBlocks =
    excerptBlocks.length > 0 ? excerptBlocks : blocks;

  return excerptSourceBlocks.map((block) => block.text).join("\n\n").slice(0, 180);
}

function normalizeHeadingLevel(
  headingLevel: number | undefined,
): HeadingLevel | undefined {
  if (typeof headingLevel !== "number" || !Number.isFinite(headingLevel)) {
    return undefined;
  }

  return Math.max(1, Math.min(6, Math.round(headingLevel))) as HeadingLevel;
}

function normalizeDepthValue(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.round(value));
}

function deriveSourcePages(blocks: Block[], tokens: Token[]): SourcePage[] {
  const pages = new Map<number, SourcePage>();

  blocks.forEach((block) => {
    if (typeof block.sourcePageIndex !== "number") {
      return;
    }

    const startToken = tokens[block.tokenStart];
    const endToken = tokens[block.tokenEnd];
    const sourceStartOffset = startToken?.absoluteOffset ?? 0;
    const sourceEndOffset = endToken
      ? endToken.absoluteOffset + endToken.value.length
      : sourceStartOffset;
    const existingPage = pages.get(block.sourcePageIndex);

    if (existingPage) {
      existingPage.sourceStartOffset = Math.min(
        existingPage.sourceStartOffset,
        sourceStartOffset,
      );
      existingPage.sourceEndOffset = Math.max(
        existingPage.sourceEndOffset,
        sourceEndOffset,
      );
      return;
    }

    pages.set(block.sourcePageIndex, {
      index: block.sourcePageIndex,
      label: String(block.sourcePageIndex + 1),
      sourceStartOffset,
      sourceEndOffset,
    });
  });

  return [...pages.values()].sort((left, right) => left.index - right.index);
}

export function buildDocumentModel({
  title,
  rawText,
  sourceKind,
  sourceBlocks,
  chunkSize = 2,
}: BuildDocumentModelInput): DocumentModel {
  const timestamp = new Date().toISOString();
  const id = nanoid();
  const resolvedBlocks = resolveBlocks({
    title,
    rawText,
    sourceKind,
    sourceBlocks,
    chunkSize,
  }).filter((block) => block.text.trim().length > 0);
  const complexityHints = deriveDocumentComplexityHints({
    rawText,
    sourceKind,
  });
  const normalizedText = resolvedBlocks.map((block) => block.text).join("\n\n");
  const excerpt = deriveExcerpt(sourceKind, resolvedBlocks);

  const blocks: Block[] = [];
  const sentences: Sentence[] = [];
  const tokens: Token[] = [];
  const chunks: Chunk[] = [];
  const sections: MutableSection[] = [];

  let tokenIndex = 0;
  let sentenceIndex = 0;
  let chunkIndex = 0;
  let absoluteOffset = 0;
  let currentSection: MutableSection | undefined;

  const startSection = (
    heading: string,
    blockIndex: number,
    sourcePageIndex?: number,
  ) => {
    if (currentSection) {
      currentSection.chunkEnd = Math.max(
        currentSection.chunkEnd,
        chunkIndex - 1,
      );
    }

    currentSection = {
      title: heading,
      blockIndexes: [blockIndex],
      chunkStart: chunkIndex,
      chunkEnd: chunkIndex,
      sourcePageIndex,
    };

    sections.push(currentSection);
  };

  resolvedBlocks.forEach((sourceBlock, blockIndex) => {
    if (!currentSection) {
      startSection(
        sourceBlock.kind === "heading" ? sourceBlock.text : "Document",
        blockIndex,
        sourceBlock.sourcePageIndex,
      );
    } else if (sourceBlock.kind === "heading") {
      startSection(sourceBlock.text, blockIndex, sourceBlock.sourcePageIndex);
    } else {
      currentSection.blockIndexes.push(blockIndex);
      currentSection.sourcePageIndex ??= sourceBlock.sourcePageIndex;
    }

    const blockSentenceStart = sentenceIndex;
    const blockTokenStart = tokenIndex;
    const blockSentences = sourceBlock.text
      .split(sentenceBoundary)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    blockSentences.forEach((sentenceText) => {
      const sentenceTokenStart = tokenIndex;
      const sentenceTokens = sentenceText
        .split(tokenBoundary)
        .map((token) => token.trim())
        .filter(Boolean);

      sentenceTokens.forEach((value) => {
        tokens.push({
          index: tokenIndex,
          value,
          normalizedValue: value.toLowerCase(),
          paragraphIndex: blockIndex,
          sentenceIndex,
          sourcePageIndex: sourceBlock.sourcePageIndex,
          absoluteOffset,
        });
        absoluteOffset += value.length + 1;
        tokenIndex += 1;
      });

      const sentenceTokenEnd = tokenIndex - 1;

      sentences.push({
        index: sentenceIndex,
        paragraphIndex: blockIndex,
        sourcePageIndex: sourceBlock.sourcePageIndex,
        text: sentenceText,
        tokenStart: sentenceTokenStart,
        tokenEnd: sentenceTokenEnd,
      });

      for (
        let cursor = sentenceTokenStart;
        cursor <= sentenceTokenEnd;
        cursor += chunkSize
      ) {
        const tokenSlice = tokens.slice(
          cursor,
          Math.min(cursor + chunkSize, sentenceTokenEnd + 1),
        );
        chunks.push({
          index: chunkIndex,
          text: tokenSlice.map((token) => token.value).join(" "),
          tokenIndexes: tokenSlice.map((token) => token.index),
          anchorTokenIndex: tokenSlice[0]?.index ?? sentenceTokenStart,
          paragraphIndex: blockIndex,
          sentenceIndex,
          sectionIndex: sections.length - 1,
          sourcePageIndex: sourceBlock.sourcePageIndex,
          absoluteReadingPosition: chunkIndex,
        });
        chunkIndex += 1;
      }

      sentenceIndex += 1;
    });

    const blockSentenceEnd = sentenceIndex - 1;
    const blockTokenEnd = tokenIndex - 1;
    const blockInlineSpans = resolveInlineSpans(
      sourceBlock.inlineSpans,
      tokens.slice(blockTokenStart, tokenIndex),
    );

    blocks.push({
      alignment: sourceBlock.alignment,
      headingLevel: normalizeHeadingLevel(sourceBlock.headingLevel),
      indentLevel: normalizeDepthValue(sourceBlock.indentLevel),
      index: blockIndex,
      inlineSpans: blockInlineSpans,
      kind: sourceBlock.kind,
      listDepth: normalizeDepthValue(sourceBlock.listDepth),
      marker: sourceBlock.marker,
      pageBreakBefore: sourceBlock.pageBreakBefore === true,
      sourcePageIndex: sourceBlock.sourcePageIndex,
      text: sourceBlock.text,
      sentenceStart: blockSentenceStart,
      sentenceEnd: blockSentenceEnd,
      tokenStart: blockTokenStart,
      tokenEnd: blockTokenEnd,
    });
  });

  if (currentSection) {
    currentSection.chunkEnd = Math.max(currentSection.chunkEnd, chunkIndex - 1);
  }

  const finalizedSections: Section[] = sections.map((section, index) => ({
    index,
    title: section.title,
    blockIndexes: section.blockIndexes,
    chunkStart: section.chunkStart,
    chunkEnd: section.chunkEnd,
    sourcePageIndex: section.sourcePageIndex,
  }));

  return {
    id,
    title: deriveTitle(title, resolvedBlocks),
    sourceKind,
    createdAt: timestamp,
    updatedAt: timestamp,
    rawText,
    complexityHints,
    text: normalizedText,
    excerpt,
    pages: deriveSourcePages(blocks, tokens),
    blocks,
    sentences,
    tokens,
    chunks,
    sections: finalizedSections,
  };
}

export function toDocumentRecord(model: DocumentModel): DocumentRecord {
  return {
    id: model.id,
    title: model.title,
    sourceKind: model.sourceKind,
    excerpt: model.excerpt,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    totalChunks: model.chunks.length,
    totalSections: model.sections.length,
    payload: model,
  };
}

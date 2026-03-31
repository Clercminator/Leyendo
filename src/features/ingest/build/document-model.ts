import { nanoid } from "nanoid";

import { normalizeText } from "@/lib/text/normalize-text";
import type {
  Block,
  Chunk,
  DocumentBlockInput,
  DocumentModel,
  DocumentRecord,
  DocumentSourceKind,
  Section,
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
  const normalizedText = resolvedBlocks.map((block) => block.text).join("\n\n");
  const excerpt = normalizedText.slice(0, 180);

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

    blocks.push({
      alignment: sourceBlock.alignment,
      index: blockIndex,
      kind: sourceBlock.kind,
      marker: sourceBlock.marker,
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
    text: normalizedText,
    excerpt,
    pages: [],
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

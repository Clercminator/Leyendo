import type { Chunk, DocumentModel } from "@/types/document";
import type { ReadingSession } from "@/types/reader";
import { measureSync } from "@/lib/perf/instrumentation";

const runtimeChunkCache = new WeakMap<DocumentModel, Map<number, Chunk[]>>();

export function deriveRuntimeChunks(
  document: DocumentModel,
  chunkSize: number,
) {
  const normalizedChunkSize = Math.max(1, chunkSize);
  const cachedChunksBySize = runtimeChunkCache.get(document);
  const cachedChunks = cachedChunksBySize?.get(normalizedChunkSize);

  if (cachedChunks) {
    return cachedChunks;
  }

  const chunks = measureSync(
    "reader.derive-runtime-chunks",
    {
      chunkSize: normalizedChunkSize,
      sentenceCount: document.sentences.length,
      tokenCount: document.tokens.length,
      cached: false,
    },
    () => {
      const sectionIndexByBlock = new Map<number, number>();

      document.sections.forEach((section) => {
        section.blockIndexes.forEach((blockIndex) => {
          sectionIndexByBlock.set(blockIndex, section.index);
        });
      });

      const nextChunks: Chunk[] = [];
      let chunkIndex = 0;

      document.sentences.forEach((sentence) => {
        const sentenceTokens = document.tokens.slice(
          sentence.tokenStart,
          sentence.tokenEnd + 1,
        );

        for (
          let cursor = 0;
          cursor < sentenceTokens.length;
          cursor += normalizedChunkSize
        ) {
          const tokenSlice = sentenceTokens.slice(
            cursor,
            cursor + normalizedChunkSize,
          );

          nextChunks.push({
            index: chunkIndex,
            text: tokenSlice.map((token) => token.value).join(" "),
            tokenIndexes: tokenSlice.map((token) => token.index),
            paragraphIndex: sentence.paragraphIndex,
            sentenceIndex: sentence.index,
            sectionIndex: sectionIndexByBlock.get(sentence.paragraphIndex) ?? 0,
            sourcePageIndex: sentence.sourcePageIndex,
            absoluteReadingPosition: chunkIndex,
          });

          chunkIndex += 1;
        }
      });

      return nextChunks;
    },
  );

  if (cachedChunksBySize) {
    cachedChunksBySize.set(normalizedChunkSize, chunks);
  } else {
    runtimeChunkCache.set(document, new Map([[normalizedChunkSize, chunks]]));
  }

  return chunks;
}

export function clampChunkIndex(totalChunks: number, index: number) {
  if (totalChunks <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, totalChunks - 1));
}

export function jumpChunkIndex(
  totalChunks: number,
  currentChunkIndex: number,
  delta: number,
) {
  return clampChunkIndex(totalChunks, currentChunkIndex + delta);
}

export function repeatChunkIndex(currentChunkIndex: number) {
  return currentChunkIndex;
}

export function findChunkIndexByToken(chunks: Chunk[], tokenIndex: number) {
  const exactIndex = chunks.findIndex((chunk) =>
    chunk.tokenIndexes.includes(tokenIndex),
  );

  if (exactIndex >= 0) {
    return exactIndex;
  }

  const nextChunkIndex = chunks.findIndex((chunk) => {
    const startTokenIndex = chunk.tokenIndexes[0];
    return startTokenIndex !== undefined && startTokenIndex > tokenIndex;
  });

  if (nextChunkIndex >= 0) {
    return nextChunkIndex;
  }

  return clampChunkIndex(chunks.length, chunks.length - 1);
}

export function resolveSessionChunkIndex(
  chunks: Chunk[],
  session?: Pick<ReadingSession, "currentChunkIndex" | "currentTokenIndex">,
) {
  if (chunks.length === 0) {
    return 0;
  }

  if (!session) {
    return 0;
  }

  if (
    Number.isInteger(session.currentTokenIndex) &&
    session.currentTokenIndex >= 0
  ) {
    return findChunkIndexByToken(chunks, session.currentTokenIndex);
  }

  return clampChunkIndex(chunks.length, session.currentChunkIndex);
}

export function restartParagraphChunkIndex(
  chunks: Chunk[],
  currentChunkIndex: number,
) {
  const activeChunk = chunks[currentChunkIndex];
  if (!activeChunk) {
    return 0;
  }

  const firstChunkInParagraph = chunks.find(
    (chunk) => chunk.paragraphIndex === activeChunk.paragraphIndex,
  );

  return firstChunkInParagraph?.index ?? currentChunkIndex;
}

export function deriveParagraphTokenRange(
  document: DocumentModel,
  paragraphIndex: number,
) {
  const paragraph = document.blocks[paragraphIndex];
  if (!paragraph || paragraph.tokenEnd < paragraph.tokenStart) {
    return [];
  }

  return document.tokens.slice(paragraph.tokenStart, paragraph.tokenEnd + 1);
}

export function deriveReaderProgress(
  document: Pick<DocumentModel, "chunks">,
  currentChunkIndex: number,
) {
  const totalChunks = document.chunks.length;
  if (totalChunks <= 1) {
    return 100;
  }

  return Math.min(
    100,
    Math.round((currentChunkIndex / (totalChunks - 1)) * 100),
  );
}

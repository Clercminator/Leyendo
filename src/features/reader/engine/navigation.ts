import type { Chunk, DocumentModel, Token } from "@/types/document";
import {
  defaultReaderPreferences,
  type ReaderPreferences,
  type ReadingSession,
} from "@/types/reader";
import { measureSync } from "@/lib/perf/instrumentation";

type RuntimeChunkOptions = Pick<
  ReaderPreferences,
  "mode" | "chunkSize" | "focusWindow"
>;

const runtimeChunkCache = new WeakMap<DocumentModel, Map<string, Chunk[]>>();

const phraseBoundaryConnectors = new Set([
  "and",
  "but",
  "or",
  "so",
  "because",
  "that",
  "which",
  "who",
  "while",
  "when",
  "where",
  "with",
  "without",
  "through",
  "into",
  "from",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "after",
  "before",
  "sobre",
  "para",
  "con",
  "sin",
  "porque",
  "cuando",
  "mientras",
  "com",
  "sem",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "que",
  "como",
  "quando",
  "enquanto",
  "por",
]);

function normalizeRuntimeChunkOptions(
  options: number | RuntimeChunkOptions,
): RuntimeChunkOptions {
  const focusWindow = Math.max(
    1,
    Math.min(
      4,
      typeof options === "number"
        ? defaultReaderPreferences.focusWindow
        : options.focusWindow,
    ),
  ) as RuntimeChunkOptions["focusWindow"];

  if (typeof options === "number") {
    return {
      mode: "classic-reader",
      chunkSize: Math.max(1, options),
      focusWindow,
    };
  }

  return {
    mode: options.mode,
    chunkSize: Math.max(1, options.chunkSize),
    focusWindow,
  };
}

function createRuntimeChunkCacheKey(options: RuntimeChunkOptions) {
  return `${options.mode}:${options.chunkSize}:${options.focusWindow}`;
}

function buildSectionIndexByBlock(document: DocumentModel) {
  const sectionIndexByBlock = new Map<number, number>();

  document.sections.forEach((section) => {
    section.blockIndexes.forEach((blockIndex) => {
      sectionIndexByBlock.set(blockIndex, section.index);
    });
  });

  return sectionIndexByBlock;
}

function createChunk(args: {
  anchorTokenIndex: number;
  index: number;
  paragraphIndex: number;
  sectionIndex: number;
  sentenceIndex: number;
  sourcePageIndex?: number;
  tokens: Token[];
}) {
  return {
    index: args.index,
    text: args.tokens.map((token) => token.value).join(" "),
    tokenIndexes: args.tokens.map((token) => token.index),
    anchorTokenIndex: args.anchorTokenIndex,
    paragraphIndex: args.paragraphIndex,
    sentenceIndex: args.sentenceIndex,
    sectionIndex: args.sectionIndex,
    sourcePageIndex: args.sourcePageIndex,
    absoluteReadingPosition: args.index,
  } satisfies Chunk;
}

function hasTerminalBoundary(text: string) {
  return /[.!?]["')\]]?$/.test(text.trim());
}

function hasSoftBoundary(text: string) {
  return /[,;:]["')\]]?$/.test(text.trim());
}

function shouldBreakPhraseChunk(args: {
  currentTokens: Token[];
  nextToken?: Token;
  targetWords: number;
}) {
  const { currentTokens, nextToken, targetWords } = args;
  const lastToken = currentTokens.at(-1);

  if (!lastToken || !nextToken) {
    return true;
  }

  if (hasTerminalBoundary(lastToken.value)) {
    return true;
  }

  if (currentTokens.length >= 2 && hasSoftBoundary(lastToken.value)) {
    return true;
  }

  if (
    currentTokens.length >= Math.max(2, targetWords - 1) &&
    phraseBoundaryConnectors.has(nextToken.normalizedValue)
  ) {
    return true;
  }

  return currentTokens.length >= targetWords + 1;
}

function shouldBreakGuidedLine(args: {
  currentLength: number;
  currentTokens: Token[];
  nextToken?: Token;
  targetChars: number;
}) {
  const { currentLength, currentTokens, nextToken, targetChars } = args;
  const lastToken = currentTokens.at(-1);
  const hardLimit = targetChars + 16;

  if (!lastToken || !nextToken) {
    return true;
  }

  if (currentLength < targetChars) {
    return false;
  }

  if (hasTerminalBoundary(lastToken.value)) {
    return true;
  }

  if (currentTokens.length >= 3 && hasSoftBoundary(lastToken.value)) {
    return true;
  }

  if (
    currentTokens.length >= 4 &&
    phraseBoundaryConnectors.has(nextToken.normalizedValue)
  ) {
    return true;
  }

  return currentLength >= hardLimit;
}

function buildClassicReaderChunks(
  document: DocumentModel,
  options: RuntimeChunkOptions,
) {
  const sectionIndexByBlock = buildSectionIndexByBlock(document);
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
      cursor += options.chunkSize
    ) {
      const tokenSlice = sentenceTokens.slice(
        cursor,
        cursor + options.chunkSize,
      );

      nextChunks.push(
        createChunk({
          anchorTokenIndex: tokenSlice[0]?.index ?? sentence.tokenStart,
          index: chunkIndex,
          paragraphIndex: sentence.paragraphIndex,
          sectionIndex: sectionIndexByBlock.get(sentence.paragraphIndex) ?? 0,
          sentenceIndex: sentence.index,
          sourcePageIndex: sentence.sourcePageIndex,
          tokens: tokenSlice,
        }),
      );
      chunkIndex += 1;
    }
  });

  return nextChunks;
}

function buildFocusWordChunks(
  document: DocumentModel,
  options: RuntimeChunkOptions,
) {
  const sectionIndexByBlock = buildSectionIndexByBlock(document);
  const windowRadius = Math.max(
    0,
    Math.max(options.chunkSize, options.focusWindow) - 1,
  );
  const nextChunks: Chunk[] = [];
  let chunkIndex = 0;

  document.sentences.forEach((sentence) => {
    const sentenceTokens = document.tokens.slice(
      sentence.tokenStart,
      sentence.tokenEnd + 1,
    );

    sentenceTokens.forEach((token, sentenceTokenIndex) => {
      const start = Math.max(0, sentenceTokenIndex - windowRadius);
      const end = Math.min(
        sentenceTokens.length,
        sentenceTokenIndex + windowRadius + 1,
      );
      const tokenSlice = sentenceTokens.slice(start, end);

      nextChunks.push(
        createChunk({
          anchorTokenIndex: token.index,
          index: chunkIndex,
          paragraphIndex: sentence.paragraphIndex,
          sectionIndex: sectionIndexByBlock.get(sentence.paragraphIndex) ?? 0,
          sentenceIndex: sentence.index,
          sourcePageIndex: sentence.sourcePageIndex,
          tokens: tokenSlice,
        }),
      );
      chunkIndex += 1;
    });
  });

  return nextChunks;
}

function buildPhraseChunks(
  document: DocumentModel,
  options: RuntimeChunkOptions,
) {
  const sectionIndexByBlock = buildSectionIndexByBlock(document);
  const targetWords = Math.max(2, Math.min(6, options.chunkSize + 1));
  const nextChunks: Chunk[] = [];
  let chunkIndex = 0;

  document.sentences.forEach((sentence) => {
    const sentenceTokens = document.tokens.slice(
      sentence.tokenStart,
      sentence.tokenEnd + 1,
    );
    let currentTokens: Token[] = [];

    sentenceTokens.forEach((token, sentenceTokenIndex) => {
      currentTokens.push(token);

      if (
        !shouldBreakPhraseChunk({
          currentTokens,
          nextToken: sentenceTokens[sentenceTokenIndex + 1],
          targetWords,
        })
      ) {
        return;
      }

      nextChunks.push(
        createChunk({
          anchorTokenIndex: currentTokens[0]?.index ?? sentence.tokenStart,
          index: chunkIndex,
          paragraphIndex: sentence.paragraphIndex,
          sectionIndex: sectionIndexByBlock.get(sentence.paragraphIndex) ?? 0,
          sentenceIndex: sentence.index,
          sourcePageIndex: sentence.sourcePageIndex,
          tokens: currentTokens,
        }),
      );
      currentTokens = [];
      chunkIndex += 1;
    });
  });

  return nextChunks;
}

function buildGuidedLineChunks(
  document: DocumentModel,
  options: RuntimeChunkOptions,
) {
  const sectionIndexByBlock = buildSectionIndexByBlock(document);
  const targetChars = 24 + options.chunkSize * 10;
  const nextChunks: Chunk[] = [];
  let chunkIndex = 0;

  document.blocks
    .filter((block) => block.tokenEnd >= block.tokenStart)
    .forEach((block) => {
      const paragraphTokens = document.tokens.slice(
        block.tokenStart,
        block.tokenEnd + 1,
      );
      let currentTokens: Token[] = [];
      let currentLength = 0;

      paragraphTokens.forEach((token, paragraphTokenIndex) => {
        currentTokens.push(token);
        currentLength += token.value.length;

        if (currentTokens.length > 1) {
          currentLength += 1;
        }

        if (
          !shouldBreakGuidedLine({
            currentLength,
            currentTokens,
            nextToken: paragraphTokens[paragraphTokenIndex + 1],
            targetChars,
          })
        ) {
          return;
        }

        nextChunks.push(
          createChunk({
            anchorTokenIndex: currentTokens[0]?.index ?? block.tokenStart,
            index: chunkIndex,
            paragraphIndex: block.index,
            sectionIndex: sectionIndexByBlock.get(block.index) ?? 0,
            sentenceIndex:
              currentTokens[0]?.sentenceIndex ?? block.sentenceStart,
            sourcePageIndex: block.sourcePageIndex,
            tokens: currentTokens,
          }),
        );
        currentTokens = [];
        currentLength = 0;
        chunkIndex += 1;
      });
    });

  return nextChunks;
}

export function deriveRuntimeChunks(
  document: DocumentModel,
  options: number | RuntimeChunkOptions,
) {
  const normalizedOptions = normalizeRuntimeChunkOptions(options);
  const cacheKey = createRuntimeChunkCacheKey(normalizedOptions);
  const cachedChunksByKey = runtimeChunkCache.get(document);
  const cachedChunks = cachedChunksByKey?.get(cacheKey);

  if (cachedChunks) {
    return cachedChunks;
  }

  const chunks = measureSync(
    "reader.derive-runtime-chunks",
    {
      chunkSize: normalizedOptions.chunkSize,
      focusWindow: normalizedOptions.focusWindow,
      mode: normalizedOptions.mode,
      sentenceCount: document.sentences.length,
      tokenCount: document.tokens.length,
      cached: false,
    },
    () => {
      switch (normalizedOptions.mode) {
        case "focus-word":
          return buildFocusWordChunks(document, normalizedOptions);
        case "phrase-chunk":
          return buildPhraseChunks(document, normalizedOptions);
        case "guided-line":
          return buildGuidedLineChunks(document, normalizedOptions);
        default:
          return buildClassicReaderChunks(document, normalizedOptions);
      }
    },
  );

  if (cachedChunksByKey) {
    cachedChunksByKey.set(cacheKey, chunks);
  } else {
    runtimeChunkCache.set(document, new Map([[cacheKey, chunks]]));
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
  const anchorMatchIndex = chunks.findIndex(
    (chunk) => chunk.anchorTokenIndex === tokenIndex,
  );

  if (anchorMatchIndex >= 0) {
    return anchorMatchIndex;
  }

  const exactIndex = chunks.findIndex((chunk) =>
    chunk.tokenIndexes.includes(tokenIndex),
  );

  if (exactIndex >= 0) {
    return exactIndex;
  }

  const nextChunkIndex = chunks.findIndex((chunk) => {
    return chunk.anchorTokenIndex > tokenIndex;
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

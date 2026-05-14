import { nanoid } from "nanoid";

import { normalizeText } from "@/lib/text/normalize-text";
import type { DocumentModel } from "@/types/document";

export interface PdfOutlineItem {
  id: string;
  title: string;
  pageIndex: number | null;
  items: PdfOutlineItem[];
}

export interface PdfSelectionAnchor {
  tokenIndex: number;
  paragraphIndex: number;
  sectionIndex: number;
  sourcePageIndex: number | null;
}

interface PdfTokenSequenceMatch {
  contextScore: number;
  prefixMatches: number;
  startIndex: number;
  suffixMatches: number;
}

interface PdfOutlineNodeInput {
  title: string;
  dest: string | unknown[] | null;
  items: PdfOutlineNodeInput[];
}

interface PdfDocumentNavigationSource {
  getDestination(id: string): Promise<unknown[] | null>;
  getOutline(): Promise<PdfOutlineNodeInput[] | null>;
  getPageIndex(ref: { num: number; gen: number }): Promise<number>;
}

function getSectionIndexForParagraph(
  document: DocumentModel,
  paragraphIndex: number,
) {
  return (
    document.sections.find((section) =>
      section.blockIndexes.includes(paragraphIndex),
    )?.index ?? 0
  );
}

function resolveAnchorFromTokenIndex(
  document: DocumentModel,
  tokenIndex: number,
): PdfSelectionAnchor | null {
  const token = document.tokens[tokenIndex];

  if (!token) {
    return null;
  }

  return {
    tokenIndex: token.index,
    paragraphIndex: token.paragraphIndex,
    sectionIndex: getSectionIndexForParagraph(document, token.paragraphIndex),
    sourcePageIndex: token.sourcePageIndex ?? null,
  };
}

function findMatchingTokenSequenceMatches(args: {
  document: DocumentModel;
  queryTokens: string[];
  pageIndex?: number;
}) {
  const { document, queryTokens, pageIndex } = args;
  const maxStartIndex = document.tokens.length - queryTokens.length;
  const matches: number[] = [];

  for (let startIndex = 0; startIndex <= maxStartIndex; startIndex += 1) {
    const startToken = document.tokens[startIndex];

    if (!startToken) {
      continue;
    }

    if (
      typeof pageIndex === "number" &&
      startToken.sourcePageIndex !== pageIndex
    ) {
      continue;
    }

    let isMatch = true;

    for (let offset = 0; offset < queryTokens.length; offset += 1) {
      if (
        document.tokens[startIndex + offset]?.normalizedValue !==
        queryTokens[offset]
      ) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      matches.push(startIndex);
    }
  }

  return matches;
}

function normalizeContextTokens(text: string | undefined) {
  if (!text?.trim()) {
    return [] as string[];
  }

  return normalizeText(text).tokens.map((token) => token.toLowerCase());
}

function countPrefixMatches(document: DocumentModel, startIndex: number, prefixTokens: string[]) {
  let matches = 0;

  for (let offset = 1; offset <= prefixTokens.length; offset += 1) {
    if (
      document.tokens[startIndex - offset]?.normalizedValue !==
      prefixTokens[prefixTokens.length - offset]
    ) {
      break;
    }

    matches += 1;
  }

  return matches;
}

function countSuffixMatches(
  document: DocumentModel,
  startIndex: number,
  queryLength: number,
  suffixTokens: string[],
) {
  let matches = 0;

  for (let offset = 0; offset < suffixTokens.length; offset += 1) {
    if (
      document.tokens[startIndex + queryLength + offset]?.normalizedValue !==
      suffixTokens[offset]
    ) {
      break;
    }

    matches += 1;
  }

  return matches;
}

function compareTokenSequenceMatches(
  left: PdfTokenSequenceMatch,
  right: PdfTokenSequenceMatch,
  preferredTokenIndex: number | undefined,
) {
  if (left.contextScore !== right.contextScore) {
    return right.contextScore - left.contextScore;
  }

  if (typeof preferredTokenIndex === "number") {
    const leftDistance = Math.abs(left.startIndex - preferredTokenIndex);
    const rightDistance = Math.abs(right.startIndex - preferredTokenIndex);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
  }

  if (left.prefixMatches !== right.prefixMatches) {
    return right.prefixMatches - left.prefixMatches;
  }

  if (left.suffixMatches !== right.suffixMatches) {
    return right.suffixMatches - left.suffixMatches;
  }

  return left.startIndex - right.startIndex;
}

function resolveBestTokenSequenceMatch(args: {
  document: DocumentModel;
  pageIndex?: number;
  preferredTokenIndex?: number;
  prefixText?: string;
  queryTokens: string[];
  suffixText?: string;
}) {
  const matches = findMatchingTokenSequenceMatches({
    document: args.document,
    pageIndex: args.pageIndex,
    queryTokens: args.queryTokens,
  });

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0] ?? null;
  }

  const prefixTokens = normalizeContextTokens(args.prefixText);
  const suffixTokens = normalizeContextTokens(args.suffixText);
  const scoredMatches = matches.map((startIndex) => {
    const prefixMatches = countPrefixMatches(
      args.document,
      startIndex,
      prefixTokens,
    );
    const suffixMatches = countSuffixMatches(
      args.document,
      startIndex,
      args.queryTokens.length,
      suffixTokens,
    );

    return {
      contextScore: prefixMatches * 2 + suffixMatches * 2,
      prefixMatches,
      startIndex,
      suffixMatches,
    } satisfies PdfTokenSequenceMatch;
  });

  scoredMatches.sort((left, right) =>
    compareTokenSequenceMatches(left, right, args.preferredTokenIndex),
  );

  return scoredMatches[0]?.startIndex ?? null;
}

function resolveBestBlockMatch(args: {
  document: DocumentModel;
  normalizedQuery: string;
  pageIndex?: number;
  preferredTokenIndex?: number;
}) {
  const matchingBlocks = args.document.blocks.filter((block) => {
    if (
      typeof args.pageIndex === "number" &&
      block.sourcePageIndex !== args.pageIndex
    ) {
      return false;
    }

    return normalizeText(block.text)
      .raw.toLowerCase()
      .includes(args.normalizedQuery);
  });

  if (matchingBlocks.length === 0) {
    return null;
  }

  matchingBlocks.sort((left, right) => {
    if (typeof args.preferredTokenIndex === "number") {
      const leftDistance = Math.abs(left.tokenStart - args.preferredTokenIndex);
      const rightDistance = Math.abs(
        right.tokenStart - args.preferredTokenIndex,
      );

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
    }

    return left.tokenStart - right.tokenStart;
  });

  return matchingBlocks[0] ?? null;
}

export function resolvePdfSelectionAnchor(args: {
  document: DocumentModel;
  pageIndex?: number;
  preferredTokenIndex?: number;
  prefixText?: string;
  quote: string;
  suffixText?: string;
}) {
  const {
    document,
    pageIndex,
    preferredTokenIndex,
    prefixText,
    quote,
    suffixText,
  } = args;
  const normalizedQuote = normalizeText(quote);
  const queryTokens = normalizedQuote.tokens.map((token) =>
    token.toLowerCase(),
  );

  if (queryTokens.length === 0) {
    return null;
  }

  const exactTokenIndex = resolveBestTokenSequenceMatch({
    document,
    pageIndex,
    preferredTokenIndex,
    prefixText,
    queryTokens,
    suffixText,
  });

  if (typeof exactTokenIndex === "number") {
    return resolveAnchorFromTokenIndex(document, exactTokenIndex);
  }

  const normalizedQuery = normalizedQuote.raw.toLowerCase();
  const blockMatch = resolveBestBlockMatch({
    document,
    normalizedQuery,
    pageIndex,
    preferredTokenIndex,
  });

  if (!blockMatch) {
    return null;
  }

  return {
    tokenIndex: blockMatch.tokenStart,
    paragraphIndex: blockMatch.index,
    sectionIndex: getSectionIndexForParagraph(document, blockMatch.index),
    sourcePageIndex: blockMatch.sourcePageIndex ?? pageIndex ?? null,
  };
}

export function resolveSourcePageIndexForAnchor(
  document: DocumentModel,
  anchor: {
    chunkIndex?: number;
    tokenIndex?: number;
    paragraphIndex?: number;
    sourcePageIndex?: number;
  },
) {
  if (typeof anchor.sourcePageIndex === "number") {
    return anchor.sourcePageIndex;
  }

  const chunkPageIndex =
    typeof anchor.chunkIndex === "number"
      ? document.chunks[anchor.chunkIndex]?.sourcePageIndex
      : undefined;

  if (typeof chunkPageIndex === "number") {
    return chunkPageIndex;
  }

  const tokenPageIndex =
    typeof anchor.tokenIndex === "number"
      ? document.tokens[anchor.tokenIndex]?.sourcePageIndex
      : undefined;

  if (typeof tokenPageIndex === "number") {
    return tokenPageIndex;
  }

  const blockPageIndex =
    typeof anchor.paragraphIndex === "number"
      ? document.blocks[anchor.paragraphIndex]?.sourcePageIndex
      : undefined;

  return typeof blockPageIndex === "number" ? blockPageIndex : null;
}

export async function resolvePdfDestinationPageIndex(
  pdfDocument: PdfDocumentNavigationSource,
  dest: string | unknown[] | null,
) {
  if (!dest) {
    return null;
  }

  const explicitDestination =
    typeof dest === "string" ? await pdfDocument.getDestination(dest) : dest;

  if (!Array.isArray(explicitDestination)) {
    return null;
  }

  const [destinationRef] = explicitDestination;

  if (
    destinationRef &&
    typeof destinationRef === "object" &&
    "num" in destinationRef &&
    "gen" in destinationRef &&
    typeof destinationRef.num === "number" &&
    typeof destinationRef.gen === "number"
  ) {
    return pdfDocument.getPageIndex({
      gen: destinationRef.gen,
      num: destinationRef.num,
    });
  }

  return Number.isInteger(destinationRef) ? Number(destinationRef) : null;
}

async function resolveOutlineNode(
  pdfDocument: PdfDocumentNavigationSource,
  node: PdfOutlineNodeInput,
): Promise<PdfOutlineItem> {
  const items = await Promise.all(
    node.items.map((childNode) => resolveOutlineNode(pdfDocument, childNode)),
  );

  return {
    id: nanoid(),
    items,
    pageIndex: await resolvePdfDestinationPageIndex(pdfDocument, node.dest),
    title: node.title.trim() || "Untitled bookmark",
  };
}

export async function buildResolvedPdfOutline(
  pdfDocument: PdfDocumentNavigationSource,
) {
  const outline = await pdfDocument.getOutline();

  if (!outline || outline.length === 0) {
    return [] as PdfOutlineItem[];
  }

  return Promise.all(
    outline.map((outlineNode) => resolveOutlineNode(pdfDocument, outlineNode)),
  );
}

export function getPdfPageLabel(
  pageIndex: number,
  pageLabels: string[] | null,
) {
  return pageLabels?.[pageIndex] ?? String(pageIndex + 1);
}

export function resolvePdfPageInput(args: {
  input: string;
  pageCount: number;
  pageLabels: string[] | null;
}) {
  const { input, pageCount, pageLabels } = args;
  const normalizedInput = input.trim().toLowerCase();

  if (!normalizedInput || pageCount <= 0) {
    return null;
  }

  const matchingLabelIndex =
    pageLabels?.findIndex((pageLabel) => {
      return pageLabel.trim().toLowerCase() === normalizedInput;
    }) ?? -1;

  if (matchingLabelIndex >= 0) {
    return matchingLabelIndex;
  }

  if (!/^\d+$/.test(normalizedInput)) {
    return null;
  }

  const pageIndex = Number(normalizedInput) - 1;

  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
    return null;
  }

  return pageIndex;
}

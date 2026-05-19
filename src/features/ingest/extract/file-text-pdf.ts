import { getPdfAssetUrl, loadPdfJs } from "@/lib/pdf/pdfjs";
import type {
  DocumentBlockInput,
  DocumentInlineSpanInput,
} from "@/types/document";

export interface ExtractedPdfDocument {
  rawText: string;
  sourceBlocks: DocumentBlockInput[];
}

export interface PdfExtractionProgress {
  pageCount: number;
  processedPages: number;
}

export interface ExtractPdfDocumentOptions {
  onProgress?: (progress: PdfExtractionProgress) => void;
  pageBatchSize?: number;
}

interface PdfFragment {
  fontName?: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
}

export interface PdfLine {
  boldTextRatio?: number;
  center: number;
  entryKind: "text" | "image-placeholder";
  fontSize: number;
  isBold?: boolean;
  inlineSpans?: DocumentInlineSpanInput[];
  left: number;
  pageIndex: number;
  pageWidth: number;
  right: number;
  text: string;
  y: number;
}

type PdfTransformMatrix = [number, number, number, number, number, number];

const DOCUMENT_PAYLOAD_EMPTY_ERROR =
  "This PDF appears to have no selectable text. Scanned PDFs are not supported in the MVP.";
const DEFAULT_PDF_PAGE_BATCH_SIZE = 4;
const pdfIdentityTransform: PdfTransformMatrix = [1, 0, 0, 1, 0, 0];
const pdfCompatCharacterMap = new Map<string, string>([
  ["\uF0A7", "▪"],
  ["\uF0B7", "•"],
  ["ﬀ", "ff"],
  ["ﬁ", "fi"],
  ["ﬂ", "fl"],
  ["ﬃ", "ffi"],
  ["ﬄ", "ffl"],
  ["ﬅ", "st"],
  ["ﬆ", "st"],
]);

const pdfListMarkerPattern =
  /^((?:\d+\.)+\d*[.)]?|(?:\([A-Za-z0-9]+\)|§+\s*\d+[A-Za-z0-9.-]*|(?:\d+|[A-Za-z]|[IVXLCDMivxlcdm]+)[.)]|[•◦▪■●○◆◇‣⁃∙·]|[-*–—]))\s+(.+)$/u;
const pdfOrdinalHeadingPattern =
  /^(?:primero|segundo|tercero|cuarto|quinto|sexto|s[ée]ptimo|octavo|noveno|d[ée]cimo|und[ée]cimo|duod[ée]cimo)(?::|\.|-)/iu;
const pdfLegalHeadingPrefixPattern =
  /^(?:(?:art(?:[íi]culo)?|cap(?:[íi]tulo)?|t(?:[íi]tulo)?|secci(?:[óo]n)?|anexo|ap(?:[ée]ndice)?|bases?)\s+[A-Z0-9IVXLCDM]+)/iu;
const pdfUppercaseLegalHeadingPattern =
  /^(?:[A-ZÁÉÍÓÚÜÑ0-9][A-ZÁÉÍÓÚÜÑ0-9 ,;()\/-]{4,}:)$/u;
const pdfSpacedUppercaseHeadingPattern =
  /(?:\b(?:[A-ZÁÉÍÓÚÜÑ]\s+){2,}[A-ZÁÉÍÓÚÜÑ](?=\s*[:.]))/gu;

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function normalizePdfTextArtifacts(text: string) {
  const normalizedText = text
    .replace(/\u0000/g, "")
    .replace(/\u00ad(?=\s|$)/gu, "-")
    .replace(/\u00ad/gu, "")
    .replace(/[\u200b\u200c\u200d\u2060\ufeff]/gu, "")
    .replace(/[\u00a0\u2007\u202f]/gu, " ")
    .replace(/[\u2010\u2011]/gu, "-");

  return Array.from(normalizedText, (character) => {
    return pdfCompatCharacterMap.get(character) ?? character;
  }).join("");
}

function normalizePdfFragmentText(text: string) {
  return normalizePdfTextArtifacts(text).replace(/\s+/g, " ").trim();
}

function normalizePdfBlockText(text: string) {
  return normalizePdfTextArtifacts(text)
    .replace(pdfSpacedUppercaseHeadingPattern, (match) =>
      match.replace(/\s+/g, ""),
    )
    .replace(/\s+/g, " ")
    .replace(/([\p{L}\p{N}])-\s+(?=[\p{Ll}\p{N}])/gu, "$1")
    .replace(/\s+([,;:!?%)\]])/g, "$1")
    .replace(/([(¿¡])\s+/g, "$1")
    .trim();
}

function normalizeInlineSpanInputs(
  inlineSpans: DocumentInlineSpanInput[] | undefined,
) {
  if (!inlineSpans?.length) {
    return undefined;
  }

  const normalizedInlineSpans = inlineSpans
    .map((inlineSpan) => ({
      ...inlineSpan,
      text: normalizePdfBlockText(inlineSpan.text),
    }))
    .filter((inlineSpan) => inlineSpan.text.length > 0);

  return normalizedInlineSpans.length > 0 ? normalizedInlineSpans : undefined;
}

function appendInlineSpanInputs(
  currentInlineSpans: DocumentInlineSpanInput[] | undefined,
  nextInlineSpans: DocumentInlineSpanInput[] | undefined,
) {
  if (!currentInlineSpans?.length && !nextInlineSpans?.length) {
    return undefined;
  }

  const mergedInlineSpans = [
    ...(currentInlineSpans ?? []),
    ...(nextInlineSpans ?? []),
  ].filter((inlineSpan) => inlineSpan.text.trim().length > 0);

  return mergedInlineSpans.length > 0 ? mergedInlineSpans : undefined;
}

function stripLeadingMarkerFromInlineSpans(
  inlineSpans: DocumentInlineSpanInput[] | undefined,
  marker: string,
) {
  if (!inlineSpans?.length) {
    return undefined;
  }

  const firstInlineSpan = inlineSpans[0];
  if (!firstInlineSpan) {
    return undefined;
  }

  const markerPrefix = `${marker} `;
  let nextFirstText = firstInlineSpan.text;

  if (nextFirstText.startsWith(markerPrefix)) {
    nextFirstText = nextFirstText.slice(markerPrefix.length).trimStart();
  } else if (nextFirstText === marker) {
    nextFirstText = "";
  } else if (nextFirstText.startsWith(marker)) {
    nextFirstText = nextFirstText.slice(marker.length).trimStart();
  }

  const strippedInlineSpans = [
    ...(nextFirstText
      ? [
          {
            ...firstInlineSpan,
            text: nextFirstText,
          },
        ]
      : []),
    ...inlineSpans.slice(1),
  ];

  return strippedInlineSpans.length > 0 ? strippedInlineSpans : undefined;
}

function serializeSourceBlocks(blocks: DocumentBlockInput[]) {
  return normalizeExtractedText(
    blocks
      .map((block) => {
        const markerPrefix = block.marker ? `${block.marker} ` : "";
        return `${markerPrefix}${block.text}`.trim();
      })
      .join("\n\n"),
  );
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle] ?? 0;
}

function isMostlyUppercase(text: string) {
  const letters = Array.from(text).filter((character) =>
    /\p{L}/u.test(character),
  );

  if (letters.length < 8) {
    return false;
  }

  const uppercaseCount = letters.filter(
    (character) => character === character.toUpperCase(),
  ).length;

  return uppercaseCount / letters.length >= 0.72;
}

function isCenteredLine(line: PdfLine) {
  return Math.abs(line.center - line.pageWidth / 2) <= line.pageWidth * 0.12;
}

function isLikelyPdfBodyParagraphLine(line: PdfLine, bodyFontSize: number) {
  return (
    line.entryKind === "text" &&
    line.text.trim().length >= 24 &&
    line.fontSize <= bodyFontSize * 1.15 &&
    !isLegalHeadingText(line.text) &&
    !extractBlockMarker(line.text)
  );
}

function hasCompatiblePdfParagraphAlignment(
  previousLine: PdfLine,
  currentLine: PdfLine,
  bodyFontSize: number,
) {
  const previousCentered = isCenteredLine(previousLine);
  const currentCentered = isCenteredLine(currentLine);

  if (previousCentered === currentCentered) {
    return true;
  }

  if (
    !isLikelyPdfBodyParagraphLine(previousLine, bodyFontSize) ||
    !isLikelyPdfBodyParagraphLine(currentLine, bodyFontSize)
  ) {
    return false;
  }

  const rightEdgeDelta = Math.abs(previousLine.right - currentLine.right);
  const centerDelta = Math.abs(previousLine.center - currentLine.center);

  return (
    rightEdgeDelta <= Math.max(bodyFontSize * 4.5, 28) &&
    centerDelta <= Math.max(bodyFontSize * 4.5, previousLine.pageWidth * 0.06)
  );
}

function isLegalHeadingText(text: string) {
  const normalized = text.trim();

  if (!normalized) {
    return false;
  }

  if (
    pdfUppercaseLegalHeadingPattern.test(normalized) ||
    pdfOrdinalHeadingPattern.test(normalized)
  ) {
    return true;
  }

  if (!pdfLegalHeadingPrefixPattern.test(normalized) || normalized.length > 140) {
    return false;
  }

  return (
    isMostlyUppercase(normalized) ||
    !/[.!?]["')\]]?$/u.test(normalized)
  );
}

function extractBlockMarker(text: string) {
  const match = text.match(pdfListMarkerPattern);

  if (!match) {
    return null;
  }

  return {
    marker: match[1]!.trim(),
    text: match[2]!.trim(),
  };
}

function isBoldPdfFontName(fontName: string | undefined) {
  return Boolean(
    fontName &&
      /(bold|black|heavy|semibold|demi|extrabold|ultrabold)/iu.test(fontName),
  );
}

function isDropCapFragment(fragment: PdfFragment, neighbors: PdfFragment[]) {
  if (fragment.text.replace(/\s/g, "").length !== 1) {
    return false;
  }

  const neighborHeights = neighbors
    .filter((neighbor) => neighbor !== fragment && neighbor.text.trim().length > 0)
    .map((neighbor) => neighbor.height);

  if (neighborHeights.length === 0) {
    return false;
  }

  const medianNeighborHeight =
    neighborHeights.sort((a, b) => a - b)[
      Math.floor(neighborHeights.length / 2)
    ] ?? 0;

  return fragment.height >= medianNeighborHeight * 1.8;
}

function buildPdfLineContent(fragments: PdfFragment[]) {
  let output = "";
  let currentStrongText = "";
  const inlineSpans: DocumentInlineSpanInput[] = [];
  // Track the last fragment that produced actual content for accurate gap
  // calculation, since PDFs may insert zero-height space fragments as
  // explicit word separators.
  let lastContentFragment: PdfFragment | undefined;
  let hasExplicitSeparator = false;

  const flushStrongText = () => {
    const text = normalizePdfBlockText(currentStrongText);

    currentStrongText = "";

    if (!text) {
      return;
    }

    inlineSpans.push({
      kind: "strong",
      text,
    });
  };

  fragments.forEach((fragment) => {
    const content = normalizePdfFragmentText(fragment.text);
    if (!content) {
      // This is a whitespace-only or empty fragment (common in PDFs as
      // explicit word separators with zero height). Mark that a separator
      // exists so adjacent content fragments get a space between them.
      if (lastContentFragment && /^\s+$/.test(fragment.text)) {
        hasExplicitSeparator = true;
      }
      return;
    }

    let prefix = "";

    if (lastContentFragment) {
      const gap = fragment.x - lastContentFragment.right;
      const referenceHeight = Math.min(
        lastContentFragment.height,
        fragment.height,
      );
      const separatorThreshold = Math.max(2.5, referenceHeight * 0.28);
      const startsWithPunctuation = /^[,.;:!?%)\]]/u.test(content);

      // Use a lower threshold when fonts change (bold↔regular) since
      // reported widths may be slightly inaccurate across font switches.
      const fontChanged =
        isBoldPdfFontName(lastContentFragment.fontName) !==
        isBoldPdfFontName(fragment.fontName);
      const fontChangeThreshold = fontChanged
        ? Math.max(1.2, referenceHeight * 0.12)
        : separatorThreshold;
      const effectiveThreshold = Math.min(
        separatorThreshold,
        fontChangeThreshold,
      );

      // Suppress space insertion between a drop cap and its continuation
      const previousIsDropCap = isDropCapFragment(
        lastContentFragment,
        fragments,
      );
      const suppressDropCapSpace =
        previousIsDropCap && /^[A-ZÁÉÍÓÚÜÑ]/u.test(content);

      if (
        !startsWithPunctuation &&
        !output.endsWith("-") &&
        !suppressDropCapSpace &&
        (hasExplicitSeparator || gap > effectiveThreshold)
      ) {
        prefix = " ";
      }
    }

    hasExplicitSeparator = false;
    lastContentFragment = fragment;
    output += prefix;

    if (isBoldPdfFontName(fragment.fontName)) {
      currentStrongText += currentStrongText
        ? `${prefix}${content}`
        : `${prefix}${content}`.trimStart();
    } else {
      flushStrongText();
    }

    output += content;
  });

  flushStrongText();

  return {
    inlineSpans: normalizeInlineSpanInputs(inlineSpans),
    text: output.trim(),
  };
}

function buildPdfLines(items: unknown[], pageIndex: number, pageWidth: number) {
  const fragments = items
    .flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        !("str" in item) ||
        !("transform" in item) ||
        !Array.isArray(item.transform)
      ) {
        return [];
      }

      const text = typeof item.str === "string" ? item.str : "";
      const transform = item.transform as number[];
      const x = typeof transform[4] === "number" ? transform[4] : 0;
      const y = typeof transform[5] === "number" ? transform[5] : 0;
      const width =
        "width" in item && typeof item.width === "number"
          ? item.width
          : Math.abs(typeof transform[0] === "number" ? transform[0] : 0);
      const height = Math.abs(
        "height" in item && typeof item.height === "number"
          ? item.height
          : typeof transform[3] === "number"
            ? transform[3]
            : 0,
      );
      const fontName =
        "fontName" in item && typeof item.fontName === "string"
          ? item.fontName
          : undefined;
      const normalizedText = normalizePdfFragmentText(text);
      const isExplicitSeparatorFragment =
        !normalizedText && /^\s+$/u.test(normalizePdfTextArtifacts(text));

      if (!normalizedText && !isExplicitSeparatorFragment) {
        return [];
      }

      return [
        {
          fontName,
          height,
          right: x + width,
          text,
          width,
          x,
          y,
        } satisfies PdfFragment,
      ];
    })
    .sort((left, right) => {
      const verticalDistance = Math.abs(left.y - right.y);
      if (verticalDistance <= Math.max(left.height, right.height) * 0.35) {
        return left.x - right.x;
      }

      return right.y - left.y;
    });

  const groups: PdfFragment[][] = [];

  fragments.forEach((fragment) => {
    const currentGroup = groups.at(-1);
    if (!currentGroup || currentGroup.length === 0) {
      groups.push([fragment]);
      return;
    }

    const referenceY =
      currentGroup.reduce((total, item) => total + item.y, 0) /
      currentGroup.length;
    const prospectiveGroup = [...currentGroup, fragment];
    const fragmentIsDropCap = isDropCapFragment(fragment, prospectiveGroup);
    const nonDropCapGroupHeights = currentGroup
      .filter((item) => !isDropCapFragment(item, prospectiveGroup))
      .map((item) => item.height);
    // Let a drop cap attract its continuation line, but do not let the
    // enlarged drop-cap height cause later body lines to collapse into the
    // same line group.
    const groupHeightForTolerance =
      fragmentIsDropCap || nonDropCapGroupHeights.length === 0
        ? Math.max(...currentGroup.map((item) => item.height))
        : Math.max(...nonDropCapGroupHeights);
    const tolerance = Math.max(
      2,
      fragment.height * 0.45,
      groupHeightForTolerance * 0.45,
    );

    if (Math.abs(referenceY - fragment.y) <= tolerance) {
      currentGroup.push(fragment);
      return;
    }

    groups.push([fragment]);
  });

  return groups
    .map<PdfLine | null>((group) => {
      const sortedGroup = [...group].sort((left, right) => left.x - right.x);
      const lineContent = buildPdfLineContent(sortedGroup);
      const text = lineContent.text;

      if (!text) {
        return null;
      }

      const left = Math.min(...sortedGroup.map((fragment) => fragment.x));
      const right = Math.max(...sortedGroup.map((fragment) => fragment.right));
      // Exclude drop cap fragments from font size calculation to avoid
      // inflating the line's fontSize and causing false heading detection.
      const nonDropCapFragments = sortedGroup.filter(
        (fragment) => !isDropCapFragment(fragment, sortedGroup),
      );
      const fontSizeFragments =
        nonDropCapFragments.length > 0 ? nonDropCapFragments : sortedGroup;
      const fontSize = median(fontSizeFragments.map((fragment) => fragment.height));
      const boldTextLength =
        lineContent.inlineSpans?.reduce((total, inlineSpan) => {
          return inlineSpan.kind === "strong"
            ? total + inlineSpan.text.length
            : total;
        }, 0) ?? 0;

      return {
        boldTextRatio: text.length > 0 ? boldTextLength / text.length : 0,
        center: left + (right - left) / 2,
        entryKind: "text",
        fontSize,
        isBold: sortedGroup.some((fragment) =>
          isBoldPdfFontName(fragment.fontName),
        ),
        inlineSpans: lineContent.inlineSpans,
        left,
        pageIndex,
        pageWidth,
        right,
        text,
        y: median(sortedGroup.map((fragment) => fragment.y)),
      } satisfies PdfLine;
    })
    .filter((line): line is PdfLine => line !== null);
}

function isPdfTransformMatrix(value: unknown): value is PdfTransformMatrix {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

function multiplyPdfTransforms(
  left: PdfTransformMatrix,
  right: PdfTransformMatrix,
): PdfTransformMatrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function applyPdfTransform(
  transform: PdfTransformMatrix,
  x: number,
  y: number,
) {
  return {
    x: transform[0] * x + transform[2] * y + transform[4],
    y: transform[1] * x + transform[3] * y + transform[5],
  };
}

function buildPdfImageLine(
  transform: PdfTransformMatrix,
  pageIndex: number,
  pageWidth: number,
) {
  const corners = [
    applyPdfTransform(transform, 0, 0),
    applyPdfTransform(transform, 1, 0),
    applyPdfTransform(transform, 0, -1),
    applyPdfTransform(transform, 1, -1),
  ];
  const left = Math.min(...corners.map((corner) => corner.x));
  const right = Math.max(...corners.map((corner) => corner.x));
  const bottom = Math.min(...corners.map((corner) => corner.y));
  const top = Math.max(...corners.map((corner) => corner.y));
  const width = right - left;
  const height = top - bottom;

  if (width < 24 || height < 24 || width * height < 900) {
    return null;
  }

  return {
    center: left + width / 2,
    entryKind: "image-placeholder",
    fontSize: 12,
    left,
    pageIndex,
    pageWidth,
    right,
    text: "[Image omitted from PDF]",
    y: bottom + height / 2,
  } satisfies PdfLine;
}

function extractPdfImageLines(
  operatorList: unknown,
  pageIndex: number,
  pageWidth: number,
  ops: Record<string, number> | undefined,
) {
  if (
    !ops ||
    !operatorList ||
    typeof operatorList !== "object" ||
    !("fnArray" in operatorList) ||
    !("argsArray" in operatorList) ||
    !Array.isArray(operatorList.fnArray) ||
    !Array.isArray(operatorList.argsArray)
  ) {
    return [];
  }

  const { argsArray, fnArray } = operatorList;
  const imageLines: PdfLine[] = [];
  const transformStack: PdfTransformMatrix[] = [[...pdfIdentityTransform]];

  const appendImageLine = (transform: PdfTransformMatrix) => {
    const imageLine = buildPdfImageLine(transform, pageIndex, pageWidth);
    const previousImageLine = imageLines.at(-1);

    if (!imageLine) {
      return;
    }

    if (
      previousImageLine &&
      Math.abs(previousImageLine.left - imageLine.left) <= 1 &&
      Math.abs(previousImageLine.right - imageLine.right) <= 1 &&
      Math.abs(previousImageLine.y - imageLine.y) <= 1
    ) {
      return;
    }

    imageLines.push(imageLine);
  };

  const currentTransform = () =>
    transformStack[transformStack.length - 1] ?? pdfIdentityTransform;

  fnArray.forEach((fn, index) => {
    const args = argsArray[index];

    if (fn === ops.save) {
      transformStack.push([...currentTransform()]);
      return;
    }

    if (fn === ops.restore) {
      if (transformStack.length > 1) {
        transformStack.pop();
      }
      return;
    }

    if (fn === ops.transform && isPdfTransformMatrix(args)) {
      transformStack[transformStack.length - 1] = multiplyPdfTransforms(
        currentTransform(),
        args,
      );
      return;
    }

    if (fn === ops.paintFormXObjectBegin) {
      transformStack.push([...currentTransform()]);

      if (
        Array.isArray(args) &&
        isPdfTransformMatrix(args[0]) &&
        transformStack.length > 0
      ) {
        transformStack[transformStack.length - 1] = multiplyPdfTransforms(
          currentTransform(),
          args[0],
        );
      }

      return;
    }

    if (fn === ops.paintFormXObjectEnd) {
      if (transformStack.length > 1) {
        transformStack.pop();
      }
      return;
    }

    if (fn === ops.paintImageXObject || fn === ops.paintInlineImageXObject) {
      appendImageLine(currentTransform());
      return;
    }

    if (fn === ops.paintImageXObjectRepeat && Array.isArray(args)) {
      const scaleX = args[1];
      const scaleY = args[2];
      const positions = args[3];

      if (
        typeof scaleX === "number" &&
        typeof scaleY === "number" &&
        Array.isArray(positions)
      ) {
        for (
          let positionIndex = 0;
          positionIndex < positions.length;
          positionIndex += 2
        ) {
          const x = positions[positionIndex];
          const y = positions[positionIndex + 1];

          if (typeof x !== "number" || typeof y !== "number") {
            continue;
          }

          appendImageLine(
            multiplyPdfTransforms(currentTransform(), [
              scaleX,
              0,
              0,
              scaleY,
              x,
              y,
            ]),
          );
        }
      }
      return;
    }

    if (fn === ops.paintInlineImageXObjectGroup && Array.isArray(args)) {
      const map = args[1];

      if (!Array.isArray(map)) {
        return;
      }

      map.forEach((entry) => {
        if (
          entry &&
          typeof entry === "object" &&
          "transform" in entry &&
          isPdfTransformMatrix(entry.transform)
        ) {
          appendImageLine(
            multiplyPdfTransforms(currentTransform(), entry.transform),
          );
        }
      });
    }
  });

  return imageLines;
}

function isHeadingLine(line: PdfLine, bodyFontSize: number) {
  const shortLine = line.text.length <= 120;
  const oversized = line.fontSize >= bodyFontSize * 1.18;
  const boldStandalone = Boolean(
    line.isBold &&
      (line.boldTextRatio === undefined || line.boldTextRatio >= 0.68) &&
      line.text.length <= 72,
  );

  if (!shortLine) {
    return false;
  }

  if (isLegalHeadingText(line.text)) {
    return true;
  }

  if (
    isCenteredLine(line) &&
    (oversized || boldStandalone || isMostlyUppercase(line.text))
  ) {
    return true;
  }

  return (oversized || boldStandalone) && line.text.length <= 90;
}

function isPdfContentsLine(text: string) {
  return /(?:\.{2,}|\s{2,}|…+)\s*(?:\d+|[ivxlcdm]+)$/iu.test(text.trim());
}

function isPdfFrontMatterMetaLine(text: string) {
  const normalized = text.trim().toLowerCase();

  return /(?:translated by|published by|copyright|all rights reserved|isbn\b|www\.|https?:\/\/|@)/iu.test(
    normalized,
  );
}

function isPdfFrontMatterHeaderNoise(text: string) {
  const normalized = normalizePdfBlockText(text).trim().toLowerCase();

  return /^(?:gerencia de(?:\s+resoluci[óo]n electr[óo]nica)?|resoluci[óo]n electr[óo]nica)$/iu.test(
    normalized,
  );
}

function isPdfImagePlaceholderBlock(block: DocumentBlockInput) {
  return block.kind === "paragraph" && block.text === "[Image omitted from PDF]";
}

function isLikelyPdfCoverTitleBlock(block: DocumentBlockInput) {
  if (block.sourcePageIndex !== 0 || isPdfImagePlaceholderBlock(block)) {
    return false;
  }

  const text = block.text.trim();

  if (!text || isPdfFrontMatterHeaderNoise(text)) {
    return false;
  }

  return (
    block.kind === "heading" ||
    (text.length >= 18 && isMostlyUppercase(text))
  );
}

function cleanupPdfFrontMatterBlocks(blocks: DocumentBlockInput[]) {
  const coverTitleIndex = blocks.findIndex((block) =>
    isLikelyPdfCoverTitleBlock(block),
  );

  if (coverTitleIndex <= 0) {
    return blocks;
  }

  return blocks.filter((block, index) => {
    if (block.sourcePageIndex !== 0 || index >= coverTitleIndex) {
      return true;
    }

    if (isPdfImagePlaceholderBlock(block)) {
      return false;
    }

    return !isPdfFrontMatterHeaderNoise(block.text);
  });
}

function isStandalonePdfLine(line: PdfLine, bodyFontSize: number) {
  if (line.entryKind === "image-placeholder") {
    return true;
  }

  if (isPdfContentsLine(line.text)) {
    return true;
  }

  if (line.pageIndex <= 1 && isPdfFrontMatterMetaLine(line.text)) {
    return true;
  }

  if (
    line.pageIndex <= 1 &&
    isCenteredLine(line) &&
    line.text.length <= 90 &&
    !/[.!?]["')\]]?$/u.test(line.text.trim())
  ) {
    return true;
  }

  return (
    isCenteredLine(line) &&
    line.text.length <= 60 &&
    line.fontSize >= bodyFontSize * 1.08
  );
}

function shouldMergePdfParagraphLine(
  previousLine: PdfLine,
  currentLine: PdfLine,
  bodyFontSize: number,
) {
  if (
    isLegalHeadingText(previousLine.text) ||
    isLegalHeadingText(currentLine.text) ||
    extractBlockMarker(currentLine.text)
  ) {
    return false;
  }

  if (previousLine.pageIndex !== currentLine.pageIndex) {
    return false;
  }

  const previousCentered = isCenteredLine(previousLine);
  const currentCentered = isCenteredLine(currentLine);
  const compatibleAlignment = hasCompatiblePdfParagraphAlignment(
    previousLine,
    currentLine,
    bodyFontSize,
  );

  // Allow merging when BOTH lines are centered if they look like body text
  // (similar font size to body, long enough to be paragraph content).
  if (!compatibleAlignment) {
    return false;
  }

  if (previousCentered && currentCentered) {
    const bothBodySized =
      previousLine.fontSize <= bodyFontSize * 1.15 &&
      currentLine.fontSize <= bodyFontSize * 1.15;
    const bothLongEnough =
      previousLine.text.length >= 30 || currentLine.text.length >= 30;

    if (!bothBodySized || !bothLongEnough) {
      return false;
    }
  }

  const verticalGap = Math.abs(previousLine.y - currentLine.y);
  const gapThreshold = Math.max(
    bodyFontSize * 2.2,
    previousLine.fontSize * 2.2,
  );

  if (verticalGap > gapThreshold) {
    return false;
  }

  const indentDelta = Math.abs(previousLine.left - currentLine.left);
  if (indentDelta <= Math.max(bodyFontSize * 3.2, 18)) {
    return true;
  }

  const previousEndsOpen = !/[.!?]["')\]]?$/u.test(previousLine.text.trim());
  return previousEndsOpen && indentDelta <= Math.max(bodyFontSize * 6, 36);
}

function shouldMergePdfParagraphBlocks(
  previousBlock: DocumentBlockInput,
  currentBlock: DocumentBlockInput,
) {
  if (previousBlock.kind !== "paragraph" || currentBlock.kind !== "paragraph") {
    return false;
  }

  if (previousBlock.sourcePageIndex !== currentBlock.sourcePageIndex) {
    return false;
  }

  const previousAlignment = previousBlock.alignment ?? "left";
  const currentAlignment = currentBlock.alignment ?? "left";
  if (previousAlignment !== currentAlignment) {
    return false;
  }

  // For centered blocks, only allow merging when both look like body text
  // (long enough to be paragraph content, not short titles/captions).
  if (currentAlignment === "center") {
    const previousLong = (previousBlock.text?.length ?? 0) >= 30;
    const currentLong = (currentBlock.text?.length ?? 0) >= 30;
    if (!previousLong && !currentLong) {
      return false;
    }
  }

  if (
    isPdfContentsLine(previousBlock.text) ||
    isPdfContentsLine(currentBlock.text) ||
    isPdfFrontMatterMetaLine(previousBlock.text) ||
    isPdfFrontMatterMetaLine(currentBlock.text)
  ) {
    return false;
  }

  const previousText = previousBlock.text.trim();
  const currentText = currentBlock.text.trim();

  if (!previousText || !currentText) {
    return false;
  }

  if (
    isLegalHeadingText(previousText) ||
    isLegalHeadingText(currentText) ||
    extractBlockMarker(previousText) ||
    extractBlockMarker(currentText)
  ) {
    return false;
  }

  if (/\[Image omitted from PDF\]/u.test(previousText + currentText)) {
    return false;
  }

  if (/-$/u.test(previousText)) {
    return true;
  }

  if (/[.!?]["')\]]?$/u.test(previousText)) {
    return false;
  }

  return /^[a-zà-ÿ(\["'0-9]/u.test(currentText);
}

export function normalizePdfSourceBlocks(blocks: DocumentBlockInput[]) {
  const normalizedBlocks: DocumentBlockInput[] = [];

  blocks.forEach((block) => {
    const normalizedBlock = {
      ...block,
      inlineSpans: normalizeInlineSpanInputs(block.inlineSpans),
      text: normalizePdfBlockText(block.text),
    } satisfies DocumentBlockInput;

    if (!normalizedBlock.text) {
      return;
    }

    const previousBlock = normalizedBlocks.at(-1);
    if (
      !previousBlock ||
      !shouldMergePdfParagraphBlocks(previousBlock, normalizedBlock)
    ) {
      normalizedBlocks.push(normalizedBlock);
      return;
    }

    previousBlock.text = normalizePdfBlockText(
      `${previousBlock.text} ${normalizedBlock.text}`,
    );
    previousBlock.inlineSpans = appendInlineSpanInputs(
      previousBlock.inlineSpans,
      normalizedBlock.inlineSpans,
    );
  });

  return cleanupPdfFrontMatterBlocks(normalizedBlocks);
}

export function buildPdfBlocks(lines: PdfLine[]) {
  const bodyFontSize =
    median(
      lines
        .filter((line) => line.text.length > 32)
        .map((line) => line.fontSize),
    ) ||
    median(lines.map((line) => line.fontSize)) ||
    12;
  const blocks: DocumentBlockInput[] = [];
  let currentBlock: DocumentBlockInput | undefined;
  let previousLine: PdfLine | undefined;

  const flushCurrentBlock = () => {
    if (!currentBlock) {
      return;
    }

    const text = currentBlock.text.trim();
    if (!text) {
      currentBlock = undefined;
      return;
    }

    blocks.push({
      ...currentBlock,
      text,
    });
    currentBlock = undefined;
  };

  lines.forEach((line) => {
    const pageChanged = previousLine
      ? previousLine.pageIndex !== line.pageIndex
      : false;
    const largeGap =
      !previousLine ||
      pageChanged ||
      !shouldMergePdfParagraphLine(previousLine, line, bodyFontSize);
    const alignment = isCenteredLine(line) ? "center" : "left";
    const marker = extractBlockMarker(line.text);

    if (line.entryKind === "image-placeholder") {
      flushCurrentBlock();
      blocks.push({
        alignment,
        inlineSpans: line.inlineSpans,
        kind: "paragraph",
        sourcePageIndex: line.pageIndex,
        text: line.text,
      });
      previousLine = line;
      return;
    }

    if (!marker && isHeadingLine(line, bodyFontSize)) {
      flushCurrentBlock();
      blocks.push({
        alignment,
        inlineSpans: line.inlineSpans,
        kind: "heading",
        sourcePageIndex: line.pageIndex,
        text: line.text,
      });
      previousLine = line;
      return;
    }

    if (!marker && isStandalonePdfLine(line, bodyFontSize)) {
      flushCurrentBlock();
      blocks.push({
        alignment,
        inlineSpans: line.inlineSpans,
        kind: "paragraph",
        sourcePageIndex: line.pageIndex,
        text: line.text,
      });
      previousLine = line;
      return;
    }

    if (marker) {
      flushCurrentBlock();
      currentBlock = {
        alignment: "left",
        inlineSpans: stripLeadingMarkerFromInlineSpans(
          line.inlineSpans,
          marker.marker,
        ),
        kind: "list-item",
        marker: marker.marker,
        sourcePageIndex: line.pageIndex,
        text: marker.text,
      };
      previousLine = line;
      return;
    }

    if (currentBlock?.kind === "list-item" && !largeGap) {
      currentBlock.text = `${currentBlock.text} ${line.text}`
        .replace(/\s+/g, " ")
        .trim();
      currentBlock.inlineSpans = appendInlineSpanInputs(
        currentBlock.inlineSpans,
        line.inlineSpans,
      );
      previousLine = line;
      return;
    }

    const compatibleAlignment =
      previousLine && currentBlock?.kind === "paragraph"
        ? hasCompatiblePdfParagraphAlignment(previousLine, line, bodyFontSize)
        : false;

    if (
      !currentBlock ||
      currentBlock.kind !== "paragraph" ||
      largeGap ||
      (currentBlock.alignment !== alignment && !compatibleAlignment)
    ) {
      flushCurrentBlock();
      currentBlock = {
        alignment,
        inlineSpans: line.inlineSpans,
        kind: "paragraph",
        sourcePageIndex: line.pageIndex,
        text: line.text,
      };
      previousLine = line;
      return;
    }

    currentBlock.text = `${currentBlock.text} ${line.text}`
      .replace(/\s+/g, " ")
      .trim();
    if (currentBlock.alignment !== alignment) {
      currentBlock.alignment = "left";
    }
    currentBlock.inlineSpans = appendInlineSpanInputs(
      currentBlock.inlineSpans,
      line.inlineSpans,
    );
    previousLine = line;
  });

  flushCurrentBlock();

  return normalizePdfSourceBlocks(blocks);
}

export async function extractPdfTextFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const extracted = await extractPdfDocumentFromArrayBuffer(arrayBuffer);

  return extracted.rawText;
}

export async function extractPdfDocumentFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  options: ExtractPdfDocumentOptions = {},
): Promise<ExtractedPdfDocument> {
  const { onProgress, pageBatchSize = DEFAULT_PDF_PAGE_BATCH_SIZE } = options;
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    cMapPacked: true,
    cMapUrl: getPdfAssetUrl("cmaps/"),
    data: new Uint8Array(arrayBuffer),
    iccUrl: getPdfAssetUrl("iccs/"),
    standardFontDataUrl: getPdfAssetUrl("standard_fonts/"),
    useWasm: false,
    useWorkerFetch: false,
    wasmUrl: getPdfAssetUrl("wasm/"),
  });
  const pdf = await loadingTask.promise;
  const lines: PdfLine[] = [];
  const totalPages = pdf.numPages;
  const resolvedPageBatchSize = Math.max(1, Math.floor(pageBatchSize));

  onProgress?.({
    pageCount: totalPages,
    processedPages: 0,
  });

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += resolvedPageBatchSize
  ) {
    const batchPageNumbers = Array.from(
      {
        length: Math.min(resolvedPageBatchSize, totalPages - pageNumber + 1),
      },
      (_, index) => pageNumber + index,
    );
    const batchLines = await Promise.all(
      batchPageNumbers.map(async (batchPageNumber) => {
        const page = await pdf.getPage(batchPageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        let imageLines: PdfLine[] = [];

        if (typeof page.getOperatorList === "function") {
          try {
            const operatorList = await page.getOperatorList();
            imageLines = extractPdfImageLines(
              operatorList,
              batchPageNumber - 1,
              viewport.width,
              pdfjs.OPS as Record<string, number> | undefined,
            );
          } catch {
            imageLines = [];
          }
        }

        return [
          ...buildPdfLines(textContent.items, batchPageNumber - 1, viewport.width),
          ...imageLines,
        ].sort((left, right) => {
          if (left.pageIndex !== right.pageIndex) {
            return left.pageIndex - right.pageIndex;
          }

          const verticalDistance = Math.abs(left.y - right.y);
          if (
            verticalDistance <=
            Math.max(left.fontSize, right.fontSize) * 0.35
          ) {
            return left.left - right.left;
          }

          return right.y - left.y;
        });
      }),
    );

    batchLines.forEach((pageLines) => {
      lines.push(...pageLines);
    });
    onProgress?.({
      pageCount: totalPages,
      processedPages: Math.min(
        totalPages,
        pageNumber + batchPageNumbers.length - 1,
      ),
    });
  }

  const sourceBlocks = buildPdfBlocks(lines);
  const rawText = serializeSourceBlocks(sourceBlocks);
  if (!rawText) {
    throw new Error(DOCUMENT_PAYLOAD_EMPTY_ERROR);
  }

  return {
    rawText,
    sourceBlocks,
  };
}
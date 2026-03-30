import mammoth from "mammoth/mammoth.browser";

import {
  detectDocumentSourceKind,
  isLegacyWordDocument,
} from "@/features/ingest/detect/file-kind";
import type { DocumentBlockInput, DocumentSourceKind } from "@/types/document";

export interface ExtractedDocumentPayload {
  sourceKind: DocumentSourceKind;
  rawText: string;
  sourceBlocks?: DocumentBlockInput[];
  title: string;
}

interface ExtractedPdfDocument {
  rawText: string;
  sourceBlocks: DocumentBlockInput[];
}

interface PdfFragment {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
}

interface PdfLine {
  center: number;
  entryKind: "text" | "image-placeholder";
  fontSize: number;
  left: number;
  pageIndex: number;
  pageWidth: number;
  right: number;
  text: string;
  y: number;
}

type PdfTransformMatrix = [number, number, number, number, number, number];

const pdfIdentityTransform: PdfTransformMatrix = [1, 0, 0, 1, 0, 0];

const rtfIgnoredDestinations = new Set([
  "annotation",
  "author",
  "colortbl",
  "comment",
  "datastore",
  "field",
  "fldinst",
  "fonttbl",
  "footer",
  "footerf",
  "footerl",
  "footerr",
  "footnote",
  "header",
  "headerf",
  "headerl",
  "headerr",
  "info",
  "keywords",
  "object",
  "operator",
  "pict",
  "private",
  "stylesheet",
  "subject",
  "tc",
  "title",
  "xe",
  "xmlattrname",
  "xmlattrvalue",
  "xmlclose",
  "xmlname",
  "xmlnstbl",
  "xmlopen",
]);

let isPdfWorkerConfigured = false;
let rtfTextDecoder: TextDecoder | null = null;

function getPdfAssetOrigin() {
  if (
    typeof globalThis.origin === "string" &&
    globalThis.origin.length > 0 &&
    globalThis.origin !== "null"
  ) {
    return globalThis.origin;
  }

  const locationHref =
    typeof globalThis.location?.href === "string"
      ? globalThis.location.href
      : null;

  if (locationHref?.startsWith("http://") || locationHref?.startsWith("https://")) {
    return new URL(locationHref).origin;
  }

  if (
    typeof document !== "undefined" &&
    typeof document.baseURI === "string" &&
    (document.baseURI.startsWith("http://") ||
      document.baseURI.startsWith("https://"))
  ) {
    return new URL(document.baseURI).origin;
  }

  return "http://localhost";
}

function getPdfAssetUrl(path: string) {
  return new URL(`/pdfjs/${path}`, `${getPdfAssetOrigin()}/`).toString();
}

function isPdfExtractionWorkerContext() {
  return (
    typeof WorkerGlobalScope !== "undefined" &&
    globalThis instanceof WorkerGlobalScope &&
    typeof document === "undefined"
  );
}

function deriveTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/u, "");
}

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function normalizePdfFragmentText(text: string) {
  return text.replace(/\s+/g, " ").trim();
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

function extractBlockMarker(text: string) {
  const match = text.match(
    /^((?:\d+\.)+\d*\.?|(?:\d+\.?|[A-Za-z]\))|[•*-])\s+(.+)$/u,
  );

  if (!match) {
    return null;
  }

  return {
    marker: match[1]!.trim(),
    text: match[2]!.trim(),
  };
}

function buildPdfLineText(fragments: PdfFragment[]) {
  let output = "";

  fragments.forEach((fragment, index) => {
    const content = normalizePdfFragmentText(fragment.text);
    if (!content) {
      return;
    }

    if (index > 0) {
      const previous = fragments[index - 1];
      if (previous) {
        const gap = fragment.x - previous.right;
        const separatorThreshold = Math.max(
          2.5,
          Math.min(previous.height, fragment.height) * 0.28,
        );
        const startsWithPunctuation = /^[,.;:!?%)\]]/u.test(content);

        if (
          gap > separatorThreshold &&
          !startsWithPunctuation &&
          !output.endsWith("-")
        ) {
          output += " ";
        }
      }
    }

    output += content;
  });

  return output.trim();
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

      if (!normalizePdfFragmentText(text)) {
        return [];
      }

      return [
        {
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
    const tolerance = Math.max(2, fragment.height * 0.45);

    if (Math.abs(referenceY - fragment.y) <= tolerance) {
      currentGroup.push(fragment);
      return;
    }

    groups.push([fragment]);
  });

  return groups
    .map((group) => {
      const sortedGroup = [...group].sort((left, right) => left.x - right.x);
      const text = buildPdfLineText(sortedGroup);

      if (!text) {
        return null;
      }

      const left = Math.min(...sortedGroup.map((fragment) => fragment.x));
      const right = Math.max(...sortedGroup.map((fragment) => fragment.right));
      const fontSize = median(sortedGroup.map((fragment) => fragment.height));

      return {
        center: left + (right - left) / 2,
        entryKind: "text",
        fontSize,
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
        for (let positionIndex = 0; positionIndex < positions.length; positionIndex += 2) {
          const x = positions[positionIndex];
          const y = positions[positionIndex + 1];

          if (typeof x !== "number" || typeof y !== "number") {
            continue;
          }

          appendImageLine(
            multiplyPdfTransforms(currentTransform(), [scaleX, 0, 0, scaleY, x, y]),
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

  if (!shortLine) {
    return false;
  }

  if (isCenteredLine(line) && (oversized || isMostlyUppercase(line.text))) {
    return true;
  }

  return oversized && line.text.length <= 90;
}

function isPdfContentsLine(text: string) {
  return /\.{2,}\s*(?:\d+|[ivxlcdm]+)$/iu.test(text.trim());
}

function isStandalonePdfLine(line: PdfLine, bodyFontSize: number) {
  if (line.entryKind === "image-placeholder") {
    return true;
  }

  if (isPdfContentsLine(line.text)) {
    return true;
  }

  return isCenteredLine(line) && line.text.length <= 100 && line.fontSize >= bodyFontSize * 0.92;
}

function shouldMergePdfParagraphLine(
  previousLine: PdfLine,
  currentLine: PdfLine,
  bodyFontSize: number,
) {
  if (
    previousLine.pageIndex !== currentLine.pageIndex ||
    isCenteredLine(previousLine) ||
    isCenteredLine(currentLine)
  ) {
    return false;
  }

  const verticalGap = Math.abs(previousLine.y - currentLine.y);
  const gapThreshold = Math.max(bodyFontSize * 2.2, previousLine.fontSize * 2.2);

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

function buildPdfBlocks(lines: PdfLine[]) {
  const bodyFontSize =
    median(lines.filter((line) => line.text.length > 32).map((line) => line.fontSize)) ||
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
        kind: "paragraph",
        sourcePageIndex: line.pageIndex,
        text: line.text,
      });
      previousLine = line;
      return;
    }

    if (isHeadingLine(line, bodyFontSize)) {
      flushCurrentBlock();
      blocks.push({
        alignment,
        kind: "heading",
        sourcePageIndex: line.pageIndex,
        text: line.text,
      });
      previousLine = line;
      return;
    }

    if (isStandalonePdfLine(line, bodyFontSize)) {
      flushCurrentBlock();
      blocks.push({
        alignment,
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
        kind: "list-item",
        marker: marker.marker,
        sourcePageIndex: line.pageIndex,
        text: marker.text,
      };
      previousLine = line;
      return;
    }

    if (currentBlock?.kind === "list-item" && !largeGap) {
      currentBlock.text = `${currentBlock.text} ${line.text}`.replace(/\s+/g, " ").trim();
      previousLine = line;
      return;
    }

    if (
      !currentBlock ||
      currentBlock.kind !== "paragraph" ||
      largeGap ||
      currentBlock.alignment !== alignment
    ) {
      flushCurrentBlock();
      currentBlock = {
        alignment,
        kind: "paragraph",
        sourcePageIndex: line.pageIndex,
        text: line.text,
      };
      previousLine = line;
      return;
    }

    currentBlock.text = `${currentBlock.text} ${line.text}`.replace(/\s+/g, " ").trim();
    previousLine = line;
  });

  flushCurrentBlock();

  return blocks;
}

function decodeRtfByte(value: number) {
  rtfTextDecoder ??= new TextDecoder("windows-1252");
  return rtfTextDecoder.decode(Uint8Array.of(value));
}

function decodeRtfSource(arrayBuffer: ArrayBuffer) {
  rtfTextDecoder ??= new TextDecoder("windows-1252");
  return rtfTextDecoder.decode(new Uint8Array(arrayBuffer));
}

function appendRtfText(output: string[], value: string, ignorable: boolean) {
  if (!ignorable && value) {
    output.push(value);
  }
}

function normalizeRtfText(text: string) {
  return normalizeExtractedText(
    text
      .replace(/\u0000/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n"),
  );
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!isPdfWorkerConfigured) {
    if (isPdfExtractionWorkerContext()) {
      await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc ||= getPdfAssetUrl(
        "pdf.worker.min.mjs",
      );
    }

    isPdfWorkerConfigured = true;
  }

  return pdfjs;
}

export async function extractPdfTextFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const extracted = await extractPdfDocumentFromArrayBuffer(arrayBuffer);

  return extracted.rawText;
}

export async function extractPdfDocumentFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
): Promise<ExtractedPdfDocument> {
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

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    let imageLines: PdfLine[] = [];

    if (typeof page.getOperatorList === "function") {
      try {
        const operatorList = await page.getOperatorList();
        imageLines = extractPdfImageLines(
          operatorList,
          pageNumber - 1,
          viewport.width,
          pdfjs.OPS as Record<string, number> | undefined,
        );
      } catch {
        imageLines = [];
      }
    }

    lines.push(
      ...[...buildPdfLines(textContent.items, pageNumber - 1, viewport.width), ...imageLines].sort(
        (left, right) => {
          if (left.pageIndex !== right.pageIndex) {
            return left.pageIndex - right.pageIndex;
          }

          const verticalDistance = Math.abs(left.y - right.y);
          if (verticalDistance <= Math.max(left.fontSize, right.fontSize) * 0.35) {
            return left.left - right.left;
          }

          return right.y - left.y;
        },
      ),
    );
  }

  const sourceBlocks = buildPdfBlocks(lines);
  const rawText = serializeSourceBlocks(sourceBlocks);
  if (!rawText) {
    throw new Error(
      "This PDF appears to have no selectable text. Scanned PDFs are not supported in the MVP.",
    );
  }

  return {
    rawText,
    sourceBlocks,
  };
}

export async function extractDocxTextFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = normalizeExtractedText(result.value);

  if (!rawText) {
    throw new Error("We couldn't extract readable text from that DOCX file.");
  }

  return rawText;
}

export async function extractRtfTextFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const source = decodeRtfSource(arrayBuffer);
  if (!source.trimStart().startsWith("{\\rtf")) {
    throw new Error("We couldn't read that RTF file.");
  }

  const output: string[] = [];
  const stateStack = [{ ignorable: false, ucSkip: 1 }];
  let pendingAnsiSkip = 0;
  let pendingBinaryBytes = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (pendingBinaryBytes > 0) {
      pendingBinaryBytes -= 1;
      continue;
    }

    const state = stateStack[stateStack.length - 1] ?? {
      ignorable: false,
      ucSkip: 1,
    };
    const character = source[index];

    if (character === "{") {
      stateStack.push({ ...state });
      continue;
    }

    if (character === "}") {
      if (stateStack.length > 1) {
        stateStack.pop();
      }
      pendingAnsiSkip = 0;
      continue;
    }

    if (character !== "\\") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
        continue;
      }

      appendRtfText(output, character, state.ignorable);
      continue;
    }

    index += 1;
    if (index >= source.length) {
      break;
    }

    const next = source[index];

    if (next === "\r" || next === "\n") {
      continue;
    }

    if (next === "\\" || next === "{" || next === "}") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
      } else {
        appendRtfText(output, next, state.ignorable);
      }
      continue;
    }

    if (next === "'") {
      const hex = source.slice(index + 1, index + 3);
      if (/^[0-9a-fA-F]{2}$/u.test(hex)) {
        if (pendingAnsiSkip > 0) {
          pendingAnsiSkip -= 1;
        } else {
          appendRtfText(
            output,
            decodeRtfByte(Number.parseInt(hex, 16)),
            state.ignorable,
          );
        }
        index += 2;
      }
      continue;
    }

    if (next === "~") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
      } else {
        appendRtfText(output, " ", state.ignorable);
      }
      continue;
    }

    if (next === "_") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
      } else {
        appendRtfText(output, "-", state.ignorable);
      }
      continue;
    }

    if (next === "-") {
      if (pendingAnsiSkip > 0) {
        pendingAnsiSkip -= 1;
      }
      continue;
    }

    if (next === "*") {
      state.ignorable = true;
      continue;
    }

    if (!/[A-Za-z]/u.test(next)) {
      continue;
    }

    let controlWord = next;
    while (index + 1 < source.length && /[A-Za-z]/u.test(source[index + 1])) {
      controlWord += source[index + 1];
      index += 1;
    }

    let sign = 1;
    if (source[index + 1] === "-") {
      sign = -1;
      index += 1;
    }

    let digits = "";
    while (index + 1 < source.length && /\d/u.test(source[index + 1])) {
      digits += source[index + 1];
      index += 1;
    }

    if (source[index + 1] === " ") {
      index += 1;
    }

    const parameter = digits ? sign * Number.parseInt(digits, 10) : null;
    const currentState = stateStack[stateStack.length - 1] ?? state;

    if (rtfIgnoredDestinations.has(controlWord)) {
      currentState.ignorable = true;
      continue;
    }

    switch (controlWord) {
      case "bin":
        pendingBinaryBytes = Math.max(parameter ?? 0, 0);
        break;
      case "cell":
      case "line":
      case "par":
      case "row":
        appendRtfText(output, "\n", currentState.ignorable);
        pendingAnsiSkip = 0;
        break;
      case "tab":
        appendRtfText(output, "\t", currentState.ignorable);
        break;
      case "bullet":
        appendRtfText(output, "*", currentState.ignorable);
        break;
      case "emdash":
      case "endash":
        appendRtfText(output, "-", currentState.ignorable);
        break;
      case "lquote":
      case "rquote":
        appendRtfText(output, "'", currentState.ignorable);
        break;
      case "ldblquote":
      case "rdblquote":
        appendRtfText(output, '"', currentState.ignorable);
        break;
      case "uc":
        currentState.ucSkip = Math.max(parameter ?? currentState.ucSkip, 0);
        break;
      case "u": {
        if (!currentState.ignorable && parameter !== null) {
          const codePoint = parameter < 0 ? parameter + 65536 : parameter;
          appendRtfText(output, String.fromCodePoint(codePoint), false);
        }
        pendingAnsiSkip = currentState.ucSkip;
        break;
      }
      default:
        break;
    }
  }

  const rawText = normalizeRtfText(output.join(""));

  if (!rawText) {
    throw new Error("We couldn't extract readable text from that RTF file.");
  }

  return rawText;
}

async function extractDocxText(file: File) {
  return extractDocxTextFromArrayBuffer(await file.arrayBuffer());
}

async function extractRtfText(file: File) {
  return extractRtfTextFromArrayBuffer(await file.arrayBuffer());
}

async function extractTextByKind(file: File, sourceKind: DocumentSourceKind) {
  switch (sourceKind) {
    case "docx":
      return extractDocxText(file);
    case "rtf":
      return extractRtfText(file);
    case "markdown":
    case "plain-text":
      return normalizeExtractedText(await file.text());
    default:
      return "";
  }
}

export async function extractDocumentFromFile(
  file: File,
): Promise<ExtractedDocumentPayload> {
  if (isLegacyWordDocument(file.name, file.type)) {
    throw new Error(
      "Legacy .doc files are not supported yet. Save the file as .docx and upload that instead.",
    );
  }

  const sourceKind = detectDocumentSourceKind(file.name, file.type);
  if (!sourceKind) {
    throw new Error("This file type is not supported yet.");
  }

  if (sourceKind === "pdf") {
    const { rawText, sourceBlocks } = await extractPdfDocumentFromArrayBuffer(
      await file.arrayBuffer(),
    );

    return {
      sourceBlocks,
      sourceKind,
      rawText,
      title: deriveTitle(file.name),
    };
  }

  const rawText = await extractTextByKind(file, sourceKind);
  if (!rawText) {
    throw new Error("We couldn't extract any readable text from that file.");
  }

  return {
    sourceKind,
    rawText,
    title: deriveTitle(file.name),
  };
}

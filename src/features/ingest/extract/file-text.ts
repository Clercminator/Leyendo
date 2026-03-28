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
  fontSize: number;
  left: number;
  pageIndex: number;
  pageWidth: number;
  right: number;
  text: string;
  y: number;
}

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
    const verticalGap = previousLine ? Math.abs(previousLine.y - line.y) : 0;
    const largeGap =
      !previousLine ||
      pageChanged ||
      verticalGap > Math.max(bodyFontSize * 1.45, previousLine.fontSize * 1.45);
    const alignment = isCenteredLine(line) ? "center" : "left";
    const marker = extractBlockMarker(line.text);

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
    pdfjs.GlobalWorkerOptions.workerSrc ||= new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
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
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const lines: PdfLine[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    lines.push(...buildPdfLines(textContent.items, pageNumber - 1, viewport.width));
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

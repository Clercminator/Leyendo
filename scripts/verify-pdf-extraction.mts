import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";

// Set up pdfjs worker before importing the extraction module
const require = createRequire(import.meta.url);
const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

// We need to import the actual extraction function
import { extractPdfDocumentFromArrayBuffer } from "../src/features/ingest/extract/file-text-pdf";

const hillPath = String.raw`c:\Users\clerc\OneDrive\Documentos\Lee Project\data\How To Sell Your Way Through Life. ( PDFDrive ).pdf`;
const corfoPath = String.raw`c:\Users\clerc\OneDrive\Documentos\Lee Project\data\legal files\RE N°1457 de 2025 de Corfo - Bases BIG 12 Start-Up Chile.pdf`;

async function verifyExtraction(filePath: string, label: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${label}: ${path.basename(filePath)}`);
  console.log(`${"=".repeat(60)}`);

  const data = fs.readFileSync(filePath);
  const result = await extractPdfDocumentFromArrayBuffer(data.buffer as ArrayBuffer);

  console.log(`Total blocks: ${result.sourceBlocks.length}`);
  console.log(`\nFirst 20 blocks:`);
  result.sourceBlocks.slice(0, 20).forEach((block, i) => {
    const text = block.text.length > 120 ? block.text.substring(0, 120) + "..." : block.text;
    const marker = block.marker ? `[${block.marker}] ` : "";
    console.log(`  ${i}: (${block.kind}) ${marker}${text}`);
  });
}

(async () => {
  await verifyExtraction(hillPath, "HILL BOOK");
  await verifyExtraction(corfoPath, "CORFO PDF");
})().catch((e) => console.error(e));


interface PdfFragment {
  fontName?: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
}

function isBoldPdfFontName(fontName: string | undefined) {
  return Boolean(
    fontName &&
      /(bold|black|heavy|semibold|demi|extrabold|ultrabold)/iu.test(fontName),
  );
}

function isDropCapFragment(fragment: PdfFragment, neighbors: PdfFragment[]) {
  if (fragment.text.replace(/\s/g, "").length !== 1) return false;
  const neighborHeights = neighbors
    .filter((n) => n !== fragment && n.text.trim().length > 0)
    .map((n) => n.height);
  if (neighborHeights.length === 0) return false;
  const medianNeighborHeight =
    neighborHeights.sort((a, b) => a - b)[Math.floor(neighborHeights.length / 2)] ?? 0;
  return fragment.height >= medianNeighborHeight * 1.8;
}

function normalizePdfFragmentText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\u00ad(?=\s|$)/gu, "-")
    .replace(/\u00ad/gu, "")
    .replace(/[\u200b\u200c\u200d\u2060\ufeff]/gu, "")
    .replace(/[\u00a0\u2007\u202f]/gu, " ")
    .replace(/[\u2010\u2011]/gu, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLineContent(fragments: PdfFragment[]) {
  let output = "";
  fragments.forEach((fragment, index) => {
    const content = normalizePdfFragmentText(fragment.text);
    if (!content) return;
    let prefix = "";
    if (index > 0) {
      const previous = fragments[index - 1]!;
      const gap = fragment.x - previous.right;
      const referenceHeight = Math.min(previous.height, fragment.height);
      const separatorThreshold = Math.max(2.5, referenceHeight * 0.28);
      const startsWithPunctuation = /^[,.;:!?%)\]]/u.test(content);
      const fontChanged = isBoldPdfFontName(previous.fontName) !== isBoldPdfFontName(fragment.fontName);
      const fontChangeThreshold = fontChanged ? Math.max(1.2, referenceHeight * 0.12) : separatorThreshold;
      const effectiveThreshold = Math.min(separatorThreshold, fontChangeThreshold);
      const previousIsDropCap = isDropCapFragment(previous, fragments);
      const suppressDropCapSpace = previousIsDropCap && /^[A-ZÁÉÍÓÚÜÑ]/u.test(content);

      if (gap > effectiveThreshold && !startsWithPunctuation && !output.endsWith("-") && !suppressDropCapSpace) {
        prefix = " ";
      }
    }
    output += prefix + content;
  });
  return output.trim();
}

async function verifyPdf(filePath: string, startPage: number, endPage: number) {
  const data = fs.readFileSync(filePath);
  const pdf = await getDocument({ data: new Uint8Array(data.buffer) }).promise;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`File: ${path.basename(filePath)}`);
  console.log(`Total pages: ${pdf.numPages}`);
  console.log(`${"=".repeat(60)}`);

  for (let p = startPage; p <= Math.min(endPage, pdf.numPages); p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    console.log(`\n--- Page ${p} (width=${viewport.width.toFixed(0)}) ---`);

    const fragments: PdfFragment[] = (textContent.items as any[])
      .filter((item) => item.str && item.transform)
      .map((item) => ({
        fontName: item.fontName,
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width ?? Math.abs(item.transform[0]),
        height: item.height ?? Math.abs(item.transform[3]),
        right: item.transform[4] + (item.width ?? Math.abs(item.transform[0])),
      }))
      .sort((a: PdfFragment, b: PdfFragment) => {
        const vd = Math.abs(a.y - b.y);
        if (vd <= Math.max(a.height, b.height) * 0.35) return a.x - b.x;
        return b.y - a.y;
      });

    // Group into lines
    const groups: PdfFragment[][] = [];
    fragments.forEach((fragment) => {
      const currentGroup = groups.at(-1);
      if (!currentGroup || currentGroup.length === 0) {
        groups.push([fragment]);
        return;
      }
      const referenceY = currentGroup.reduce((t, i) => t + i.y, 0) / currentGroup.length;
      const maxGroupHeight = Math.max(...currentGroup.map((i) => i.height));
      const tolerance = Math.max(2, fragment.height * 0.45, maxGroupHeight * 0.45);
      if (Math.abs(referenceY - fragment.y) <= tolerance) {
        currentGroup.push(fragment);
      } else {
        groups.push([fragment]);
      }
    });

    // Build and print lines
    const lines = groups.map((group) => {
      const sorted = [...group].sort((a, b) => a.x - b.x);
      return buildLineContent(sorted);
    }).filter(Boolean);

    lines.forEach((line) => console.log(`  ${line}`));
  }
}

const hillPath = String.raw`c:\Users\clerc\OneDrive\Documentos\Lee Project\data\How To Sell Your Way Through Life. ( PDFDrive ).pdf`;
const corfoPath = String.raw`c:\Users\clerc\OneDrive\Documentos\Lee Project\data\legal files\RE N°1457 de 2025 de Corfo - Bases BIG 12 Start-Up Chile.pdf`;

async function verifyPdfDebug(filePath: string, pageNum: number) {
  const data = fs.readFileSync(filePath);
  const pdf = await getDocument({ data: new Uint8Array(data.buffer) }).promise;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`DEBUG FRAGMENTS: ${path.basename(filePath)} - Page ${pageNum}`);
  console.log(`${"=".repeat(60)}`);

  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();

  const fragments: PdfFragment[] = (textContent.items as any[])
    .filter((item) => item.str && item.transform)
    .map((item) => ({
      fontName: item.fontName,
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width ?? Math.abs(item.transform[0]),
      height: item.height ?? Math.abs(item.transform[3]),
      right: item.transform[4] + (item.width ?? Math.abs(item.transform[0])),
    }))
    .sort((a: PdfFragment, b: PdfFragment) => {
      const vd = Math.abs(a.y - b.y);
      if (vd <= Math.max(a.height, b.height) * 0.35) return a.x - b.x;
      return b.y - a.y;
    });

  // Find the line containing "Que, por" (around y=400-500 area)
  // Show all fragments for the "CONSIDERANDO" section
  const targetFragments = fragments.filter((f) => {
    return f.y < 430 && f.y > 280; // The numbered items area
  });

  console.log(`\nFragments in CONSIDERANDO area (y between 280-430):`);
  let lastY = -1;
  for (const f of targetFragments) {
    if (lastY !== -1 && Math.abs(f.y - lastY) > 3) {
      console.log("  ---");
    }
    const gap = lastY !== -1 && Math.abs(f.y - lastY) <= 3 ? ` gap=${(f.x - (targetFragments[targetFragments.indexOf(f) - 1]?.right ?? f.x)).toFixed(1)}` : "";
    console.log(`  "${f.text}" x=${f.x.toFixed(1)} right=${f.right.toFixed(1)} y=${f.y.toFixed(1)} h=${f.height.toFixed(1)} font=${f.fontName}${gap}`);
    lastY = f.y;
  }

  // Also show the Hill drop cap line
  console.log(`\n\nHill book drop cap debugging:`);
  const hillData = fs.readFileSync(hillPath);
  const hillPdf = await getDocument({ data: new Uint8Array(hillData.buffer) }).promise;
  const hillPage = await hillPdf.getPage(13);
  const hillContent = await hillPage.getTextContent();
  
  const hillFragments: PdfFragment[] = (hillContent.items as any[])
    .filter((item) => item.str && item.transform)
    .map((item) => ({
      fontName: item.fontName,
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width ?? Math.abs(item.transform[0]),
      height: item.height ?? Math.abs(item.transform[3]),
      right: item.transform[4] + (item.width ?? Math.abs(item.transform[0])),
    }))
    .sort((a: PdfFragment, b: PdfFragment) => {
      const vd = Math.abs(a.y - b.y);
      if (vd <= Math.max(a.height, b.height) * 0.35) return a.x - b.x;
      return b.y - a.y;
    });

  // Show ALL fragments on page 13 to find the drop cap
  const firstTextFragments = hillFragments.slice(0, 30);
  console.log(`First 30 fragments on page 13:`);
  let hillLastY = -999;
  for (const f of firstTextFragments) {
    if (Math.abs(f.y - hillLastY) > 3) {
      console.log("  ---");
    }
    console.log(`  "${f.text.substring(0, 40)}" x=${f.x.toFixed(1)} right=${f.right.toFixed(1)} y=${f.y.toFixed(1)} h=${f.height.toFixed(1)} font=${f.fontName}`);
    hillLastY = f.y;
  }
}

(async () => {
  // Page 13 of Hill book has the "Foreword" with drop cap
  await verifyPdf(hillPath, 13, 13);
  // Page 1 of Corfo - show raw fragments for debugging
  await verifyPdfDebug(corfoPath, 1);
})().catch((e) => console.error(e));

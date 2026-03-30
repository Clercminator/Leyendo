import type { DocumentBlockInput } from "@/types/document";

const markdownFencePattern = /^(```|~~~)/;
const markdownHeadingPattern = /^#{1,6}\s+(.+?)\s*#*\s*$/;
const markdownListItemPattern = /^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?(.+)$/;

function normalizeMarkdownInlineText(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~>#]+/g, " ")
    .replace(/\\([\\`*_{}\[\]()#+\-.!~>])/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function flushMarkdownParagraph(
  blocks: DocumentBlockInput[],
  paragraphLines: string[],
) {
  if (paragraphLines.length === 0) {
    return;
  }

  const text = normalizeMarkdownInlineText(paragraphLines.join(" "));
  if (text) {
    blocks.push({ kind: "paragraph", text });
  }

  paragraphLines.length = 0;
}

export function extractMarkdownBlocks(markdown: string): DocumentBlockInput[] {
  const blocks: DocumentBlockInput[] = [];
  const paragraphLines: string[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let isInFence = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (markdownFencePattern.test(trimmed)) {
      flushMarkdownParagraph(blocks, paragraphLines);
      isInFence = !isInFence;
      return;
    }

    if (isInFence) {
      if (trimmed) {
        paragraphLines.push(trimmed);
      }
      return;
    }

    if (!trimmed) {
      flushMarkdownParagraph(blocks, paragraphLines);
      return;
    }

    const headingMatch = trimmed.match(markdownHeadingPattern);
    if (headingMatch) {
      flushMarkdownParagraph(blocks, paragraphLines);
      const text = normalizeMarkdownInlineText(headingMatch[1] ?? "");
      if (text) {
        blocks.push({ kind: "heading", text });
      }
      return;
    }

    const listItemMatch = trimmed.match(markdownListItemPattern);
    if (listItemMatch) {
      flushMarkdownParagraph(blocks, paragraphLines);
      const text = normalizeMarkdownInlineText(listItemMatch[1] ?? "");
      if (text) {
        blocks.push({ kind: "list-item", text });
      }
      return;
    }

    paragraphLines.push(trimmed);
  });

  flushMarkdownParagraph(blocks, paragraphLines);

  return blocks;
}

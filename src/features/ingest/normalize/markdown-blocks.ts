import type { DocumentBlockInput } from "@/types/document";

const markdownFencePattern = /^(```|~~~)\s*([A-Za-z0-9_-]+)?\s*$/;
const markdownHeadingPattern = /^#{1,6}\s+(.+?)\s*#*\s*$/;
const markdownListItemPattern = /^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?(.+)$/;

interface ActiveFence {
  delimiter: "```" | "~~~";
  language?: string;
}

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

function flushMarkdownFence(
  activeFence: ActiveFence | undefined,
  blocks: DocumentBlockInput[],
) {
  if (!activeFence) {
    return;
  }

  if (activeFence.language === "mermaid") {
    blocks.push({
      kind: "paragraph",
      text: "Mermaid diagram included in this section. Switch to Literal text to inspect the diagram source.",
    });
    return;
  }

  blocks.push({
    kind: "paragraph",
    text: "Code snippet included in this section. Switch to Literal text to inspect the code.",
  });
}

export function extractMarkdownBlocks(markdown: string): DocumentBlockInput[] {
  const blocks: DocumentBlockInput[] = [];
  const paragraphLines: string[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let activeFence: ActiveFence | undefined;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (activeFence) {
      if (trimmed.startsWith(activeFence.delimiter)) {
        flushMarkdownFence(activeFence, blocks);
        activeFence = undefined;
      }

      return;
    }

    const fenceMatch = trimmed.match(markdownFencePattern);
    if (fenceMatch) {
      flushMarkdownParagraph(blocks, paragraphLines);
      activeFence = {
        delimiter: (fenceMatch[1] as "```" | "~~~") ?? "```",
        language: fenceMatch[2]?.toLowerCase(),
      };
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

  flushMarkdownFence(activeFence, blocks);
  flushMarkdownParagraph(blocks, paragraphLines);

  return blocks;
}

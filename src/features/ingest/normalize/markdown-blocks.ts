import type {
  DocumentBlockInput,
  DocumentInlineSpanInput,
  InlineSpanKind,
} from "@/types/document";

const markdownFencePattern = /^(```|~~~)\s*([A-Za-z0-9_-]+)?\s*$/;
const markdownHeadingPattern = /^#{1,6}\s+(.+?)\s*#*\s*$/;
const markdownListItemPattern =
  /^\s*((?:[-*+])|(?:\d+\.))\s+(?:(\[[ xX]\])\s+)?(.+)$/;
const markdownTableRowPattern = /^\s*\|?.+\|.+$/;
const markdownTableSeparatorPattern =
  /^\s*\|?(?:\s*:?-{1,}:?\s*\|){1,}\s*:?-{1,}:?\s*\|?\s*$/;
const markdownImageOnlyPattern = /^\s*!\[([^\]]*)\]\(([^)\n]+)\)\s*$/;
const markdownFootnoteDefinitionPattern = /^\s*\[\^[^\]]+\]:/;
// Link reference definitions, e.g. `[1]: https://example.com "title"`. The label
// cannot start with `^` so footnote definitions are excluded from this pattern.
const markdownLinkDefinitionPattern = /^\s*\[[^\^\]][^\]]*\]:\s+\S+/;
const markdownStrongPattern = /\*\*([^\n]+?)\*\*|__([^\n]+?)__/g;
const markdownEmphasisPattern =
  /(?<![\w*])\*([^*\n]+?)\*(?![\w*])|(?<![\w_])_([^_\n]+?)_(?![\w_])/g;
const markdownDisplayMathFencePattern = /^\$\$\s*$/;
const markdownDisplayMathSingleLinePattern = /^\$\$.*\$\$\s*$/;

export const MARKDOWN_CODE_BLOCK_PLACEHOLDER =
  "Code snippet included in this section. Switch to Classic Reader or Literal text to inspect the code.";
export const MARKDOWN_MERMAID_PLACEHOLDER =
  "Mermaid diagram included in this section. Switch to Classic Reader or Literal text to inspect the diagram.";
export const MARKDOWN_TABLE_PLACEHOLDER =
  "Markdown table included in this section. Switch to Classic Reader or Literal text to inspect the table.";
export const MARKDOWN_HTML_PLACEHOLDER =
  "Raw HTML block included in this section. Switch to Literal text to inspect the source.";
export const MARKDOWN_MATH_PLACEHOLDER =
  "Math block included in this section. Switch to Literal text to inspect the formula.";
export const MARKDOWN_FOOTNOTE_PLACEHOLDER =
  "Footnote definition included in this section. Switch to Literal text to inspect the note.";

interface ActiveFence {
  delimiter: "```" | "~~~";
  language?: string;
}

function normalizeMarkdownInlineText(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, alt: string) => {
      const normalizedAlt = alt.trim();

      return normalizedAlt
        ? `Image reference: ${normalizedAlt}`
        : "Image reference";
    })
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
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

// Records strong/emphasis runs as inline spans so the tokenized reader can re-apply
// bold/italic. Positions are kept only to emit spans in document order, which
// resolveInlineSpans() relies on when mapping span text back onto token ranges.
function extractInlineSpans(rawSource: string): DocumentInlineSpanInput[] {
  const collected: Array<{
    index: number;
    kind: InlineSpanKind;
    text: string;
  }> = [];

  const pushMatches = (pattern: RegExp, kind: InlineSpanKind) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(rawSource)) !== null) {
      const inner = match[1] ?? match[2] ?? "";
      const text = normalizeMarkdownInlineText(inner);

      if (text) {
        collected.push({ index: match.index, kind, text });
      }
    }
  };

  pushMatches(markdownStrongPattern, "strong");
  pushMatches(markdownEmphasisPattern, "emphasis");

  if (collected.length === 0) {
    return [];
  }

  return collected
    .sort((left, right) => left.index - right.index)
    .map(({ kind, text }) => ({ kind, text }));
}

function flushMarkdownParagraph(
  blocks: DocumentBlockInput[],
  paragraphLines: string[],
) {
  if (paragraphLines.length === 0) {
    return;
  }

  const rawSource = paragraphLines.join(" ");
  const text = normalizeMarkdownInlineText(rawSource);
  if (text) {
    const inlineSpans = extractInlineSpans(rawSource);
    blocks.push({
      kind: "paragraph",
      text,
      ...(inlineSpans.length > 0 ? { inlineSpans } : {}),
    });
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
      text: MARKDOWN_MERMAID_PLACEHOLDER,
    });
    return;
  }

  blocks.push({
    kind: "paragraph",
    text: MARKDOWN_CODE_BLOCK_PLACEHOLDER,
  });
}

function pushMarkdownPlaceholder(blocks: DocumentBlockInput[], text: string) {
  blocks.push({ kind: "paragraph", text });
}

function isMarkdownHtmlLine(trimmed: string) {
  return trimmed.startsWith("<") && /<\/?[A-Za-z][\w:-]*(?:\s[^>]*)?>/.test(trimmed);
}

function isMarkdownTableStart(lines: string[], lineIndex: number) {
  const currentLine = lines[lineIndex]?.trim() ?? "";
  const nextLine = lines[lineIndex + 1]?.trim() ?? "";

  return (
    markdownTableRowPattern.test(currentLine) &&
    markdownTableSeparatorPattern.test(nextLine)
  );
}

function normalizeTaskListMarker(marker: string) {
  return marker.toLowerCase() === "[x]" ? "[x]" : "[ ]";
}

export function extractMarkdownBlocks(markdown: string): DocumentBlockInput[] {
  const blocks: DocumentBlockInput[] = [];
  const paragraphLines: string[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let activeFence: ActiveFence | undefined;
  let insideDisplayMathFence = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const trimmed = line.trim();

    if (activeFence) {
      if (trimmed.startsWith(activeFence.delimiter)) {
        flushMarkdownFence(activeFence, blocks);
        activeFence = undefined;
      }

      continue;
    }

    if (insideDisplayMathFence) {
      if (markdownDisplayMathFencePattern.test(trimmed)) {
        pushMarkdownPlaceholder(blocks, MARKDOWN_MATH_PLACEHOLDER);
        insideDisplayMathFence = false;
      }

      continue;
    }

    const fenceMatch = trimmed.match(markdownFencePattern);
    if (fenceMatch) {
      flushMarkdownParagraph(blocks, paragraphLines);
      activeFence = {
        delimiter: (fenceMatch[1] as "```" | "~~~") ?? "```",
        language: fenceMatch[2]?.toLowerCase(),
      };
      continue;
    }

    if (markdownDisplayMathSingleLinePattern.test(trimmed)) {
      flushMarkdownParagraph(blocks, paragraphLines);
      pushMarkdownPlaceholder(blocks, MARKDOWN_MATH_PLACEHOLDER);
      continue;
    }

    if (markdownDisplayMathFencePattern.test(trimmed)) {
      flushMarkdownParagraph(blocks, paragraphLines);
      insideDisplayMathFence = true;
      continue;
    }

    if (!trimmed) {
      flushMarkdownParagraph(blocks, paragraphLines);
      continue;
    }

    if (isMarkdownTableStart(lines, lineIndex)) {
      flushMarkdownParagraph(blocks, paragraphLines);
      pushMarkdownPlaceholder(blocks, MARKDOWN_TABLE_PLACEHOLDER);

      lineIndex += 1;

      while (
        lineIndex + 1 < lines.length &&
        markdownTableRowPattern.test((lines[lineIndex + 1] ?? "").trim())
      ) {
        lineIndex += 1;
      }

      continue;
    }

    if (markdownImageOnlyPattern.test(trimmed)) {
      flushMarkdownParagraph(blocks, paragraphLines);
      const imageMatch = trimmed.match(markdownImageOnlyPattern);
      const altText = normalizeMarkdownInlineText(imageMatch?.[1] ?? "");

      pushMarkdownPlaceholder(
        blocks,
        altText ? `Image reference: ${altText}` : "Image reference",
      );
      continue;
    }

    if (isMarkdownHtmlLine(trimmed)) {
      flushMarkdownParagraph(blocks, paragraphLines);
      pushMarkdownPlaceholder(blocks, MARKDOWN_HTML_PLACEHOLDER);

      while (lineIndex + 1 < lines.length) {
        const nextTrimmed = (lines[lineIndex + 1] ?? "").trim();

        if (!nextTrimmed || !isMarkdownHtmlLine(nextTrimmed)) {
          break;
        }

        lineIndex += 1;
      }

      continue;
    }

    if (markdownFootnoteDefinitionPattern.test(trimmed)) {
      flushMarkdownParagraph(blocks, paragraphLines);
      pushMarkdownPlaceholder(blocks, MARKDOWN_FOOTNOTE_PLACEHOLDER);
      continue;
    }

    if (
      paragraphLines.length === 0 &&
      markdownLinkDefinitionPattern.test(trimmed)
    ) {
      // Link reference definitions (`[1]: https://…`) only carry the URL/title for
      // links resolved elsewhere. Skip them so they never leak into the reading flow
      // as noise paragraphs. (A definition cannot interrupt a paragraph, so this only
      // applies at a block boundary.)
      continue;
    }

    const headingMatch = trimmed.match(markdownHeadingPattern);
    if (headingMatch) {
      flushMarkdownParagraph(blocks, paragraphLines);
      const rawHeading = headingMatch[1] ?? "";
      const text = normalizeMarkdownInlineText(rawHeading);
      if (text) {
        const inlineSpans = extractInlineSpans(rawHeading);
        blocks.push({
          kind: "heading",
          text,
          ...(inlineSpans.length > 0 ? { inlineSpans } : {}),
        });
      }
      continue;
    }

    const listItemMatch = trimmed.match(markdownListItemPattern);
    if (listItemMatch) {
      flushMarkdownParagraph(blocks, paragraphLines);
      const listMarker = listItemMatch[1] ?? "";
      const taskMarker = listItemMatch[2];
      const rawListItem = listItemMatch[3] ?? "";
      const text = normalizeMarkdownInlineText(rawListItem);

      if (text) {
        const inlineSpans = extractInlineSpans(rawListItem);
        blocks.push({
          kind: "list-item",
          marker: taskMarker
            ? normalizeTaskListMarker(taskMarker)
            : /^\d+\.$/.test(listMarker)
              ? listMarker
              : undefined,
          text,
          ...(inlineSpans.length > 0 ? { inlineSpans } : {}),
        });
      }
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushMarkdownFence(activeFence, blocks);
  if (insideDisplayMathFence) {
    pushMarkdownPlaceholder(blocks, MARKDOWN_MATH_PLACEHOLDER);
  }
  flushMarkdownParagraph(blocks, paragraphLines);

  return blocks;
}

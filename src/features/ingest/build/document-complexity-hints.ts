import type {
  DocumentComplexityHint,
  DocumentSourceKind,
} from "@/types/document";

const markdownFencedBlockPattern =
  /(?:^|\n)(```|~~~)\s*([A-Za-z0-9_-]+)?\s*\n[\s\S]*?\n\1\s*(?=\n|$)/gm;
const markdownTablePattern =
  /^\s*\|?.+\|.+\r?\n\s*\|?(?:\s*:?-{1,}:?\s*\|){1,}\s*:?-{1,}:?\s*\|?\s*$/m;
const markdownTaskListPattern = /^\s*(?:[-*+]|\d+\.)\s+\[[ xX]\]\s+/m;
const markdownImagePattern = /!\[[^\]]*\]\([^\n)]*\)/m;
const markdownHtmlPattern = /<([A-Za-z][\w:-]*)(\s[^>]*)?>/m;
const markdownMathPattern =
  /(?:^|\n)\$\$[\s\S]+?\$\$(?=\n|$)|\\\(|\\\[|(?:^|[^\\])\$[^$\n]{1,80}\$(?!\$)/m;
const markdownFootnotePattern = /\[\^[^\]]+\](?::)?/m;

interface DeriveDocumentComplexityHintsInput {
  rawText?: string;
  sourceKind: DocumentSourceKind;
}

function collectMarkdownFenceHints(rawText: string) {
  let hasCodeBlocks = false;
  let hasMermaidDiagrams = false;

  for (const match of rawText.matchAll(markdownFencedBlockPattern)) {
    const language = match[2]?.trim().toLowerCase();

    if (language === "mermaid") {
      hasMermaidDiagrams = true;
      continue;
    }

    hasCodeBlocks = true;
  }

  return { hasCodeBlocks, hasMermaidDiagrams };
}

export function deriveDocumentComplexityHints(
  input: DeriveDocumentComplexityHintsInput,
) {
  const hints = new Set<DocumentComplexityHint>();
  const rawText = input.rawText ?? "";

  switch (input.sourceKind) {
    case "docx":
      hints.add("docx-rich-content");
      break;
    case "rtf":
      hints.add("rtf-rich-content");
      break;
    case "markdown": {
      if (!rawText.trim()) {
        hints.add("markdown-advanced-content");
        break;
      }

      const { hasCodeBlocks, hasMermaidDiagrams } =
        collectMarkdownFenceHints(rawText);

      if (hasCodeBlocks) {
        hints.add("markdown-code-blocks");
      }

      if (hasMermaidDiagrams) {
        hints.add("markdown-mermaid-diagrams");
      }

      if (markdownTablePattern.test(rawText)) {
        hints.add("markdown-tables");
      }

      if (markdownTaskListPattern.test(rawText)) {
        hints.add("markdown-task-lists");
      }

      if (markdownImagePattern.test(rawText)) {
        hints.add("markdown-images");
      }

      if (markdownHtmlPattern.test(rawText)) {
        hints.add("markdown-html");
      }

      if (markdownMathPattern.test(rawText)) {
        hints.add("markdown-math");
      }

      if (markdownFootnotePattern.test(rawText)) {
        hints.add("markdown-footnotes");
      }

      break;
    }
    default:
      break;
  }

  return [...hints];
}

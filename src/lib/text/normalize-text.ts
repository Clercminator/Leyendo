const paragraphBoundary = /\n\s*\n+/g;
const sentenceBoundary = /(?<=[.!?])\s+/;
const tokenBoundary = /\s+/;

export interface NormalizedTextResult {
  raw: string;
  paragraphs: string[];
  sentences: string[];
  tokens: string[];
  excerpt: string;
}

export function normalizeText(input: string): NormalizedTextResult {
  const trimmed = input.replace(/\r\n/g, "\n").trim();
  const normalized = trimmed
    .split(paragraphBoundary)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

  const paragraphs = normalized
    ? normalized.split(paragraphBoundary).map((paragraph) => paragraph.trim())
    : [];

  const sentences = paragraphs.flatMap((paragraph) =>
    paragraph
      .split(sentenceBoundary)
      .map((sentence) => sentence.trim())
      .filter(Boolean),
  );

  const tokens = normalized
    ? normalized
        .split(tokenBoundary)
        .map((token) => token.trim())
        .filter(Boolean)
    : [];

  const excerpt = normalized.slice(0, 180);

  return {
    raw: normalized,
    paragraphs,
    sentences,
    tokens,
    excerpt,
  };
}

"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import GithubSlugger from "github-slugger";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { buildTokenRuns } from "@/components/reader/build-token-runs";
import { useLocale } from "@/components/layout/locale-provider";
import { MarkdownMermaidDiagram } from "@/components/reader/markdown-mermaid-diagram";
import {
  MARKDOWN_CODE_BLOCK_PLACEHOLDER,
  MARKDOWN_FOOTNOTE_PLACEHOLDER,
  MARKDOWN_HTML_PLACEHOLDER,
  MARKDOWN_MERMAID_PLACEHOLDER,
  MARKDOWN_TABLE_PLACEHOLDER,
} from "@/features/ingest/normalize/markdown-blocks";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel, Token } from "@/types/document";

interface ClassicReaderViewProps {
  document: DocumentModel;
  chunk: Chunk;
  simplifyMarkdownPreview?: boolean;
  useMarkdownPreview?: boolean;
  onJumpToToken?: (tokenIndex: number) => void;
  reduceMotion: boolean;
  visibleSourcePageIndex?: number;
}

interface MarkdownPreviewBlock {
  key: string;
  markdown: string;
  paragraphIndexes: number[];
  headingDepth?: 1 | 2 | 3 | 4 | 5 | 6;
  headingId?: string;
  nodeType?: string;
  tokenStart?: number;
}

interface RenderedBlockWindow {
  end: number;
  hiddenAfterCount: number;
  hiddenBeforeCount: number;
  start: number;
}

const inactiveTokenIndexes = new Set<number>();
const LARGE_CLASSIC_VISIBLE_BLOCKS = 48;
const LARGE_MARKDOWN_VISIBLE_BLOCKS = 36;
const LARGE_CLASSIC_WINDOW_THRESHOLD = LARGE_CLASSIC_VISIBLE_BLOCKS * 2;
const markdownPreviewBlockCache = new WeakMap<
  DocumentModel,
  MarkdownPreviewBlock[]
>();

function buildRenderedBlockWindow(args: {
  activeParagraphIndex: number;
  maxVisibleBlocks: number;
  totalBlocks: number;
}): RenderedBlockWindow {
  const { activeParagraphIndex, maxVisibleBlocks, totalBlocks } = args;

  if (totalBlocks <= maxVisibleBlocks) {
    return {
      end: totalBlocks,
      hiddenAfterCount: 0,
      hiddenBeforeCount: 0,
      start: 0,
    };
  }

  const halfWindow = Math.floor(maxVisibleBlocks / 2);
  let start = Math.max(0, activeParagraphIndex - halfWindow);
  let end = Math.min(totalBlocks, start + maxVisibleBlocks);

  start = Math.max(0, end - maxVisibleBlocks);
  end = Math.min(totalBlocks, start + maxVisibleBlocks);

  return {
    end,
    hiddenAfterCount: Math.max(0, totalBlocks - end),
    hiddenBeforeCount: start,
    start,
  };
}

function isNodeRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNodeType(node: unknown) {
  return isNodeRecord(node) && typeof node.type === "string"
    ? node.type
    : undefined;
}

function getHeadingDepth(node: unknown) {
  if (!isNodeRecord(node) || typeof node.depth !== "number") {
    return undefined;
  }

  const normalizedDepth = Math.max(1, Math.min(6, Math.round(node.depth)));

  return normalizedDepth as 1 | 2 | 3 | 4 | 5 | 6;
}

function getNodeChildren(node: unknown) {
  return isNodeRecord(node) && Array.isArray(node.children)
    ? node.children
    : [];
}

function getNodeValue(node: unknown) {
  return isNodeRecord(node) && typeof node.value === "string"
    ? node.value
    : undefined;
}

function getNodePositionOffsets(node: unknown) {
  if (!isNodeRecord(node) || !isNodeRecord(node.position)) {
    return {};
  }

  const start =
    isNodeRecord(node.position.start) &&
    typeof node.position.start.offset === "number"
      ? node.position.start.offset
      : undefined;
  const end =
    isNodeRecord(node.position.end) &&
    typeof node.position.end.offset === "number"
      ? node.position.end.offset
      : undefined;

  return { end, start };
}

function extractMarkdownText(node: unknown): string {
  const nodeType = getNodeType(node);

  if (
    nodeType === "text" ||
    nodeType === "inlineCode" ||
    nodeType === "code" ||
    nodeType === "html"
  ) {
    return getNodeValue(node) ?? "";
  }

  if (nodeType === "image") {
    return isNodeRecord(node) && typeof node.alt === "string" ? node.alt : "";
  }

  if (nodeType === "break") {
    return " ";
  }

  return getNodeChildren(node)
    .map((child) => extractMarkdownText(child))
    .join(" ");
}

function normalizeMarkdownComparisonText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function getCodeFencePlaceholder(node: unknown) {
  if (!isNodeRecord(node) || typeof node.lang !== "string") {
    return MARKDOWN_CODE_BLOCK_PLACEHOLDER;
  }

  return node.lang.toLowerCase() === "mermaid"
    ? MARKDOWN_MERMAID_PLACEHOLDER
    : MARKDOWN_CODE_BLOCK_PLACEHOLDER;
}

function getMarkdownPreviewMatchText(node: unknown) {
  const nodeType = getNodeType(node);

  switch (nodeType) {
    case "code":
      return getCodeFencePlaceholder(node);
    case "footnoteDefinition":
      return MARKDOWN_FOOTNOTE_PLACEHOLDER;
    case "html":
      return MARKDOWN_HTML_PLACEHOLDER;
    case "image": {
      const altText = extractMarkdownText(node).trim();

      return altText ? `Image reference: ${altText}` : "Image reference";
    }
    case "table":
      return MARKDOWN_TABLE_PLACEHOLDER;
    default:
      return extractMarkdownText(node);
  }
}

function findFirstMarkdownPreviewTokenStart(
  blocks: MarkdownPreviewBlock[],
  startIndex: number,
) {
  for (let index = startIndex; index < blocks.length; index += 1) {
    const tokenStart = blocks[index]?.tokenStart;

    if (typeof tokenStart === "number") {
      return tokenStart;
    }
  }

  return undefined;
}

function findLastMarkdownPreviewTokenStart(
  blocks: MarkdownPreviewBlock[],
  startIndex: number,
) {
  for (let index = startIndex; index >= 0; index -= 1) {
    const tokenStart = blocks[index]?.tokenStart;

    if (typeof tokenStart === "number") {
      return tokenStart;
    }
  }

  return undefined;
}

function getReactNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => getReactNodeText(child)).join(" ");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getReactNodeText(node.props.children);
  }

  return "";
}

function createHeadingRenderer(
  tagName: "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
  className: string,
) {
  return function Heading({
    children,
    className: inheritedClassName,
    ...props
  }: ComponentPropsWithoutRef<"h1">) {
    const TagName = tagName;
    const combinedClassName = inheritedClassName
      ? `${className} ${inheritedClassName}`
      : className;

    return (
      <TagName {...props} className={combinedClassName}>
        {children}
      </TagName>
    );
  };
}

function decodeMarkdownAnchor(anchor: string) {
  try {
    return decodeURIComponent(anchor);
  } catch {
    return anchor;
  }
}

function shouldPreferDirectReaderScroll() {
  if (typeof window === "undefined") {
    return false;
  }

  const coarsePointer =
    window.matchMedia?.("(hover: none), (pointer: coarse)").matches ?? false;
  const lowConcurrency =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= 4;
  const deviceMemory = (
    navigator as Navigator & { deviceMemory?: number }
  ).deviceMemory;
  const lowMemory = typeof deviceMemory === "number" && deviceMemory <= 4;

  return coarsePointer || lowConcurrency || lowMemory;
}

function getExpectedBlockKinds(
  nodeType: string | undefined,
): ReadonlySet<DocumentModel["blocks"][number]["kind"]> | undefined {
  switch (nodeType) {
    case "heading":
      return new Set<DocumentModel["blocks"][number]["kind"]>(["heading"]);
    case "list":
      return new Set<DocumentModel["blocks"][number]["kind"]>([
        "list-item",
      ]);
    case "paragraph":
    case "code":
    case "html":
    case "table":
      return new Set<DocumentModel["blocks"][number]["kind"]>([
        "paragraph",
      ]);
    default:
      return undefined;
  }
}

function extractMermaidChart(children: ReactNode) {
  if (!isValidElement<{ children?: ReactNode; className?: string }>(children)) {
    return undefined;
  }

  const className = children.props.className;

  if (
    typeof className !== "string" ||
    !className.includes("language-mermaid")
  ) {
    return undefined;
  }

  const chart = getReactNodeText(children.props.children).replace(/\n$/, "");
  return chart.trim() ? chart : undefined;
}

function buildMarkdownPreviewBlocks(markdown: string, document: DocumentModel) {
  const cachedBlocks = markdownPreviewBlockCache.get(document);

  if (cachedBlocks) {
    return cachedBlocks;
  }

  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as {
    children?: unknown[];
  };
  const nodes = Array.isArray(tree.children) ? tree.children : [];
  const normalizedDocumentBlocks = document.blocks.map((block) => ({
    kind: block.kind,
    text: normalizeMarkdownComparisonText(block.text),
  }));
  const headingSlugger = new GithubSlugger();
  let blockCursor = 0;

  const previewBlocks = nodes.flatMap((node, index) => {
    const { end, start } = getNodePositionOffsets(node);
    const markdownSource =
      typeof start === "number" && typeof end === "number"
        ? markdown.slice(start, end).trim()
        : "";

    if (!markdownSource) {
      return [];
    }

    const nodeType = getNodeType(node);
    const headingText =
      nodeType === "heading" ? extractMarkdownText(node).trim() : "";
    const headingId = headingText ? headingSlugger.slug(headingText) : undefined;
    const expectedBlockKinds = getExpectedBlockKinds(nodeType);
    const matchText = normalizeMarkdownComparisonText(
      getMarkdownPreviewMatchText(node),
    );
    const paragraphIndexes: number[] = [];
    let scanCursor = blockCursor;

    while (scanCursor < normalizedDocumentBlocks.length) {
      const documentBlock = normalizedDocumentBlocks[scanCursor];
      const kindMatches =
        !expectedBlockKinds || expectedBlockKinds.has(documentBlock.kind);
      const documentBlockText = documentBlock.text;

      if (!documentBlockText) {
        scanCursor += 1;
        continue;
      }

      const matches =
        kindMatches &&
        matchText.length > 0 &&
        (matchText.includes(documentBlockText) ||
          documentBlockText.includes(matchText));

      if (paragraphIndexes.length === 0) {
        if (!matches) {
          break;
        }

        paragraphIndexes.push(scanCursor);
        scanCursor += 1;
        continue;
      }

      if (!matches) {
        break;
      }

      paragraphIndexes.push(scanCursor);
      scanCursor += 1;
    }

    if (paragraphIndexes.length > 0) {
      blockCursor = scanCursor;
    }

    return [
      {
        headingDepth: getHeadingDepth(node),
        key: `${index}-${start ?? 0}-${end ?? 0}`,
        markdown: markdownSource,
        nodeType,
        paragraphIndexes,
        headingId,
        tokenStart:
          paragraphIndexes.length > 0
            ? document.blocks[paragraphIndexes[0]]?.tokenStart
            : undefined,
      } satisfies MarkdownPreviewBlock,
    ];
  });

  markdownPreviewBlockCache.set(document, previewBlocks);

  return previewBlocks;
}

function renderToken(args: {
  isActive: boolean;
  onJumpToToken?: (tokenIndex: number) => void;
  token: Token;
}) {
  const { isActive, onJumpToToken, token } = args;

  return (
    <span
      key={token.index}
      {...(onJumpToToken ? ({ role: "button", tabIndex: 0 } as const) : {})}
      data-active={isActive ? "true" : undefined}
      data-reader-token-index={token.index}
      className={
        onJumpToToken
          ? "cursor-pointer rounded-md px-[0.04em] transition hover:text-(--text-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-sky)"
          : undefined
      }
      onClick={
        onJumpToToken
          ? (event) => {
              event.stopPropagation();
              onJumpToToken(token.index);
            }
          : undefined
      }
      onKeyDown={
        onJumpToToken
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              onJumpToToken(token.index);
            }
          : undefined
      }
    >
      {token.value}
    </span>
  );
}

function buildInlineStyleRuns(tokens: Token[], strongTokenIndexes: Set<number>) {
  const runs: Array<{
    key: string;
    strong: boolean;
    tokens: Token[];
  }> = [];

  tokens.forEach((token) => {
    const strong = strongTokenIndexes.has(token.index);
    const previousRun = runs.at(-1);

    if (previousRun && previousRun.strong === strong) {
      previousRun.key = `${previousRun.key}:${token.index}`;
      previousRun.tokens.push(token);
      return;
    }

    runs.push({
      key: `${token.index}`,
      strong,
      tokens: [token],
    });
  });

  return runs;
}

function buildStrongTokenIndexes(
  inlineSpans: DocumentModel["blocks"][number]["inlineSpans"],
) {
  const strongTokenIndexes = new Set<number>();

  inlineSpans?.forEach((inlineSpan) => {
    if (inlineSpan.kind !== "strong") {
      return;
    }

    for (
      let tokenIndex = inlineSpan.tokenStart;
      tokenIndex <= inlineSpan.tokenEnd;
      tokenIndex += 1
    ) {
      strongTokenIndexes.add(tokenIndex);
    }
  });

  return strongTokenIndexes;
}

function renderInlineStyleRuns(args: {
  isActive: boolean;
  onJumpToToken?: (tokenIndex: number) => void;
  strongTokenIndexes: Set<number>;
  tokens: Token[];
}) {
  const { isActive, onJumpToToken, strongTokenIndexes, tokens } = args;

  return buildInlineStyleRuns(tokens, strongTokenIndexes).map((run, runIndex, runs) => {
    const content = run.tokens.map((token, tokenIndex) => (
      <span key={token.index}>
        {renderToken({ isActive, onJumpToToken, token })}
        {tokenIndex < run.tokens.length - 1 ? " " : null}
      </span>
    ));

    if (!run.strong) {
      return (
        <span key={run.key}>
          {content}
          {runIndex < runs.length - 1 ? " " : null}
        </span>
      );
    }

    return (
      <span key={run.key}>
        <strong className="reader-inline-strong">{content}</strong>
        {runIndex < runs.length - 1 ? " " : null}
      </span>
    );
  });
}

function renderTokens(args: {
  activeIndexes: Set<number>;
  renderPlainText?: boolean;
  onJumpToToken?: (tokenIndex: number) => void;
  strongTokenIndexes: Set<number>;
  tokens: Token[];
}) {
  const {
    activeIndexes,
    onJumpToToken,
    renderPlainText = false,
    strongTokenIndexes,
    tokens,
  } = args;

  if (renderPlainText) {
    return tokens.map((token) => token.value).join(" ");
  }

  return buildTokenRuns(tokens, activeIndexes).map((run, runIndex, runs) => {
    const content = renderInlineStyleRuns({
      isActive: run.active,
      onJumpToToken,
      strongTokenIndexes,
      tokens: run.tokens,
    });

    return (
      <span key={run.key}>
        {run.active ? (
          <span className="reader-classic-active-run">
            <span className="reader-classic-active-run-surface">
              {content}
            </span>
          </span>
        ) : (
          content
        )}
        {runIndex < runs.length - 1 ? " " : null}
      </span>
    );
  });
}

export function ClassicReaderView({
  document: documentModel,
  chunk,
  simplifyMarkdownPreview = false,
  useMarkdownPreview = true,
  onJumpToToken,
  reduceMotion,
  visibleSourcePageIndex,
}: ClassicReaderViewProps) {
  const { locale } = useLocale();
  const activeParagraphRef = useRef<HTMLElement | null>(null);
  const [manualActiveMarkdownBlockIndex, setManualActiveMarkdownBlockIndex] =
    useState<{
      paragraphIndex: number;
      value: number | undefined;
    }>({
      paragraphIndex: chunk.paragraphIndex,
      value: undefined,
    });
  const activeIndexes = useMemo(() => new Set(chunk.tokenIndexes), [chunk]);
  const hasMarkdownPreviewSource = Boolean(
    documentModel.sourceKind === "markdown" && documentModel.rawText?.trim(),
  );
  const isSimplifiedMarkdownPreview =
    hasMarkdownPreviewSource && useMarkdownPreview && simplifyMarkdownPreview;
  const usesMarkdownPreview = hasMarkdownPreviewSource && useMarkdownPreview;
  const renderableBlocks = useMemo(
    () =>
      documentModel.blocks.filter((block) => {
        if (block.tokenEnd < block.tokenStart) {
          return false;
        }

        if (typeof visibleSourcePageIndex !== "number") {
          return true;
        }

        return block.sourcePageIndex === visibleSourcePageIndex;
      }),
    [documentModel.blocks, visibleSourcePageIndex],
  );
  const shouldWindowClassicBlocks =
    isSimplifiedMarkdownPreview ||
    renderableBlocks.length > LARGE_CLASSIC_WINDOW_THRESHOLD;
  const activeRenderableBlockIndex = useMemo(
    () =>
      renderableBlocks.findIndex((block) => block.index === chunk.paragraphIndex),
    [chunk.paragraphIndex, renderableBlocks],
  );
  const renderedBlockWindow = useMemo(() => {
    if (!shouldWindowClassicBlocks) {
      return buildRenderedBlockWindow({
        activeParagraphIndex: 0,
        maxVisibleBlocks: renderableBlocks.length,
        totalBlocks: renderableBlocks.length,
      });
    }

    return buildRenderedBlockWindow({
      activeParagraphIndex:
        activeRenderableBlockIndex >= 0 ? activeRenderableBlockIndex : 0,
      maxVisibleBlocks: isSimplifiedMarkdownPreview
        ? LARGE_MARKDOWN_VISIBLE_BLOCKS
        : LARGE_CLASSIC_VISIBLE_BLOCKS,
      totalBlocks: renderableBlocks.length,
    });
  }, [
    activeRenderableBlockIndex,
    isSimplifiedMarkdownPreview,
    renderableBlocks,
    shouldWindowClassicBlocks,
  ]);
  const renderedBlocks = useMemo(
    () =>
      renderableBlocks
        .slice(renderedBlockWindow.start, renderedBlockWindow.end)
        .map((block) => {
          const blockTokens = documentModel.tokens.slice(
            block.tokenStart,
            block.tokenEnd + 1,
          );

          return {
            activeTokenIndexes:
              block.index === chunk.paragraphIndex
                ? activeIndexes
                : inactiveTokenIndexes,
            block,
            isActive: block.index === chunk.paragraphIndex,
            strongTokenIndexes: buildStrongTokenIndexes(block.inlineSpans),
            tokens: blockTokens,
          };
        }),
    [
      activeIndexes,
      chunk.paragraphIndex,
      documentModel.tokens,
      renderableBlocks,
      renderedBlockWindow.end,
      renderedBlockWindow.start,
    ],
  );
  const markdownPreviewBlocks = useMemo(
    () =>
      usesMarkdownPreview && documentModel.rawText
        ? buildMarkdownPreviewBlocks(documentModel.rawText, documentModel)
        : [],
    [documentModel, usesMarkdownPreview],
  );
  const activeMarkdownBlockIndex = useMemo(() => {
    for (let index = 0; index < markdownPreviewBlocks.length; index += 1) {
      if (
        markdownPreviewBlocks[index]?.paragraphIndexes.includes(
          chunk.paragraphIndex,
        )
      ) {
        return index;
      }
    }

    return -1;
  }, [chunk.paragraphIndex, markdownPreviewBlocks]);
  const effectiveActiveMarkdownBlockIndex =
    (manualActiveMarkdownBlockIndex.paragraphIndex === chunk.paragraphIndex
      ? manualActiveMarkdownBlockIndex.value
      : undefined) ?? activeMarkdownBlockIndex;
  const renderedMarkdownWindow = useMemo(() => {
    if (!isSimplifiedMarkdownPreview) {
      return buildRenderedBlockWindow({
        activeParagraphIndex: 0,
        maxVisibleBlocks: markdownPreviewBlocks.length,
        totalBlocks: markdownPreviewBlocks.length,
      });
    }

    return buildRenderedBlockWindow({
      activeParagraphIndex:
        effectiveActiveMarkdownBlockIndex >= 0
          ? effectiveActiveMarkdownBlockIndex
          : 0,
      maxVisibleBlocks: LARGE_MARKDOWN_VISIBLE_BLOCKS,
      totalBlocks: markdownPreviewBlocks.length,
    });
  }, [
    effectiveActiveMarkdownBlockIndex,
    isSimplifiedMarkdownPreview,
    markdownPreviewBlocks.length,
  ]);
  const renderedMarkdownBlocks = useMemo(
    () =>
      markdownPreviewBlocks
        .slice(renderedMarkdownWindow.start, renderedMarkdownWindow.end)
        .map((block, offset) => ({
          block,
          index: renderedMarkdownWindow.start + offset,
        })),
    [
      markdownPreviewBlocks,
      renderedMarkdownWindow.end,
      renderedMarkdownWindow.start,
    ],
  );
  const markdownHeadingTargets = useMemo(() => {
    const targets = new Map<string, number>();

    for (const block of markdownPreviewBlocks) {
      if (block.headingId && typeof block.tokenStart === "number") {
        targets.set(block.headingId, block.tokenStart);
      }
    }

    return targets;
  }, [markdownPreviewBlocks]);
  const markdownHeadingIndexes = useMemo(() => {
    const indexes = new Map<string, number>();

    markdownPreviewBlocks.forEach((block, index) => {
      if (block.headingId) {
        indexes.set(block.headingId, index);
      }
    });

    return indexes;
  }, [markdownPreviewBlocks]);

  useEffect(() => {
    const scrollBehavior =
      reduceMotion || shouldPreferDirectReaderScroll() ? "auto" : "smooth";

    activeParagraphRef.current?.scrollIntoView({
      behavior: scrollBehavior,
      block: "nearest",
      inline: "nearest",
    });
  }, [chunk.paragraphIndex, effectiveActiveMarkdownBlockIndex, reduceMotion]);

  const classicReaderLabel = getLocalizedCopy(locale, {
    en: "Classic Reader",
    es: "Lector clásico",
    pt: "Leitor classico",
  });

  const viewportLabel = getLocalizedCopy(locale, {
    en: "Classic reader document",
    es: "Documento del Lector clásico",
    pt: "Documento do leitor classico",
  });

  const handleJumpToToken = useCallback(
    (tokenIndex: number) => {
      onJumpToToken?.(tokenIndex);
    },
    [onJumpToToken],
  );
  const handleMarkdownAnchorNavigation = useCallback(
    (href: string) => {
      const targetId = decodeMarkdownAnchor(href.slice(1));

      if (!targetId) {
        return;
      }

      const targetMarkdownBlockIndex =
        markdownHeadingIndexes.get(targetId) ??
        markdownHeadingIndexes.get(targetId.toLowerCase());

      if (typeof targetMarkdownBlockIndex === "number") {
        setManualActiveMarkdownBlockIndex({
          paragraphIndex: chunk.paragraphIndex,
          value: targetMarkdownBlockIndex,
        });
      }

      const targetTokenStart =
        markdownHeadingTargets.get(targetId) ??
        markdownHeadingTargets.get(targetId.toLowerCase());

      if (typeof targetTokenStart === "number") {
        handleJumpToToken(targetTokenStart);
        return;
      }

      const scrollBehavior =
        reduceMotion || shouldPreferDirectReaderScroll() ? "auto" : "smooth";

      window.document.getElementById(targetId)?.scrollIntoView({
        behavior: scrollBehavior,
        block: "start",
      });
    },
    [
      chunk.paragraphIndex,
      handleJumpToToken,
      markdownHeadingIndexes,
      markdownHeadingTargets,
      reduceMotion,
    ],
  );
  const previousHiddenBlockTokenStart =
    renderedBlockWindow.hiddenBeforeCount > 0
      ? renderableBlocks[renderedBlockWindow.start - 1]?.tokenStart
      : undefined;
  const nextHiddenBlockTokenStart =
    renderedBlockWindow.hiddenAfterCount > 0
      ? renderableBlocks[renderedBlockWindow.end]?.tokenStart
      : undefined;
  const previousHiddenMarkdownTokenStart =
    renderedMarkdownWindow.hiddenBeforeCount > 0
      ? findLastMarkdownPreviewTokenStart(
          markdownPreviewBlocks,
          renderedMarkdownWindow.start - 1,
        )
      : undefined;
  const nextHiddenMarkdownTokenStart =
    renderedMarkdownWindow.hiddenAfterCount > 0
      ? findFirstMarkdownPreviewTokenStart(
          markdownPreviewBlocks,
          renderedMarkdownWindow.end,
        )
      : undefined;

  const renderClassicDocumentBlock = (args: {
    activeTokenIndexes: Set<number>;
    block: DocumentModel["blocks"][number];
    headingTagName?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    isActive: boolean;
    keyValue: string | number;
    renderPlainTextWhenInactive?: boolean;
    strongTokenIndexes: Set<number>;
    tokens: Token[];
    useArticleTag?: boolean;
  }) => {
    const {
      activeTokenIndexes,
      block,
      headingTagName,
      isActive,
      keyValue,
      renderPlainTextWhenInactive = false,
      strongTokenIndexes,
      tokens,
      useArticleTag = true,
    } = args;
    const ContainerTag = useArticleTag ? "article" : "div";
    const HeadingTag = headingTagName ?? "h3";
    const body = renderTokens({
      activeIndexes: activeTokenIndexes,
      onJumpToToken:
        renderPlainTextWhenInactive && !isActive ? undefined : handleJumpToToken,
      renderPlainText: renderPlainTextWhenInactive && !isActive,
      strongTokenIndexes,
      tokens,
    });
    const isCentered = block.alignment === "center";
    const listMarker = block.marker ? (
      <span className="reader-accent pt-[0.1em] font-medium tabular-nums">
        {block.marker}
      </span>
    ) : (
      <span className="reader-accent mt-[0.85em] h-2 w-2 shrink-0 rounded-full bg-current" />
    );

    return (
      <ContainerTag
        key={keyValue}
        ref={(node) => {
          if (isActive) {
            activeParagraphRef.current = node;
          }
        }}
        data-reader-classic-active={isActive ? "true" : undefined}
        data-reader-paragraph-index={block.index}
        className={`scroll-mt-4 rounded-[1.15rem] transition md:scroll-mt-6 md:rounded-[1.35rem] ${
          isActive
            ? "px-4 py-3 md:px-5 md:py-4"
            : block.kind === "heading"
              ? "px-1 py-1.5 md:px-2 md:py-2"
              : "px-1 py-2 md:px-2 md:py-3"
        }`}
        onClick={
          onJumpToToken
            ? (event) => {
                event.stopPropagation();
                handleJumpToToken(block.tokenStart);
              }
            : undefined
        }
      >
        {block.kind === "heading" ? (
          <HeadingTag
            aria-label={block.text}
            className={`reader-panel-strong-text font-heading text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl ${
              isCentered ? "text-center" : "text-left"
            }`}
          >
            {body}
          </HeadingTag>
        ) : block.kind === "list-item" ? (
          <p className="reader-body reader-list-body reader-muted grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            {listMarker}
            <span className="reader-body-justified">{body}</span>
          </p>
        ) : (
          <p
            className={`reader-body reader-muted ${
              isCentered ? "text-center" : "reader-body-justified"
            }`}
          >
            {body}
          </p>
        )}
      </ContainerTag>
    );
  };

  const markdownComponents = useMemo(
    () => ({
      a: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => {
        const isInternalLink = typeof href === "string" && href.startsWith("#");

        return (
          <a
            {...props}
            href={href}
            className="reader-markdown-link"
            rel={isInternalLink ? undefined : "noreferrer noopener"}
            target={isInternalLink ? undefined : "_blank"}
            onClick={(event) => {
              event.stopPropagation();
              props.onClick?.(event);

              if (!isInternalLink || !href) {
                return;
              }

              event.preventDefault();
              handleMarkdownAnchorNavigation(href);
            }}
          >
            {children}
          </a>
        );
      },
      h1: createHeadingRenderer(
        "h1",
        "reader-markdown-heading reader-markdown-h1",
      ),
      h2: createHeadingRenderer(
        "h2",
        "reader-markdown-heading reader-markdown-h2",
      ),
      h3: createHeadingRenderer(
        "h3",
        "reader-markdown-heading reader-markdown-h3",
      ),
      h4: createHeadingRenderer(
        "h4",
        "reader-markdown-heading reader-markdown-h4",
      ),
      h5: createHeadingRenderer(
        "h5",
        "reader-markdown-heading reader-markdown-h5",
      ),
      h6: createHeadingRenderer(
        "h6",
        "reader-markdown-heading reader-markdown-h6",
      ),
      table: (props: ComponentPropsWithoutRef<"table">) => (
        <div className="reader-markdown-table-wrap">
          <table {...props} />
        </div>
      ),
      pre: ({ children, ...props }: ComponentPropsWithoutRef<"pre">) => {
        const mermaidChart = extractMermaidChart(children);

        if (mermaidChart) {
          return <MarkdownMermaidDiagram chart={mermaidChart} />;
        }

        return <pre {...props}>{children}</pre>;
      },
    }),
    [handleMarkdownAnchorNavigation],
  );

  return (
    <div className="reader-panel flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] px-4 py-5 text-left md:rounded-[1.65rem] md:px-7 md:py-7 lg:rounded-[1.75rem] lg:px-10 lg:py-10">
      <div className="shrink-0">
        <p className="reader-accent text-xs tracking-[0.24em] uppercase md:text-sm md:tracking-[0.28em]">
          {classicReaderLabel}
        </p>
      </div>
      <div
        aria-label={viewportLabel}
        className="reader-scroll-area mt-4 flex-1 overflow-y-auto overscroll-contain pr-1.5 md:mt-5 md:pr-3 lg:pr-4"
      >
        {usesMarkdownPreview ? (
          <div className="space-y-4 pb-4 md:space-y-5 md:pb-5">
            {isSimplifiedMarkdownPreview &&
            renderedMarkdownWindow.hiddenBeforeCount > 0 ? (
              <button
                type="button"
                data-reader-window-sentinel="before"
                disabled={typeof previousHiddenMarkdownTokenStart !== "number"}
                className="reader-panel-surface reader-muted w-full rounded-[1.15rem] px-4 py-3 text-left text-sm transition disabled:cursor-default disabled:opacity-60 md:rounded-[1.35rem] md:px-5 md:py-4"
                onClick={() => {
                  if (typeof previousHiddenMarkdownTokenStart === "number") {
                    handleJumpToToken(previousHiddenMarkdownTokenStart);
                  }
                }}
              >
                {getLocalizedCopy(locale, {
                  en: `${renderedMarkdownWindow.hiddenBeforeCount} earlier sections hidden to keep large Markdown responsive.`,
                  es: `${renderedMarkdownWindow.hiddenBeforeCount} secciones anteriores ocultas para mantener rapido el Markdown grande.`,
                  pt: `${renderedMarkdownWindow.hiddenBeforeCount} secoes anteriores ocultas para manter o Markdown grande rapido.`,
                })}
              </button>
            ) : null}
            {renderedMarkdownBlocks.map(({ block, index }) => {
              const isActive = index === effectiveActiveMarkdownBlockIndex;
              const tokenStart = block.tokenStart;
              const activeMarkdownBlocks = block.paragraphIndexes
                .map((paragraphIndex) => documentModel.blocks[paragraphIndex])
                .filter(
                  (
                    documentBlock,
                  ): documentBlock is DocumentModel["blocks"][number] =>
                    Boolean(
                      documentBlock &&
                        documentBlock.tokenEnd >= documentBlock.tokenStart,
                    ),
                );

              return (
                <article
                  key={block.key}
                  id={block.headingId}
                  ref={
                    isActive && activeMarkdownBlocks.length === 0
                      ? activeParagraphRef
                      : null
                  }
                  data-reader-classic-active={isActive ? "true" : undefined}
                  data-reader-markdown-block-index={index}
                  className="reader-markdown-block scroll-mt-4 rounded-[1.15rem] px-4 py-3 transition md:scroll-mt-6 md:rounded-[1.35rem] md:px-5 md:py-4"
                  onClick={
                    !isActive && onJumpToToken && typeof tokenStart === "number"
                      ? (event) => {
                          event.stopPropagation();
                          handleJumpToToken(tokenStart);
                        }
                      : undefined
                  }
                >
                  {isActive && activeMarkdownBlocks.length > 0 ? (
                    <div className="space-y-3 md:space-y-4">
                      {activeMarkdownBlocks.map((documentBlock) => {
                        const tokens = documentModel.tokens.slice(
                          documentBlock.tokenStart,
                          documentBlock.tokenEnd + 1,
                        );

                        return renderClassicDocumentBlock({
                          activeTokenIndexes:
                            documentBlock.index === chunk.paragraphIndex
                              ? activeIndexes
                              : inactiveTokenIndexes,
                          block: documentBlock,
                          headingTagName:
                            block.nodeType === "heading"
                              ? (`h${block.headingDepth ?? 3}` as
                                  | "h1"
                                  | "h2"
                                  | "h3"
                                  | "h4"
                                  | "h5"
                                  | "h6")
                              : undefined,
                          isActive: documentBlock.index === chunk.paragraphIndex,
                          keyValue: `${block.key}:${documentBlock.index}`,
                          strongTokenIndexes: buildStrongTokenIndexes(
                            documentBlock.inlineSpans,
                          ),
                          tokens,
                          useArticleTag: false,
                        });
                      })}
                    </div>
                  ) : (
                    <div className="reader-markdown-preview reader-muted">
                      <ReactMarkdown
                        components={markdownComponents}
                        remarkPlugins={[remarkGfm]}
                      >
                        {block.markdown}
                      </ReactMarkdown>
                    </div>
                  )}
                </article>
              );
            })}
            {isSimplifiedMarkdownPreview &&
            renderedMarkdownWindow.hiddenAfterCount > 0 ? (
              <button
                type="button"
                data-reader-window-sentinel="after"
                disabled={typeof nextHiddenMarkdownTokenStart !== "number"}
                className="reader-panel-surface reader-muted w-full rounded-[1.15rem] px-4 py-3 text-left text-sm transition disabled:cursor-default disabled:opacity-60 md:rounded-[1.35rem] md:px-5 md:py-4"
                onClick={() => {
                  if (typeof nextHiddenMarkdownTokenStart === "number") {
                    handleJumpToToken(nextHiddenMarkdownTokenStart);
                  }
                }}
              >
                {getLocalizedCopy(locale, {
                  en: `${renderedMarkdownWindow.hiddenAfterCount} later sections hidden to keep large Markdown responsive.`,
                  es: `${renderedMarkdownWindow.hiddenAfterCount} secciones posteriores ocultas para mantener rapido el Markdown grande.`,
                  pt: `${renderedMarkdownWindow.hiddenAfterCount} secoes posteriores ocultas para manter o Markdown grande rapido.`,
                })}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 pb-3 md:space-y-4 md:pb-4">
            {shouldWindowClassicBlocks &&
            renderedBlockWindow.hiddenBeforeCount > 0 ? (
              <button
                type="button"
                data-reader-window-sentinel="before"
                className="reader-panel-surface reader-muted w-full rounded-[1.15rem] px-4 py-3 text-left text-sm transition md:rounded-[1.35rem] md:px-5 md:py-4"
                onClick={() => {
                  if (typeof previousHiddenBlockTokenStart === "number") {
                    handleJumpToToken(previousHiddenBlockTokenStart);
                  }
                }}
              >
                {getLocalizedCopy(locale, {
                  en: `${renderedBlockWindow.hiddenBeforeCount} earlier sections hidden to keep this long document responsive.`,
                  es: `${renderedBlockWindow.hiddenBeforeCount} secciones anteriores ocultas para mantener este documento largo rapido.`,
                  pt: `${renderedBlockWindow.hiddenBeforeCount} secoes anteriores ocultas para manter este documento longo rapido.`,
                })}
              </button>
            ) : null}
            {renderedBlocks.map(
              ({ activeTokenIndexes, block, isActive, strongTokenIndexes, tokens }) =>
                renderClassicDocumentBlock({
                  activeTokenIndexes,
                  block,
                  isActive,
                  keyValue: block.index,
                  renderPlainTextWhenInactive: isSimplifiedMarkdownPreview,
                  strongTokenIndexes,
                  tokens,
                }),
            )}
            {shouldWindowClassicBlocks &&
            renderedBlockWindow.hiddenAfterCount > 0 ? (
              <button
                type="button"
                data-reader-window-sentinel="after"
                className="reader-panel-surface reader-muted w-full rounded-[1.15rem] px-4 py-3 text-left text-sm transition md:rounded-[1.35rem] md:px-5 md:py-4"
                onClick={() => {
                  if (typeof nextHiddenBlockTokenStart === "number") {
                    handleJumpToToken(nextHiddenBlockTokenStart);
                  }
                }}
              >
                {getLocalizedCopy(locale, {
                  en: `${renderedBlockWindow.hiddenAfterCount} later sections hidden to keep this long document responsive.`,
                  es: `${renderedBlockWindow.hiddenAfterCount} secciones posteriores ocultas para mantener este documento largo rapido.`,
                  pt: `${renderedBlockWindow.hiddenAfterCount} secoes posteriores ocultas para manter este documento longo rapido.`,
                })}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

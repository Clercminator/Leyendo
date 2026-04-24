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
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel, Token } from "@/types/document";

interface ClassicReaderViewProps {
  document: DocumentModel;
  chunk: Chunk;
  simplifyMarkdownPreview?: boolean;
  onJumpToToken?: (tokenIndex: number) => void;
  reduceMotion: boolean;
}

interface MarkdownPreviewBlock {
  key: string;
  markdown: string;
  paragraphIndexes: number[];
  headingId?: string;
  tokenStart?: number;
}

interface RenderedBlockWindow {
  end: number;
  hiddenAfterCount: number;
  hiddenBeforeCount: number;
  start: number;
}

const inactiveTokenIndexes = new Set<number>();
const LARGE_MARKDOWN_VISIBLE_BLOCKS = 36;

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
    return "Code snippet included in this section. Switch to Literal text to inspect the code.";
  }

  return node.lang.toLowerCase() === "mermaid"
    ? "Mermaid diagram included in this section. Switch to Literal text to inspect the diagram source."
    : "Code snippet included in this section. Switch to Literal text to inspect the code.";
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

  return nodes.flatMap((node, index) => {
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
      nodeType === "code"
        ? getCodeFencePlaceholder(node)
        : extractMarkdownText(node),
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
        key: `${index}-${start ?? 0}-${end ?? 0}`,
        markdown: markdownSource,
        paragraphIndexes,
        headingId,
        tokenStart:
          paragraphIndexes.length > 0
            ? document.blocks[paragraphIndexes[0]]?.tokenStart
            : undefined,
      } satisfies MarkdownPreviewBlock,
    ];
  });
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
          ? "cursor-pointer rounded-md px-[0.04em] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-sky)"
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

function renderTokens(args: {
  activeIndexes: Set<number>;
  renderPlainText?: boolean;
  onJumpToToken?: (tokenIndex: number) => void;
  tokens: Token[];
}) {
  const { activeIndexes, onJumpToToken, renderPlainText = false, tokens } = args;

  if (renderPlainText) {
    return tokens.map((token) => token.value).join(" ");
  }

  return buildTokenRuns(tokens, activeIndexes).map((run) => {
    if (!run.active) {
      return run.tokens.map((token, tokenIndex) => (
        <span key={token.index}>
          {renderToken({ isActive: false, onJumpToToken, token })}
          {tokenIndex < run.tokens.length - 1 ? " " : null}
        </span>
      ));
    }

    return (
      <span key={run.key} className="reader-classic-active-run">
        {run.tokens.map((token, tokenIndex) => (
          <span key={token.index}>
            {renderToken({ isActive: true, onJumpToToken, token })}
            {tokenIndex < run.tokens.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    );
  });
}

export function ClassicReaderView({
  document: documentModel,
  chunk,
  simplifyMarkdownPreview = false,
  onJumpToToken,
  reduceMotion,
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
    hasMarkdownPreviewSource && simplifyMarkdownPreview;
  const usesMarkdownPreview = hasMarkdownPreviewSource;
  const renderableBlocks = useMemo(
    () =>
      documentModel.blocks.filter((block) => block.tokenEnd >= block.tokenStart),
    [documentModel.blocks],
  );
  const renderedBlockWindow = useMemo(() => {
    if (!isSimplifiedMarkdownPreview) {
      return buildRenderedBlockWindow({
        activeParagraphIndex: 0,
        maxVisibleBlocks: renderableBlocks.length,
        totalBlocks: renderableBlocks.length,
      });
    }

    const activeBlockIndex = renderableBlocks.findIndex(
      (block) => block.index === chunk.paragraphIndex,
    );

    return buildRenderedBlockWindow({
      activeParagraphIndex: activeBlockIndex >= 0 ? activeBlockIndex : 0,
      maxVisibleBlocks: LARGE_MARKDOWN_VISIBLE_BLOCKS,
      totalBlocks: renderableBlocks.length,
    });
  }, [chunk.paragraphIndex, isSimplifiedMarkdownPreview, renderableBlocks]);
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
    activeParagraphRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [chunk.paragraphIndex, effectiveActiveMarkdownBlockIndex, reduceMotion]);

  const classicReaderLabel = getLocalizedCopy(locale, {
    en: "Classic Reader",
    es: "Lector clasico",
    pt: "Leitor classico",
  });

  const viewportLabel = getLocalizedCopy(locale, {
    en: "Classic reader document",
    es: "Documento del lector clasico",
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

      window.document.getElementById(targetId)?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
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
      ? markdownPreviewBlocks[renderedMarkdownWindow.start - 1]?.tokenStart
      : undefined;
  const nextHiddenMarkdownTokenStart =
    renderedMarkdownWindow.hiddenAfterCount > 0
      ? markdownPreviewBlocks[renderedMarkdownWindow.end]?.tokenStart
      : undefined;

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
    <div className="reader-panel flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/10 px-4 py-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:rounded-[1.65rem] md:px-7 md:py-7 lg:rounded-[1.75rem] lg:px-10 lg:py-10">
      <div className="shrink-0">
        <p className="reader-accent text-xs tracking-[0.24em] uppercase md:text-sm md:tracking-[0.28em]">
          {classicReaderLabel}
        </p>
      </div>
      <div
        aria-label={viewportLabel}
        className="mt-4 flex-1 overflow-y-auto overscroll-contain pr-1.5 md:mt-5 md:pr-3 lg:pr-4"
      >
        {usesMarkdownPreview ? (
          <div className="space-y-4 pb-4 md:space-y-5 md:pb-5">
            {isSimplifiedMarkdownPreview &&
            renderedMarkdownWindow.hiddenBeforeCount > 0 ? (
              <button
                type="button"
                data-reader-window-sentinel="before"
                className="reader-muted w-full rounded-[1.15rem] border border-white/8 bg-white/4 px-4 py-3 text-left text-sm transition hover:border-white/15 hover:bg-white/6 md:rounded-[1.35rem] md:px-5 md:py-4"
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

              return (
                <article
                  key={block.key}
                  id={block.headingId}
                  ref={isActive ? activeParagraphRef : null}
                  data-reader-classic-active={isActive ? "true" : undefined}
                  data-reader-markdown-block-index={index}
                  className={`reader-markdown-block scroll-mt-4 rounded-[1.15rem] px-4 py-3 transition md:scroll-mt-6 md:rounded-[1.35rem] md:px-5 md:py-4 ${
                    isActive ? "reader-active-paragraph" : ""
                  }`}
                  onClick={
                    onJumpToToken && typeof tokenStart === "number"
                      ? (event) => {
                          event.stopPropagation();
                          handleJumpToToken(tokenStart);
                        }
                      : undefined
                  }
                >
                  <div className="reader-markdown-preview reader-muted">
                    <ReactMarkdown
                      components={markdownComponents}
                      remarkPlugins={[remarkGfm]}
                    >
                      {block.markdown}
                    </ReactMarkdown>
                  </div>
                </article>
              );
            })}
            {isSimplifiedMarkdownPreview &&
            renderedMarkdownWindow.hiddenAfterCount > 0 ? (
              <button
                type="button"
                data-reader-window-sentinel="after"
                className="reader-muted w-full rounded-[1.15rem] border border-white/8 bg-white/4 px-4 py-3 text-left text-sm transition hover:border-white/15 hover:bg-white/6 md:rounded-[1.35rem] md:px-5 md:py-4"
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
            {isSimplifiedMarkdownPreview &&
            renderedBlockWindow.hiddenBeforeCount > 0 ? (
              <button
                type="button"
                data-reader-window-sentinel="before"
                className="reader-muted w-full rounded-[1.15rem] border border-white/8 bg-white/4 px-4 py-3 text-left text-sm transition hover:border-white/15 hover:bg-white/6 md:rounded-[1.35rem] md:px-5 md:py-4"
                onClick={() => {
                  if (typeof previousHiddenBlockTokenStart === "number") {
                    handleJumpToToken(previousHiddenBlockTokenStart);
                  }
                }}
              >
                {getLocalizedCopy(locale, {
                  en: `${renderedBlockWindow.hiddenBeforeCount} earlier sections hidden to keep large Markdown responsive.`,
                  es: `${renderedBlockWindow.hiddenBeforeCount} secciones anteriores ocultas para mantener rapido el Markdown grande.`,
                  pt: `${renderedBlockWindow.hiddenBeforeCount} secoes anteriores ocultas para manter o Markdown grande rapido.`,
                })}
              </button>
            ) : null}
            {renderedBlocks.map(
              ({ activeTokenIndexes, block, isActive, tokens }) => {
                const body = renderTokens({
                  activeIndexes: activeTokenIndexes,
                  onJumpToToken:
                    isSimplifiedMarkdownPreview && !isActive
                      ? undefined
                      : handleJumpToToken,
                  renderPlainText: isSimplifiedMarkdownPreview && !isActive,
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
                  <article
                    key={block.index}
                    ref={isActive ? activeParagraphRef : null}
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
                      <h3
                        className={`font-heading text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl ${
                          isCentered ? "text-center" : "text-left"
                        }`}
                      >
                        {body}
                      </h3>
                    ) : block.kind === "list-item" ? (
                      <p className="reader-body reader-muted grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                        {listMarker}
                        <span>{body}</span>
                      </p>
                    ) : (
                      <p
                        className={`reader-body reader-muted ${isCentered ? "text-center" : "text-left"}`}
                      >
                        {body}
                      </p>
                    )}
                  </article>
                );
              },
            )}
            {isSimplifiedMarkdownPreview &&
            renderedBlockWindow.hiddenAfterCount > 0 ? (
              <button
                type="button"
                data-reader-window-sentinel="after"
                className="reader-muted w-full rounded-[1.15rem] border border-white/8 bg-white/4 px-4 py-3 text-left text-sm transition hover:border-white/15 hover:bg-white/6 md:rounded-[1.35rem] md:px-5 md:py-4"
                onClick={() => {
                  if (typeof nextHiddenBlockTokenStart === "number") {
                    handleJumpToToken(nextHiddenBlockTokenStart);
                  }
                }}
              >
                {getLocalizedCopy(locale, {
                  en: `${renderedBlockWindow.hiddenAfterCount} later sections hidden to keep large Markdown responsive.`,
                  es: `${renderedBlockWindow.hiddenAfterCount} secciones posteriores ocultas para mantener rapido el Markdown grande.`,
                  pt: `${renderedBlockWindow.hiddenAfterCount} secoes posteriores ocultas para manter o Markdown grande rapido.`,
                })}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

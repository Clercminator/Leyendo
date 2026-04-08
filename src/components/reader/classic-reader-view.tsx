"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel, Token } from "@/types/document";

interface ClassicReaderViewProps {
  document: DocumentModel;
  chunk: Chunk;
  onJumpToToken?: (tokenIndex: number) => void;
  reduceMotion: boolean;
}

const inactiveTokenIndexes = new Set<number>();

function renderTokens(args: {
  activeIndexes: Set<number>;
  onJumpToToken?: (tokenIndex: number) => void;
  tokens: Token[];
}) {
  const { activeIndexes, onJumpToToken, tokens } = args;

  return tokens.map((token, tokenIndex) => {
    const isActive = activeIndexes.has(token.index);

    return (
      <span key={token.index}>
        <span
          {...(onJumpToToken ? ({ role: "button", tabIndex: 0 } as const) : {})}
          data-active={isActive ? "true" : undefined}
          data-reader-token-index={token.index}
          className={
            [
              isActive ? "reader-classic-active-run" : null,
              onJumpToToken
                ? "cursor-pointer rounded-md px-[0.04em] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-sky)"
                : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined
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
        {tokenIndex < tokens.length - 1 ? " " : null}
      </span>
    );
  });
}

export function ClassicReaderView({
  document,
  chunk,
  onJumpToToken,
  reduceMotion,
}: ClassicReaderViewProps) {
  const { locale } = useLocale();
  const activeParagraphRef = useRef<HTMLElement | null>(null);
  const activeIndexes = useMemo(() => new Set(chunk.tokenIndexes), [chunk]);
  const renderedBlocks = useMemo(
    () =>
      document.blocks
        .filter((block) => block.tokenEnd >= block.tokenStart)
        .map((block) => {
          const blockTokens = document.tokens.slice(
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
    [activeIndexes, chunk.paragraphIndex, document.blocks, document.tokens],
  );

  useEffect(() => {
    activeParagraphRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [chunk.paragraphIndex, reduceMotion]);

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

  return (
    <div className="reader-panel flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/10 px-4 py-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:rounded-[1.65rem] md:px-7 md:py-7 lg:rounded-[1.75rem] lg:px-10 lg:py-10">
      <div className="shrink-0">
        <p className="reader-accent text-xs tracking-[0.24em] uppercase md:text-sm md:tracking-[0.28em]">
          {classicReaderLabel}
        </p>
      </div>
      <div
        aria-label={viewportLabel}
        className="mt-4 flex-1 overflow-y-auto overscroll-contain pr-1.5 md:mt-5 md:pr-3 lg:pr-4"
      >
        <div className="space-y-3 pb-3 md:space-y-4 md:pb-4">
          {renderedBlocks.map(
            ({ activeTokenIndexes, block, isActive, tokens }) => {
              const body = renderTokens({
                activeIndexes: activeTokenIndexes,
                onJumpToToken: handleJumpToToken,
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
                      ? `${reduceMotion ? "reader-active-paragraph" : "reader-active-paragraph reader-active-paragraph-breathe"} px-4 py-3 md:px-5 md:py-4`
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
        </div>
      </div>
    </div>
  );
}

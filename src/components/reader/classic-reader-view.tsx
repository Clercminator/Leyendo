"use client";

import { useEffect, useMemo, useRef } from "react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel, Token } from "@/types/document";

interface ClassicReaderViewProps {
  document: DocumentModel;
  chunk: Chunk;
  reduceMotion: boolean;
}

const inactiveTokenIndexes = new Set<number>();

function renderTokens(tokens: Token[], activeIndexes: Set<number>) {
  return tokens.map((token, index) => {
    const isActive = activeIndexes.has(token.index);

    return (
      <span
        key={token.index}
        className={isActive ? "reader-classic-active-run" : undefined}
        data-active={isActive ? "true" : undefined}
      >
        {token.value}
        {index < tokens.length - 1 ? " " : null}
      </span>
    );
  });
}

export function ClassicReaderView({
  document,
  chunk,
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

  return (
    <div className="reader-panel flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 px-6 py-8 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-10 sm:py-10">
      <div className="shrink-0">
        <p className="reader-accent text-sm tracking-[0.28em] uppercase">
          {classicReaderLabel}
        </p>
      </div>
      <div
        aria-label={viewportLabel}
        className="mt-5 flex-1 overflow-y-auto overscroll-contain pr-2 sm:pr-4"
      >
        <div className="space-y-4 pb-4">
          {renderedBlocks.map(({ activeTokenIndexes, block, isActive, tokens }) => {
            const body = renderTokens(tokens, activeTokenIndexes);
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
                className={`scroll-mt-6 rounded-[1.35rem] transition ${
                  isActive
                    ? `${reduceMotion ? "reader-active-paragraph" : "reader-active-paragraph reader-active-paragraph-breathe"} px-5 py-4`
                    : block.kind === "heading"
                      ? "px-2 py-2"
                      : "px-2 py-3"
                }`}
              >
                {block.kind === "heading" ? (
                  <h3
                    className={`font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl ${
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
                  <p className={`reader-body reader-muted ${isCentered ? "text-center" : "text-left"}`}>
                    {body}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

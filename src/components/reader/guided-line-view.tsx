"use client";

import { useCallback, useMemo } from "react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel } from "@/types/document";

interface GuidedLineViewProps {
  document: DocumentModel;
  chunk: Chunk;
  chunks: Chunk[];
  focusWindow: number;
  onJumpToToken?: (tokenIndex: number) => void;
}

export function GuidedLineView({
  chunk,
  chunks,
  document,
  focusWindow,
  onJumpToToken,
}: GuidedLineViewProps) {
  const { locale } = useLocale();
  const { activeLineIndex, paragraphChunks, visibleEnd, visibleStart } =
    useMemo(() => {
      let start = chunk.index;
      let end = chunk.index;

      while (
        start > 0 &&
        chunks[start - 1]?.paragraphIndex === chunk.paragraphIndex
      ) {
        start -= 1;
      }

      while (
        end < chunks.length - 1 &&
        chunks[end + 1]?.paragraphIndex === chunk.paragraphIndex
      ) {
        end += 1;
      }

      const paragraphLines = chunks.slice(start, end + 1);
      const lineIndex = chunk.index - start;
      const radius = Math.max(1, focusWindow);

      return {
        activeLineIndex: lineIndex,
        paragraphChunks: paragraphLines,
        visibleStart: Math.max(0, lineIndex - radius),
        visibleEnd: Math.min(paragraphLines.length - 1, lineIndex + radius),
      };
    }, [chunk.index, chunk.paragraphIndex, chunks, focusWindow]);

  const handleJumpToToken = useCallback(
    (tokenIndex: number) => {
      onJumpToToken?.(tokenIndex);
    },
    [onJumpToToken],
  );

  return (
    <div className="reader-panel flex h-full flex-1 flex-col rounded-[1.5rem] px-4 py-5 text-left md:rounded-[1.65rem] md:px-7 md:py-7 lg:rounded-[1.75rem] lg:px-10 lg:py-10">
      <p className="reader-accent text-xs tracking-[0.24em] uppercase md:text-sm md:tracking-[0.28em]">
        {getLocalizedCopy(locale, {
          en: "Guided Line",
          es: "Línea guiada",
          pt: "Linha guiada",
        })}
      </p>
      <div className="mt-4 flex flex-1 flex-col justify-center space-y-3 md:mt-5 md:space-y-4">
        {paragraphChunks
          .slice(visibleStart, visibleEnd + 1)
          .map((lineChunk, lineOffset) => {
            const lineIndex = visibleStart + lineOffset;
            const isActiveLine = lineIndex === activeLineIndex;
            const lineTokens = lineChunk.tokenIndexes
              .map((tokenIndex) => document.tokens[tokenIndex])
              .filter(Boolean);

            return (
              <div
                key={lineChunk.index}
                data-reader-line-active={isActiveLine ? "true" : undefined}
                data-reader-line-index={lineChunk.index}
                className="reader-guided-line rounded-[1.1rem] px-3 py-2.5 transition md:rounded-2xl md:px-4 md:py-3"
                onClick={
                  onJumpToToken
                    ? (event) => {
                        event.stopPropagation();
                        handleJumpToToken(lineChunk.anchorTokenIndex);
                      }
                    : undefined
                }
              >
                <p
                  className={`reader-guided-body ${
                    isActiveLine
                      ? "reader-guided-line-active-text text-lg font-medium md:text-2xl"
                      : "reader-muted text-base md:text-xl"
                  }`}
                >
                  {lineTokens.map((token, tokenIndex) => (
                    <span
                      key={token.index}
                      {...(onJumpToToken
                        ? ({ role: "button", tabIndex: 0 } as const)
                        : {})}
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
                              handleJumpToToken(token.index);
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
                              handleJumpToToken(token.index);
                            }
                          : undefined
                      }
                    >
                      {token.value}
                      {tokenIndex < lineTokens.length - 1 ? " " : null}
                    </span>
                  ))}
                </p>
              </div>
            );
          })}
      </div>
      <p className="reader-muted mt-5 text-sm leading-6 md:mt-6 md:leading-7">
        {getLocalizedCopy(locale, {
          en: "Follow the active line while nearby lines stay visible, so you keep paragraph context without scanning the whole page.",
          es: "Sigue la línea activa mientras las cercanas siguen visibles, para mantener el contexto del párrafo sin recorrer toda la página.",
          pt: "Siga a linha ativa enquanto as linhas proximas continuam visiveis para manter o contexto do paragrafo sem varrer a pagina inteira.",
        })}
      </p>
    </div>
  );
}

"use client";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel } from "@/types/document";

interface FocusWordViewProps {
  document: DocumentModel;
  chunk: Chunk;
}

export function FocusWordView({ document, chunk }: FocusWordViewProps) {
  const { locale } = useLocale();
  const tokens = chunk.tokenIndexes
    .map((tokenIndex) => document.tokens[tokenIndex])
    .filter(Boolean);
  const focusIndex = Math.max(
    0,
    tokens.findIndex((token) => token.index === chunk.anchorTokenIndex),
  );
  const focusToken = tokens[focusIndex];
  const previousTokensText = tokens
    .slice(0, focusIndex)
    .map((token) => token.value)
    .join(" ");
  const nextTokensText = tokens
    .slice(focusIndex + 1)
    .map((token) => token.value)
    .join(" ");

  return (
    <div className="reader-panel flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden rounded-[1.5rem] border border-white/10 px-4 py-6 text-center sm:min-h-72 sm:justify-center sm:rounded-[1.75rem] sm:px-6 sm:py-10">
      <div className="mb-4 h-px w-16 bg-white/10 sm:mb-6 sm:w-24" />
      <div className="max-w-4xl space-y-4 sm:space-y-6">
        <div className="space-y-3 sm:hidden">
          {previousTokensText ? (
            <p className="reader-dim text-sm leading-6">{previousTokensText}</p>
          ) : null}
          {focusToken ? (
            <p>
              <span className="reader-active-run inline-flex px-4 py-2 text-xl text-white">
                {focusToken.value}
              </span>
            </p>
          ) : null}
          {nextTokensText ? (
            <p className="reader-dim text-sm leading-6">{nextTokensText}</p>
          ) : null}
        </div>
        <p className="reader-focus-heading hidden flex-wrap items-center justify-center gap-2 font-semibold tracking-tight text-white sm:flex sm:gap-4">
          {tokens.slice(0, focusIndex).map((token) => (
            <span
              key={`${token.index}:${token.value}`}
              className="reader-dim text-base sm:text-2xl"
            >
              {token.value}
            </span>
          ))}
          {focusToken ? (
            <span className="reader-active-run px-4 py-2 text-2xl text-white sm:px-6 sm:py-3 sm:text-5xl">
              {focusToken.value}
            </span>
          ) : null}
          {tokens.slice(focusIndex + 1).map((token) => (
            <span
              key={`${token.index}:${token.value}`}
              className="reader-dim text-base sm:text-2xl"
            >
              {token.value}
            </span>
          ))}
        </p>
        <p className="reader-muted mx-auto max-w-2xl text-sm leading-6 sm:leading-7">
          {getLocalizedCopy(locale, {
            en: "Keep your eyes anchored on the bright focal word while nearby context stays available in the periphery.",
            es: "Mantén la vista anclada en la palabra focal brillante mientras el contexto cercano permanece visible en la periferia.",
            pt: "Mantenha os olhos ancorados na palavra focal em destaque enquanto o contexto proximo continua visivel na periferia.",
          })}
        </p>
      </div>
      <p className="reader-accent mt-5 text-xs tracking-[0.24em] uppercase sm:mt-6 sm:text-sm sm:tracking-[0.28em]">
        {getLocalizedCopy(locale, {
          en: "Focus Word",
          es: "Palabra foco",
          pt: "Palavra foco",
        })}
      </p>
    </div>
  );
}

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
    <div className="reader-panel flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden rounded-[1.5rem] px-4 py-6 text-center md:min-h-72 md:justify-center md:rounded-[1.65rem] md:px-6 md:py-8 lg:rounded-[1.75rem] lg:px-8 lg:py-10">
      <div className="reader-panel-divider mb-4 h-px w-16 md:mb-6 md:w-24" />
      <div className="max-w-4xl space-y-4 md:space-y-6">
        <div className="space-y-3 sm:hidden">
          {previousTokensText ? (
            <p className="reader-dim reader-focus-mobile-context">
              {previousTokensText}
            </p>
          ) : null}
          {focusToken ? (
            <p>
              <span className="reader-active-run reader-focus-mobile-active px-4 py-2">
                {focusToken.value}
              </span>
            </p>
          ) : null}
          {nextTokensText ? (
            <p className="reader-dim reader-focus-mobile-context">
              {nextTokensText}
            </p>
          ) : null}
        </div>
        <p className="reader-panel-strong-text reader-focus-heading hidden flex-wrap items-center justify-center gap-2 font-semibold tracking-tight md:flex md:gap-4">
          {tokens.slice(0, focusIndex).map((token) => (
            <span
              key={`${token.index}:${token.value}`}
              className="reader-dim reader-focus-context"
            >
              {token.value}
            </span>
          ))}
          {focusToken ? (
            <span className="reader-active-run reader-focus-active px-4 py-2 md:px-5 md:py-2.5 lg:px-6 lg:py-3">
              {focusToken.value}
            </span>
          ) : null}
          {tokens.slice(focusIndex + 1).map((token) => (
            <span
              key={`${token.index}:${token.value}`}
              className="reader-dim reader-focus-context"
            >
              {token.value}
            </span>
          ))}
        </p>
        <p className="reader-muted mx-auto max-w-2xl text-sm leading-6 md:leading-7">
          {getLocalizedCopy(locale, {
            en: "Keep your eyes anchored on the bright focal word while nearby context stays available in the periphery.",
            es: "Mantén la vista anclada en la palabra focal brillante mientras el contexto cercano permanece visible en la periferia.",
            pt: "Mantenha os olhos ancorados na palavra focal em destaque enquanto o contexto proximo continua visivel na periferia.",
          })}
        </p>
      </div>
      <p className="reader-accent mt-5 text-xs tracking-[0.24em] uppercase md:mt-6 md:text-sm md:tracking-[0.28em]">
        {getLocalizedCopy(locale, {
          en: "Focus Word",
          es: "Foco por palabra",
          pt: "Palavra foco",
        })}
      </p>
    </div>
  );
}

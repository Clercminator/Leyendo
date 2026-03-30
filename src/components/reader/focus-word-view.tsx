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

  return (
    <div className="reader-panel flex h-full min-h-72 flex-1 flex-col items-center justify-center rounded-[1.75rem] border border-white/10 px-6 py-10 text-center">
      <div className="mb-6 h-px w-24 bg-white/10" />
      <div className="max-w-4xl space-y-6">
        <p className="reader-focus-heading flex flex-wrap items-center justify-center gap-3 font-semibold tracking-tight text-white sm:gap-4">
          {tokens.slice(0, focusIndex).map((token) => (
            <span
              key={`${token.index}:${token.value}`}
              className="reader-dim text-lg sm:text-2xl"
            >
              {token.value}
            </span>
          ))}
          {focusToken ? (
            <span className="reader-active-run px-6 py-3 text-3xl text-white sm:text-5xl">
              {focusToken.value}
            </span>
          ) : null}
          {tokens.slice(focusIndex + 1).map((token) => (
            <span
              key={`${token.index}:${token.value}`}
              className="reader-dim text-lg sm:text-2xl"
            >
              {token.value}
            </span>
          ))}
        </p>
        <p className="reader-muted mx-auto max-w-2xl text-sm leading-7">
          {getLocalizedCopy(locale, {
            en: "Keep your eyes anchored on the bright focal word while nearby context stays available in the periphery.",
            es: "Mantén la vista anclada en la palabra focal brillante mientras el contexto cercano permanece visible en la periferia.",
            pt: "Mantenha os olhos ancorados na palavra focal em destaque enquanto o contexto proximo continua visivel na periferia.",
          })}
        </p>
      </div>
      <p className="reader-accent mt-6 text-sm tracking-[0.28em] uppercase">
        {getLocalizedCopy(locale, {
          en: "Focus Word",
          es: "Palabra foco",
          pt: "Palavra foco",
        })}
      </p>
    </div>
  );
}

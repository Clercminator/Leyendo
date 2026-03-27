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
  const focusIndex = Math.floor(tokens.length / 2);
  const chunkText = tokens.map((token) => token.value).join(" ");

  return (
    <div className="reader-panel flex h-full min-h-72 flex-1 flex-col items-center justify-center rounded-[1.75rem] border border-white/10 px-6 py-10 text-center">
      <div className="mb-6 h-px w-24 bg-white/10" />
      <h2 className="reader-focus-heading flex flex-wrap items-center justify-center gap-4 font-semibold tracking-tight text-white">
        {tokens.length > 1 ? (
          <span className="reader-active-run px-6 py-3 text-white">
            {chunkText}
          </span>
        ) : (
          tokens.map((token, index) => (
            <span
              key={`${token.index}:${token.value}`}
              className={index === focusIndex ? "text-white" : "reader-dim"}
            >
              {token.value}
            </span>
          ))
        )}
      </h2>
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

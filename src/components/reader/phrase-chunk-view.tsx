"use client";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel } from "@/types/document";

interface PhraseChunkViewProps {
  document: DocumentModel;
  chunk: Chunk;
  chunks: Chunk[];
}

export function PhraseChunkView({ chunk, chunks }: PhraseChunkViewProps) {
  const { locale } = useLocale();
  const previousChunk = chunks[chunk.index - 1];
  const nextChunk = chunks[chunk.index + 1];

  return (
    <div className="reader-panel flex h-full flex-1 flex-col rounded-[1.75rem] border border-white/10 px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-10 sm:py-10">
      <p className="reader-accent text-sm tracking-[0.28em] uppercase">
        {getLocalizedCopy(locale, {
          en: "Phrase Chunk",
          es: "Bloques de frases",
          pt: "Blocos de frases",
        })}
      </p>
      <div className="mt-6 flex flex-1 flex-col justify-center space-y-4">
        <p className="reader-dim text-base tracking-[0.24em] uppercase">
          {previousChunk?.text ?? ""}
        </p>
        <h2 className="reader-phrase-heading font-semibold tracking-tight text-white">
          {chunk.text}
        </h2>
        <p className="reader-dim text-base tracking-[0.24em] uppercase">
          {nextChunk?.text ?? ""}
        </p>
      </div>
      <p className="reader-muted mt-6 text-sm leading-7">
        {getLocalizedCopy(locale, {
          en: "Read in natural phrase groups with a calmer cadence than single-word focus.",
          es: "Lee en grupos de frases naturales con una cadencia mas calmada que el enfoque palabra por palabra.",
          pt: "Leia em grupos naturais de frases com uma cadencia mais calma do que o foco palavra por palavra.",
        })}
      </p>
    </div>
  );
}

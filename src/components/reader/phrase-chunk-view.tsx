"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel } from "@/types/document";

interface PhraseChunkViewProps {
  document: DocumentModel;
  chunk: Chunk;
  chunks: Chunk[];
}

export function PhraseChunkView({ document, chunk, chunks }: PhraseChunkViewProps) {
  const { locale } = useLocale();
  const sentenceChunks = useMemo(() => {
    let start = chunk.index;
    let end = chunk.index;

    while (start > 0 && chunks[start - 1]?.sentenceIndex === chunk.sentenceIndex) {
      start -= 1;
    }

    while (
      end < chunks.length - 1 &&
      chunks[end + 1]?.sentenceIndex === chunk.sentenceIndex
    ) {
      end += 1;
    }

    return chunks.slice(start, end + 1);
  }, [chunk.index, chunk.sentenceIndex, chunks]);
  const previousSentence = document.sentences[chunk.sentenceIndex - 1]?.text;
  const nextSentence = document.sentences[chunk.sentenceIndex + 1]?.text;

  return (
    <div className="reader-panel flex h-full flex-1 flex-col rounded-[1.75rem] border border-white/10 px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-10 sm:py-10">
      <p className="reader-accent text-sm tracking-[0.28em] uppercase">
        {getLocalizedCopy(locale, {
          en: "Phrase Chunk",
          es: "Bloques de frases",
          pt: "Blocos de frases",
        })}
      </p>
      <div className="mt-6 flex flex-1 flex-col justify-center gap-6">
        <p className="reader-dim min-h-6 text-sm tracking-[0.14em] uppercase sm:text-base">
          {previousSentence ?? ""}
        </p>
        <div className="mx-auto max-w-5xl">
          <h2 className="reader-phrase-heading flex flex-wrap items-center justify-center gap-3 font-semibold tracking-tight text-white sm:gap-4">
            {sentenceChunks.map((sentenceChunk) => {
              const isActiveChunk = sentenceChunk.index === chunk.index;

              return (
                <span
                  key={sentenceChunk.index}
                  className={isActiveChunk ? "reader-active-run px-5 py-2 text-white" : "reader-dim text-2xl sm:text-4xl"}
                >
                  {sentenceChunk.text}
                </span>
              );
            })}
          </h2>
        </div>
        <p className="reader-dim min-h-6 text-sm tracking-[0.14em] uppercase sm:text-base">
          {nextSentence ?? ""}
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

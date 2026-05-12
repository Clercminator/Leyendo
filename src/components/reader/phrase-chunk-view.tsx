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

export function PhraseChunkView({
  document,
  chunk,
  chunks,
}: PhraseChunkViewProps) {
  const { locale } = useLocale();
  const sentenceChunks = useMemo(() => {
    let start = chunk.index;
    let end = chunk.index;

    while (
      start > 0 &&
      chunks[start - 1]?.sentenceIndex === chunk.sentenceIndex
    ) {
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
    <div className="reader-panel flex h-full flex-1 flex-col rounded-[1.5rem] px-4 py-5 text-center md:rounded-[1.65rem] md:px-7 md:py-7 lg:rounded-[1.75rem] lg:px-10 lg:py-10">
      <p className="reader-accent text-xs tracking-[0.24em] uppercase md:text-sm md:tracking-[0.28em]">
        {getLocalizedCopy(locale, {
          en: "Phrase Chunk",
          es: "Bloques de frases",
          pt: "Blocos de frases",
        })}
      </p>
      <div className="mt-4 flex flex-1 flex-col justify-center gap-4 md:mt-5 md:gap-5 lg:mt-6 lg:gap-6">
        <p className="reader-dim reader-phrase-context min-h-5 tracking-[0.12em] uppercase md:min-h-6 md:tracking-[0.14em]">
          {previousSentence ?? ""}
        </p>
        <div className="mx-auto max-w-5xl">
          <h2 className="reader-panel-strong-text reader-phrase-heading flex flex-wrap items-center justify-center gap-2.5 font-semibold tracking-tight md:gap-4">
            {sentenceChunks.map((sentenceChunk) => {
              const isActiveChunk = sentenceChunk.index === chunk.index;

              return (
                <span
                  key={sentenceChunk.index}
                  className={
                    isActiveChunk
                      ? "reader-active-run reader-phrase-run px-3 py-1.5 md:px-4 md:py-2 lg:px-5"
                      : "reader-dim reader-phrase-run"
                  }
                >
                  {sentenceChunk.text}
                </span>
              );
            })}
          </h2>
        </div>
        <p className="reader-dim reader-phrase-context min-h-5 tracking-[0.12em] uppercase md:min-h-6 md:tracking-[0.14em]">
          {nextSentence ?? ""}
        </p>
      </div>
      <p className="reader-muted mt-5 text-sm leading-6 md:mt-6 md:leading-7">
        {getLocalizedCopy(locale, {
          en: "Read in natural phrase groups with a calmer cadence than single-word focus.",
          es: "Lee en grupos de frases naturales, con una cadencia más calmada que el foco por palabra.",
          pt: "Leia em grupos naturais de frases com uma cadencia mais calma do que o foco palavra por palavra.",
        })}
      </p>
    </div>
  );
}

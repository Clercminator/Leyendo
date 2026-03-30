"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel } from "@/types/document";

interface GuidedLineViewProps {
  document: DocumentModel;
  chunk: Chunk;
  chunks: Chunk[];
  focusWindow: number;
}

export function GuidedLineView({ chunk, chunks, focusWindow }: GuidedLineViewProps) {
  const { locale } = useLocale();
  const { activeLineIndex, paragraphChunks, visibleEnd, visibleStart } = useMemo(() => {
    let start = chunk.index;
    let end = chunk.index;

    while (start > 0 && chunks[start - 1]?.paragraphIndex === chunk.paragraphIndex) {
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

  return (
    <div className="reader-panel flex h-full flex-1 flex-col rounded-[1.75rem] border border-white/10 px-6 py-8 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-10 sm:py-10">
      <p className="reader-accent text-sm tracking-[0.28em] uppercase">
        {getLocalizedCopy(locale, {
          en: "Guided Line",
          es: "Linea guiada",
          pt: "Linha guiada",
        })}
      </p>
      <div className="mt-6 flex flex-1 flex-col justify-center space-y-4">
        {paragraphChunks.slice(visibleStart, visibleEnd + 1).map((lineChunk, lineOffset) => {
          const lineIndex = visibleStart + lineOffset;
          const isActiveLine = lineIndex === activeLineIndex;

          return (
            <div
              key={lineChunk.index}
              className={`rounded-2xl px-4 py-3 transition ${
                isActiveLine
                  ? "border border-white/10 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                  : "bg-white/3 opacity-55"
              }`}
            >
              <p
                className={`reader-guided-body ${
                  isActiveLine
                    ? "text-xl font-medium text-white sm:text-2xl"
                    : "reader-muted text-lg sm:text-xl"
                }`}
              >
                {lineChunk.text}
              </p>
            </div>
          );
        })}
      </div>
      <p className="reader-muted mt-6 text-sm leading-7">
        {getLocalizedCopy(locale, {
          en: "Follow the active line while nearby lines stay visible, so you keep paragraph context without scanning the whole page.",
          es: "Sigue la linea activa mientras las lineas cercanas siguen visibles para mantener el contexto del parrafo sin recorrer toda la pagina.",
          pt: "Siga a linha ativa enquanto as linhas proximas continuam visiveis para manter o contexto do paragrafo sem varrer a pagina inteira.",
        })}
      </p>
    </div>
  );
}

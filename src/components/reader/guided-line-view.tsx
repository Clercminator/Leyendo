"use client";

import { useLocale } from "@/components/layout/locale-provider";
import { buildTokenRuns } from "@/components/reader/build-token-runs";
import { deriveParagraphTokenRange } from "@/features/reader/engine/navigation";
import { getLocalizedCopy } from "@/lib/locale";
import type { Chunk, DocumentModel, Token } from "@/types/document";

interface GuidedLineViewProps {
  document: DocumentModel;
  chunk: Chunk;
}

function groupTokens(tokens: Token[], size: number) {
  const lines: Token[][] = [];

  for (let index = 0; index < tokens.length; index += size) {
    lines.push(tokens.slice(index, index + size));
  }

  return lines;
}

export function GuidedLineView({ document, chunk }: GuidedLineViewProps) {
  const { locale } = useLocale();
  const paragraphTokens = deriveParagraphTokenRange(
    document,
    chunk.paragraphIndex,
  );
  const activeIndexes = new Set(chunk.tokenIndexes);
  const lines = groupTokens(paragraphTokens, 8);
  const activeLineIndex = lines.findIndex((line) =>
    line.some((token) => activeIndexes.has(token.index)),
  );

  return (
    <div className="reader-panel flex h-full flex-1 flex-col rounded-[1.75rem] border border-white/10 px-6 py-8 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-10 sm:py-10">
      <p className="reader-accent text-sm tracking-[0.28em] uppercase">
        {getLocalizedCopy(locale, {
          en: "Guided Line",
          es: "Linea guiada",
          pt: "Linha guiada",
        })}
      </p>
      <div className="mt-6 flex-1 space-y-4">
        {lines.map((line, lineIndex) => {
          const isActiveLine = lineIndex === activeLineIndex;
          const runs = buildTokenRuns(line, activeIndexes);

          return (
            <div
              key={lineIndex}
              className={`rounded-2xl px-4 py-3 transition ${
                isActiveLine
                  ? "border border-white/10 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                  : "bg-white/[0.03] opacity-45"
              }`}
            >
              <p className="reader-guided-body reader-muted text-lg sm:text-xl">
                {runs.map((run, index) => (
                  <span
                    key={run.key}
                    className={run.active ? "font-medium" : undefined}
                    data-active={run.active ? "true" : undefined}
                  >
                    {run.text}
                    {index < runs.length - 1 ? " " : null}
                  </span>
                ))}
              </p>
            </div>
          );
        })}
      </div>
      <p className="reader-muted mt-6 text-sm leading-7">
        {getLocalizedCopy(locale, {
          en: "Follow the highlighted line window to reduce page scatter while keeping paragraph context.",
          es: "Sigue la linea resaltada para reducir la dispersion visual sin perder el contexto del parrafo.",
          pt: "Siga a linha destacada para reduzir a dispersao visual sem perder o contexto do paragrafo.",
        })}
      </p>
    </div>
  );
}

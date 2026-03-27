"use client";

import { memo } from "react";

import { Trash2 } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import type { Bookmark, Highlight } from "@/types/reader";

interface ReaderSidebarProps {
  bookmarks: Bookmark[];
  highlightNote: string;
  highlights: Highlight[];
  onChangeHighlightNote: (value: string) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onJumpToBookmark: (bookmark: Bookmark) => void;
  onJumpToHighlight: (highlight: Highlight) => void;
}

export const ReaderSidebar = memo(function ReaderSidebar({
  bookmarks,
  highlightNote,
  highlights,
  onChangeHighlightNote,
  onDeleteBookmark,
  onDeleteHighlight,
  onJumpToBookmark,
  onJumpToHighlight,
}: ReaderSidebarProps) {
  const { locale } = useLocale();
  const formatBookmarkLocation = (bookmark: Bookmark) =>
    getLocalizedCopy(locale, {
      en: `Saved at paragraph ${bookmark.paragraphIndex + 1}`,
      es: `Guardado en el parrafo ${bookmark.paragraphIndex + 1}`,
      pt: `Salvo no paragrafo ${bookmark.paragraphIndex + 1}`,
    });

  return (
    <aside aria-label="Reader details" className="relative z-0">
      <section className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
        <p className="text-sm tracking-[0.28em] text-(--accent-amber) uppercase">
          {getLocalizedCopy(locale, {
            en: "Highlights and bookmarks",
            es: "Destacados y marcadores",
            pt: "Destaques e marcadores",
          })}
        </p>
        <label
          className="mt-4 block text-sm text-(--text-strong)"
          htmlFor="highlight-note"
        >
          {getLocalizedCopy(locale, {
            en: "Note for current passage",
            es: "Nota para el pasaje actual",
            pt: "Nota para o trecho atual",
          })}
        </label>
        <textarea
          id="highlight-note"
          value={highlightNote}
          onChange={(event) => {
            onChangeHighlightNote(event.target.value);
          }}
          placeholder={getLocalizedCopy(locale, {
            en: "Add context, a takeaway, or a reminder before saving this highlight.",
            es: "Agrega contexto, una idea clave o un recordatorio antes de guardar este destacado.",
            pt: "Adicione contexto, um ponto-chave ou um lembrete antes de salvar este destaque.",
          })}
          className="mt-3 min-h-28 w-full rounded-2xl border border-(--border-soft) bg-(--surface-input) px-4 py-3 text-sm text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
        />
        <p className="mt-3 text-sm leading-7 text-(--text-muted)">
          {getLocalizedCopy(locale, {
            en: "Highlights keep the active chunk anchored, so reopening still lands on the right passage even if chunk size changes later.",
            es: "Los destacados mantienen el bloque activo anclado, asi que al reabrir sigues llegando al pasaje correcto aunque cambie el tamano del bloque.",
            pt: "Os destaques mantem o bloco ativo ancorado, entao ao reabrir voce volta ao trecho certo mesmo se o tamanho do bloco mudar depois.",
          })}
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
              {getLocalizedCopy(locale, {
                en: "Recent highlights",
                es: "Destacados recientes",
                pt: "Destaques recentes",
              })}
            </p>
            {highlights.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                {getLocalizedCopy(locale, {
                  en: "Save a highlight to keep the current quoted passage and note on this device.",
                  es: "Guarda un destacado para conservar el pasaje actual y su nota en este dispositivo.",
                  pt: "Salve um destaque para manter o trecho atual e a nota neste dispositivo.",
                })}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="rounded-2xl border border-(--border-soft) bg-(--surface-soft) px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-(--text-strong)">
                          {highlight.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-(--text-strong)">
                          {highlight.quote}
                        </p>
                        {highlight.note ? (
                          <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                            {highlight.note}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label={`${getLocalizedCopy(locale, { en: "Delete", es: "Eliminar", pt: "Excluir" })} ${highlight.label}`}
                        onClick={() => {
                          onDeleteHighlight(highlight.id);
                        }}
                        className="rounded-full border border-(--border-soft) bg-(--surface-soft) p-2 text-(--text-muted) transition hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onJumpToHighlight(highlight)}
                      className="mt-3 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    >
                      {getLocalizedCopy(locale, {
                        en: "Jump to highlight",
                        es: "Ir al destacado",
                        pt: "Ir ao destaque",
                      })}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
              {getLocalizedCopy(locale, {
                en: "Recent bookmarks",
                es: "Marcadores recientes",
                pt: "Marcadores recentes",
              })}
            </p>
            {bookmarks.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                {getLocalizedCopy(locale, {
                  en: "Save a bookmark to return to this exact reading position later.",
                  es: "Guarda un marcador para volver a esta posicion exacta mas tarde.",
                  pt: "Salve um marcador para voltar a esta posicao exata depois.",
                })}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="rounded-2xl border border-(--border-soft) bg-(--surface-soft) px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-(--text-strong)">
                          {bookmark.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-(--text-muted)">
                          {formatBookmarkLocation(bookmark)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`${getLocalizedCopy(locale, { en: "Delete", es: "Eliminar", pt: "Excluir" })} ${bookmark.label}`}
                        onClick={() => {
                          onDeleteBookmark(bookmark.id);
                        }}
                        className="rounded-full border border-(--border-soft) bg-(--surface-soft) p-2 text-(--text-muted) transition hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onJumpToBookmark(bookmark)}
                      className="mt-3 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    >
                      {getLocalizedCopy(locale, {
                        en: "Jump to bookmark",
                        es: "Ir al marcador",
                        pt: "Ir ao marcador",
                      })}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </aside>
  );
});

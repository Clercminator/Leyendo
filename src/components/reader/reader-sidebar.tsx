"use client";

import { memo, useId, useState } from "react";

import { BookmarkPlus, ChevronDown, Highlighter, Trash2 } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import type { PdfOutlineItem } from "@/features/reader/pdf/navigation";
import { getLocalizedCopy } from "@/lib/locale";
import type { Bookmark, Highlight } from "@/types/reader";

interface ReaderSidebarNotice {
  title: string;
  description: string;
  tone?: "info" | "warning";
}

interface ReaderSidebarProps {
  bookmarks: Bookmark[];
  currentPdfPageLabel?: string;
  defaultHighlightsSectionExpanded?: boolean;
  highlightHelperText?: string;
  highlightNote: string;
  highlightNoteLabel?: string;
  highlightNotePlaceholder?: string;
  highlights: Highlight[];
  outlineItems?: PdfOutlineItem[];
  notice?: ReaderSidebarNotice;
  onChangeHighlightNote: (value: string) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onJumpToBookmark: (bookmark: Bookmark) => void;
  onJumpToHighlight: (highlight: Highlight) => void;
  onJumpToOutlineItem?: (outlineItem: PdfOutlineItem) => void;
  onSaveBookmark?: () => void;
  onSaveHighlight?: () => void;
  saveHighlightLabel?: string;
  saveHighlightDisabled?: boolean;
  showHighlightComposer?: boolean;
}

export const ReaderSidebar = memo(function ReaderSidebar({
  bookmarks,
  currentPdfPageLabel,
  defaultHighlightsSectionExpanded = false,
  highlightHelperText,
  highlightNote,
  highlightNoteLabel,
  highlightNotePlaceholder,
  highlights,
  outlineItems,
  notice,
  onChangeHighlightNote,
  onDeleteBookmark,
  onDeleteHighlight,
  onJumpToBookmark,
  onJumpToHighlight,
  onJumpToOutlineItem,
  onSaveBookmark,
  onSaveHighlight,
  saveHighlightLabel,
  saveHighlightDisabled = false,
  showHighlightComposer = true,
}: ReaderSidebarProps) {
  const { locale } = useLocale();
  const highlightsSectionContentId = useId();
  const hasSavedReaderAnchors =
    highlightNote.trim().length > 0 ||
    highlights.length > 0 ||
    bookmarks.length > 0 ||
    Boolean(notice);
  const highlightsSectionStateKey = hasSavedReaderAnchors
    ? "with-saved-anchors"
    : "without-saved-anchors";
  const [highlightsSectionState, setHighlightsSectionState] = useState({
    expanded: defaultHighlightsSectionExpanded || hasSavedReaderAnchors,
    key: highlightsSectionStateKey,
  });
  const isHighlightsSectionExpanded =
    highlightsSectionState.key === highlightsSectionStateKey
      ? highlightsSectionState.expanded
      : defaultHighlightsSectionExpanded || hasSavedReaderAnchors;

  const formatBookmarkLocation = (bookmark: Bookmark) => {
    if (typeof bookmark.sourcePageIndex === "number") {
      return getLocalizedCopy(locale, {
        en: `Saved on page ${bookmark.sourcePageIndex + 1}`,
        es: `Guardado en la página ${bookmark.sourcePageIndex + 1}`,
        pt: `Salvo na pagina ${bookmark.sourcePageIndex + 1}`,
      });
    }

    return getLocalizedCopy(locale, {
      en: `Saved at paragraph ${bookmark.paragraphIndex + 1}`,
      es: `Guardado en el párrafo ${bookmark.paragraphIndex + 1}`,
      pt: `Salvo no paragrafo ${bookmark.paragraphIndex + 1}`,
    });
  };

  const renderOutlineItems = (items: PdfOutlineItem[], depth = 0) => {
    return items.map((outlineItem) => (
      <div
        key={outlineItem.id}
        className={depth > 0 ? "ml-3 border-l border-(--border-soft) pl-3" : ""}
      >
        <button
          type="button"
          disabled={
            typeof outlineItem.pageIndex !== "number" || !onJumpToOutlineItem
          }
          onClick={() => {
            if (typeof outlineItem.pageIndex === "number") {
              onJumpToOutlineItem?.(outlineItem);
            }
          }}
          className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
            typeof outlineItem.pageIndex === "number"
              ? "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
              : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted)"
          }`}
        >
          <p className="font-medium">{outlineItem.title}</p>
          {typeof outlineItem.pageIndex === "number" ? (
            <p className="mt-1 text-xs tracking-[0.18em] text-(--text-muted) uppercase">
              {getLocalizedCopy(locale, {
                en: `Page ${outlineItem.pageIndex + 1}`,
                es: `Página ${outlineItem.pageIndex + 1}`,
                pt: `Pagina ${outlineItem.pageIndex + 1}`,
              })}
            </p>
          ) : null}
        </button>
        {outlineItem.items.length > 0 ? (
          <div className="mt-2 space-y-2">
            {renderOutlineItems(outlineItem.items, depth + 1)}
          </div>
        ) : null}
      </div>
    ));
  };

  const resolvedHighlightNoteLabel =
    highlightNoteLabel ??
    getLocalizedCopy(locale, {
      en: "Note for current passage",
      es: "Nota para el pasaje actual",
      pt: "Nota para o trecho atual",
    });
  const resolvedHighlightNotePlaceholder =
    highlightNotePlaceholder ??
    getLocalizedCopy(locale, {
      en: "Add context, a takeaway, or a reminder before saving this highlight.",
      es: "Agrega contexto, una idea clave o un recordatorio antes de guardar este destacado.",
      pt: "Adicione contexto, um ponto-chave ou um lembrete antes de salvar este destaque.",
    });
  const resolvedHighlightHelperText =
    highlightHelperText ??
    getLocalizedCopy(locale, {
      en: "Highlights keep the active chunk anchored, so reopening still lands on the right passage even if chunk size changes later.",
      es: "Los destacados mantienen anclado el bloque activo, así que al reabrir vuelves al pasaje correcto aunque cambie el tamaño del bloque.",
      pt: "Os destaques mantem o bloco ativo ancorado, entao ao reabrir voce volta ao trecho certo mesmo se o tamanho do bloco mudar depois.",
    });
  const resolvedSaveHighlightLabel =
    saveHighlightLabel ??
    getLocalizedCopy(locale, {
      en: "Save highlight",
      es: "Guardar destacado",
      pt: "Salvar destaque",
    });
  const highlightsAndBookmarksLabel = getLocalizedCopy(locale, {
    en: "Highlights and bookmarks",
    es: "Destacados y marcadores",
    pt: "Destaques e marcadores",
  });
  const expandSectionLabel = getLocalizedCopy(locale, {
    en: "Expand",
    es: "Expandir",
    pt: "Expandir",
  });
  const collapseSectionLabel = getLocalizedCopy(locale, {
    en: "Collapse",
    es: "Colapsar",
    pt: "Recolher",
  });
  const hasPdfNavigationSections = (outlineItems?.length ?? 0) > 0;

  return (
    <aside aria-label="Reader details" className="relative z-0">
      <section className="rounded-[1.5rem] border border-(--border-soft) bg-(--surface-card) p-4 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-6">
        <button
          type="button"
          aria-controls={highlightsSectionContentId}
          aria-expanded={isHighlightsSectionExpanded}
          aria-label={`${isHighlightsSectionExpanded ? collapseSectionLabel : expandSectionLabel} ${highlightsAndBookmarksLabel}`}
          onClick={() => {
            setHighlightsSectionState({
              expanded: !isHighlightsSectionExpanded,
              key: highlightsSectionStateKey,
            });
          }}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <p className="text-xs tracking-[0.24em] text-(--accent-amber) uppercase sm:text-sm sm:tracking-[0.28em]">
            {highlightsAndBookmarksLabel}
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1 text-[0.68rem] font-medium tracking-[0.18em] text-(--text-muted) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)">
            {isHighlightsSectionExpanded
              ? collapseSectionLabel
              : expandSectionLabel}
            <ChevronDown
              className={`h-4 w-4 transition ${isHighlightsSectionExpanded ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {isHighlightsSectionExpanded ? (
          <div id={highlightsSectionContentId}>
            {showHighlightComposer ? (
              <>
                <label
                  className="mt-4 block text-sm text-(--text-strong)"
                  htmlFor="highlight-note"
                >
                  {resolvedHighlightNoteLabel}
                </label>
                <textarea
                  id="highlight-note"
                  value={highlightNote}
                  onChange={(event) => {
                    onChangeHighlightNote(event.target.value);
                  }}
                  placeholder={resolvedHighlightNotePlaceholder}
                  className="mt-3 min-h-24 w-full rounded-2xl border border-(--border-soft) bg-(--surface-input) px-4 py-3 text-sm text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none sm:min-h-28"
                />
                <p className="mt-3 text-sm leading-6 text-(--text-muted) sm:leading-7">
                  {resolvedHighlightHelperText}
                </p>
              </>
            ) : null}

            {onSaveBookmark || onSaveHighlight ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {onSaveBookmark ? (
                  <button
                    type="button"
                    onClick={onSaveBookmark}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    {getLocalizedCopy(locale, {
                      en: "Save bookmark",
                      es: "Guardar marcador",
                      pt: "Salvar marcador",
                    })}
                  </button>
                ) : null}
                {onSaveHighlight ? (
                  <button
                    type="button"
                    disabled={saveHighlightDisabled}
                    onClick={onSaveHighlight}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Highlighter className="h-4 w-4" />
                    {resolvedSaveHighlightLabel}
                  </button>
                ) : null}
              </div>
            ) : null}

            {notice ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-4 sm:mt-5 ${
                  notice.tone === "warning"
                    ? "border-amber-300/70 bg-amber-50 text-amber-950"
                    : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong)"
                }`}
              >
                <p className="text-sm font-semibold">{notice.title}</p>
                <p className="mt-2 text-sm leading-7 opacity-80">
                  {notice.description}
                </p>
              </div>
            ) : null}

            <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
              <div>
                <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                  {getLocalizedCopy(locale, {
                    en: "Recent highlights",
                    es: "Destacados recientes",
                    pt: "Destaques recentes",
                  })}
                </p>
                {highlights.length === 0 ? (
                  <p className="mt-3 text-sm leading-6 text-(--text-muted) sm:leading-7">
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
                        className="pointer-events-none rounded-2xl border border-(--border-soft) bg-(--surface-soft) px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
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
                            className="pointer-events-auto rounded-full border border-(--border-soft) bg-(--surface-soft) p-2 text-(--text-muted) transition hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onJumpToHighlight(highlight)}
                          className="pointer-events-auto relative z-10 mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
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
                  <p className="mt-3 text-sm leading-6 text-(--text-muted) sm:leading-7">
                    {getLocalizedCopy(locale, {
                      en: "Save a bookmark to return to this exact reading position later.",
                      es: "Guarda un marcador para volver a esta posición exacta más tarde.",
                      pt: "Salve um marcador para voltar a esta posicao exata depois.",
                    })}
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="pointer-events-none rounded-2xl border border-(--border-soft) bg-(--surface-soft) px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
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
                            className="pointer-events-auto rounded-full border border-(--border-soft) bg-(--surface-soft) p-2 text-(--text-muted) transition hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onJumpToBookmark(bookmark)}
                          className="pointer-events-auto relative z-10 mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
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
          </div>
        ) : null}

        {hasPdfNavigationSections ? (
          <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
            {outlineItems && outlineItems.length > 0 ? (
              <div>
                <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                  {getLocalizedCopy(locale, {
                    en: "Document bookmarks",
                    es: "Marcadores del documento",
                    pt: "Marcadores do documento",
                  })}
                </p>
                {currentPdfPageLabel ? (
                  <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                    {getLocalizedCopy(locale, {
                      en: `Current page ${currentPdfPageLabel}`,
                      es: `Página actual ${currentPdfPageLabel}`,
                      pt: `Pagina atual ${currentPdfPageLabel}`,
                    })}
                  </p>
                ) : null}
                <div className="mt-3 space-y-2">
                  {renderOutlineItems(outlineItems)}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </aside>
  );
});
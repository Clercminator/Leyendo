import { getLocalizedCopy, type AppLocale } from "@/lib/locale";

interface PdfReaderWorkspaceCopyArgs {
  bookmarksCount: number;
  currentPageLabel: string;
  findMatches: {
    current: number;
    total: number;
  };
  hasExtractedText: boolean;
  highlightsCount: number;
  locale: AppLocale;
  searchQuery: string;
  searchStatus: "idle" | "not-found" | "pending" | "ready";
  selectedPdfText?: string;
}

export function getPdfReaderWorkspaceCopy({
  bookmarksCount,
  currentPageLabel,
  findMatches,
  hasExtractedText,
  highlightsCount,
  locale,
  searchQuery,
  searchStatus,
  selectedPdfText,
}: PdfReaderWorkspaceCopyArgs) {
  const selectedPdfTextPreview = selectedPdfText
    ? `${selectedPdfText.slice(0, 96)}${selectedPdfText.length > 96 ? "..." : ""}`
    : undefined;

  const searchStatusLabel = !searchQuery.trim()
    ? getLocalizedCopy(locale, {
        en: "Search the document",
        es: "Buscar en el documento",
        pt: "Buscar no documento",
      })
    : searchStatus === "not-found"
      ? getLocalizedCopy(locale, {
          en: "No matches",
          es: "Sin resultados",
          pt: "Sem resultados",
        })
      : findMatches.total > 0
        ? getLocalizedCopy(locale, {
            en: `${findMatches.current} of ${findMatches.total}`,
            es: `${findMatches.current} de ${findMatches.total}`,
            pt: `${findMatches.current} de ${findMatches.total}`,
          })
        : getLocalizedCopy(locale, {
            en: "Searching...",
            es: "Buscando...",
            pt: "Buscando...",
          });

  return {
    highlightHelperText: hasExtractedText
      ? selectedPdfTextPreview
        ? getLocalizedCopy(locale, {
            en: `Selected PDF text ready: "${selectedPdfTextPreview}". Saving a highlight will anchor this exact quote on page ${currentPageLabel}.`,
            es: `Texto PDF seleccionado listo: "${selectedPdfTextPreview}". Guardar el destacado anclará esta cita exacta en la página ${currentPageLabel}.`,
            pt: `Texto PDF selecionado pronto: "${selectedPdfTextPreview}". Salvar o destaque vai ancorar esta citacao exata na pagina ${currentPageLabel}.`,
          })
        : getLocalizedCopy(locale, {
            en: `No PDF text is selected. Saving a highlight will anchor the closest extracted passage on page ${currentPageLabel}.`,
            es: `No hay texto PDF seleccionado. Guardar el destacado anclará el pasaje extraído más cercano en la página ${currentPageLabel}.`,
            pt: `Nenhum texto do PDF esta selecionado. Salvar o destaque vai ancorar o trecho extraido mais proximo na pagina ${currentPageLabel}.`,
          })
      : undefined,
    highlightNoteLabel: getLocalizedCopy(locale, {
      en: "Note for selected text or current page",
      es: "Nota para el texto seleccionado o la página actual",
      pt: "Nota para o texto selecionado ou a pagina atual",
    }),
    highlightNotePlaceholder: getLocalizedCopy(locale, {
      en: "Add context before saving this PDF highlight.",
      es: "Agrega contexto antes de guardar este destacado del PDF.",
      pt: "Adicione contexto antes de salvar este destaque do PDF.",
    }),
    mobileSidebarClosedLabel: getLocalizedCopy(locale, {
      en: "Show tools",
      es: "Mostrar panel",
      pt: "Mostrar painel",
    }),
    mobileSidebarOpenLabel: getLocalizedCopy(locale, {
      en: "Hide tools",
      es: "Ocultar panel",
      pt: "Ocultar painel",
    }),
    mobileSidebarSummary: getLocalizedCopy(locale, {
      en: `Page ${currentPageLabel} · ${highlightsCount} highlights · ${bookmarksCount} bookmarks`,
      es: `Página ${currentPageLabel} · ${highlightsCount} destacados · ${bookmarksCount} marcadores`,
      pt: `Pagina ${currentPageLabel} · ${highlightsCount} destaques · ${bookmarksCount} marcadores`,
    }),
    mobileSidebarToggleLabel: getLocalizedCopy(locale, {
      en: "Pages, outline, and notes",
      es: "Páginas, índice y notas",
      pt: "Paginas, sumario e notas",
    }),
    saveHighlightLabel: selectedPdfText
      ? getLocalizedCopy(locale, {
          en: "Save selected highlight",
          es: "Guardar destacado seleccionado",
          pt: "Salvar destaque selecionado",
        })
      : getLocalizedCopy(locale, {
          en: "Save page highlight",
          es: "Guardar destacado de página",
          pt: "Salvar destaque da pagina",
        }),
    searchStatusLabel,
    viewerNotice: !hasExtractedText
      ? {
          description: getLocalizedCopy(locale, {
            en: "Leyendo can display this PDF visually and still save page bookmarks, but highlights and speed-reading modes need extracted text. Run OCR or export a text-based PDF to unlock them.",
            es: "Leyendo puede mostrar este PDF visualmente y aún guardar marcadores por página, pero los destacados y modos de lectura rápida necesitan texto extraído. Ejecuta OCR o exporta un PDF con texto para activarlos.",
            pt: "O Leyendo consegue mostrar este PDF visualmente e ainda salvar marcadores por pagina, mas destaques e modos de leitura rapida precisam de texto extraido. Rode OCR ou exporte um PDF com texto para habilitar tudo.",
          }),
          title: getLocalizedCopy(locale, {
            en: "This PDF needs OCR for text-driven reader features",
            es: "Este PDF necesita OCR para las funciones basadas en texto",
            pt: "Este PDF precisa de OCR para os recursos baseados em texto",
          }),
          tone: "warning" as const,
        }
      : undefined,
  };
}
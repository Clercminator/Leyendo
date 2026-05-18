import { getLocalizedCopy, type AppLocale } from "@/lib/locale";
import {
  defaultPdfViewerState,
  type PdfViewerState,
  type ReaderMode,
} from "@/types/reader";

export interface PdfRenderTask {
  cancel: () => void;
  promise: Promise<void>;
}

export interface PdfViewport {
  height: number;
  width: number;
}

export interface PdfPageHandle {
  cleanup?: () => void;
  getViewport: (options: { rotation?: number; scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    transform: [number, number, number, number, number, number] | null;
    viewport: PdfViewport;
  }) => PdfRenderTask;
}

export interface PdfOutlineNodeHandle {
  dest: string | unknown[] | null;
  items: PdfOutlineNodeHandle[];
  title: string;
}

export interface PdfDocumentHandle {
  destroy?: () => Promise<void> | void;
  getDestination: (id: string) => Promise<unknown[] | null>;
  getOutline: () => Promise<PdfOutlineNodeHandle[] | null>;
  getPage: (pageNumber: number) => Promise<PdfPageHandle>;
  getPageIndex: (ref: { gen: number; num: number }) => Promise<number>;
  getPageLabels: () => Promise<string[] | null>;
  numPages: number;
}

export interface PdfMatchCount {
  current: number;
  total: number;
}

export interface PdfSelectionSnapshot {
  prefixText?: string;
  selectedText: string;
  suffixText?: string;
}

export interface PdfPageChangingEvent {
  pageNumber?: number;
}

export interface PdfScaleChangingEvent {
  presetValue?: string;
  scale?: number;
}

export interface PdfRotationChangingEvent {
  pagesRotation?: number;
}

export interface PdfScrollModeChangedEvent {
  mode?: number;
}

export interface PdfFindMatchesCountEvent {
  matchesCount?: PdfMatchCount;
}

export interface PdfFindControlStateEvent {
  matchesCount?: PdfMatchCount;
  state?: number;
}

export interface PdfViewerEventBus {
  dispatch: (eventName: string, data: Record<string, unknown>) => void;
  off: <T>(eventName: string, listener: (event: T) => void) => void;
  on: <T>(eventName: string, listener: (event: T) => void) => void;
}

export interface PdfViewerHandle {
  cleanup: () => void;
  currentPageNumber: number;
  currentScaleValue: string;
  pagesRotation: number;
  scrollMode: number;
  setDocument: (pdfDocument: PdfDocumentHandle) => void;
  setPageLabels: (labels: string[] | null) => void;
  updateScale: (options?: { steps?: number }) => void;
}

export interface PdfLinkServiceHandle {
  setDocument: (pdfDocument: PdfDocumentHandle) => void;
  setViewer: (viewer: PdfViewerHandle) => void;
}

export interface PdfFindControllerHandle {
  setDocument: (pdfDocument: PdfDocumentHandle) => void;
}

export interface PdfViewerModule {
  EventBus: new () => PdfViewerEventBus;
  FindState: {
    NOT_FOUND: number;
    PENDING: number;
  };
  PDFFindController: new (options: {
    eventBus: PdfViewerEventBus;
    linkService: PdfLinkServiceHandle;
  }) => PdfFindControllerHandle;
  PDFLinkService: new (options: {
    eventBus: PdfViewerEventBus;
  }) => PdfLinkServiceHandle;
  PDFViewer: new (options: {
    annotationMode: number;
    container: HTMLDivElement;
    eventBus: PdfViewerEventBus;
    findController: PdfFindControllerHandle;
    linkService: PdfLinkServiceHandle;
    minDurationToUpdateCanvas: number;
    removePageBorders: boolean;
    textLayerMode: number;
    viewer: HTMLDivElement;
  }) => PdfViewerHandle;
  ScrollMode: {
    PAGE: number;
    VERTICAL: number;
  };
}

export interface PdfViewerRuntime {
  eventBus: PdfViewerEventBus;
  pdfViewer: PdfViewerHandle;
  scrollMode: {
    PAGE: number;
    VERTICAL: number;
  };
}

export function sanitizePdfViewerState(
  state: PdfViewerState,
  pageCount: number,
): PdfViewerState {
  const boundedPageIndex = Math.max(
    0,
    Math.min(state.pageIndex, pageCount - 1),
  );
  const normalizedRotation = (((state.rotation % 360) + 360) % 360) as
    | 0
    | 90
    | 180
    | 270;

  return {
    pageIndex: Number.isFinite(boundedPageIndex) ? boundedPageIndex : 0,
    rotation: [0, 90, 180, 270].includes(normalizedRotation)
      ? normalizedRotation
      : 0,
    scrollMode:
      state.scrollMode === "single-page" ? "single-page" : "continuous",
    searchQuery: state.searchQuery,
    zoomValue: state.zoomValue || defaultPdfViewerState.zoomValue,
  };
}

const PDF_SELECTION_CONTEXT_TOKEN_LIMIT = 10;

function normalizePdfSelectionSegment(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function trimPdfSelectionContext(value: string, side: "start" | "end") {
  const tokens = normalizePdfSelectionSegment(value).split(/\s+/u).filter(Boolean);

  if (tokens.length === 0) {
    return undefined;
  }

  return side === "end"
    ? tokens.slice(-PDF_SELECTION_CONTEXT_TOKEN_LIMIT).join(" ")
    : tokens.slice(0, PDF_SELECTION_CONTEXT_TOKEN_LIMIT).join(" ");
}

export function getPdfSelectionSnapshot(
  container: HTMLDivElement | null,
): PdfSelectionSnapshot | undefined {
  const selection = globalThis.getSelection?.();
  const selectedText = normalizePdfSelectionSegment(selection?.toString() ?? "");

  if (!selection || !selectedText || !container) {
    return undefined;
  }

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  if (
    (anchorNode && !container.contains(anchorNode)) ||
    (focusNode && !container.contains(focusNode))
  ) {
    return undefined;
  }

  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  if (!range) {
    return { selectedText };
  }

  try {
    const prefixRange = range.cloneRange();
    prefixRange.selectNodeContents(container);
    prefixRange.setEnd(range.startContainer, range.startOffset);

    const suffixRange = range.cloneRange();
    suffixRange.selectNodeContents(container);
    suffixRange.setStart(range.endContainer, range.endOffset);

    return {
      prefixText: trimPdfSelectionContext(prefixRange.toString(), "end"),
      selectedText,
      suffixText: trimPdfSelectionContext(suffixRange.toString(), "start"),
    };
  } catch {
    return { selectedText };
  }
}

export function getPdfSelectionText(container: HTMLDivElement | null) {
  return getPdfSelectionSnapshot(container)?.selectedText;
}

export function formatZoomLabel(args: {
  locale: AppLocale;
  zoomPercent: number;
  zoomValue: string;
}) {
  const { locale, zoomPercent, zoomValue } = args;

  if (zoomValue === "page-width") {
    return getLocalizedCopy(locale, {
      en: "Fit width",
      es: "Ajustar ancho",
      pt: "Ajustar largura",
    });
  }

  if (zoomValue === "page-fit") {
    return getLocalizedCopy(locale, {
      en: "Fit page",
      es: "Ajustar pagina",
      pt: "Ajustar pagina",
    });
  }

  if (zoomValue === "page-actual") {
    return getLocalizedCopy(locale, {
      en: "Actual size",
      es: "Tamano real",
      pt: "Tamanho real",
    });
  }

  return `${zoomPercent}%`;
}

export function dispatchFind(
  runtime: PdfViewerRuntime,
  query: string,
  previous = false,
) {
  runtime.eventBus.dispatch("find", {
    caseSensitive: false,
    entireWord: false,
    findPrevious: previous,
    highlightAll: true,
    phraseSearch: true,
    query,
    source: "leyendo",
    type: previous ? "again" : "",
  });
}

export const pdfReaderModeLabels: Record<
  ReaderMode,
  Record<"en" | "es" | "pt", string>
> = {
  "pdf-page": {
    en: "In-app PDF beta",
    es: "PDF beta en la app",
    pt: "PDF beta no app",
  },
  "focus-word": {
    en: "Focus Word",
    es: "Foco por palabra",
    pt: "Palavra foco",
  },
  "phrase-chunk": {
    en: "Phrase Chunk",
    es: "Bloques de frases",
    pt: "Blocos de frases",
  },
  "guided-line": {
    en: "Guided Line",
    es: "Línea guiada",
    pt: "Linha guiada",
  },
  "classic-reader": {
    en: "Classic Reader",
    es: "Lector clásico",
    pt: "Leitor classico",
  },
};
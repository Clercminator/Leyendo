"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  LoaderCircle,
  RotateCw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import {
  ReaderSidebar,
  type PdfThumbnailItem,
} from "@/components/reader/reader-sidebar";
import {
  getDocumentAsset,
  getStoredPdfViewerState,
  savePdfViewerState,
} from "@/db/repositories";
import {
  buildResolvedPdfOutline,
  getPdfPageLabel,
  type PdfOutlineItem,
} from "@/features/reader/pdf/navigation";
import { getLocalizedCopy } from "@/lib/locale";
import { getPdfAssetUrl, loadPdfJs, loadPdfJsViewer } from "@/lib/pdf/pdfjs";
import type { DocumentRecord } from "@/types/document";
import {
  defaultPdfViewerState,
  type Bookmark,
  type Highlight,
  type PdfViewerState,
  type ReaderMode,
} from "@/types/reader";

interface PdfRenderTask {
  cancel: () => void;
  promise: Promise<void>;
}

interface PdfViewport {
  height: number;
  width: number;
}

interface PdfPageHandle {
  cleanup?: () => void;
  getViewport: (options: { rotation?: number; scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    transform: [number, number, number, number, number, number] | null;
    viewport: PdfViewport;
  }) => PdfRenderTask;
}

interface PdfOutlineNodeHandle {
  dest: string | unknown[] | null;
  items: PdfOutlineNodeHandle[];
  title: string;
}

interface PdfDocumentHandle {
  destroy?: () => Promise<void> | void;
  getDestination: (id: string) => Promise<unknown[] | null>;
  getOutline: () => Promise<PdfOutlineNodeHandle[] | null>;
  getPage: (pageNumber: number) => Promise<PdfPageHandle>;
  getPageIndex: (ref: { gen: number; num: number }) => Promise<number>;
  getPageLabels: () => Promise<string[] | null>;
  numPages: number;
}

interface PdfMatchCount {
  current: number;
  total: number;
}

interface PdfPageChangingEvent {
  pageNumber?: number;
}

interface PdfScaleChangingEvent {
  presetValue?: string;
  scale?: number;
}

interface PdfRotationChangingEvent {
  pagesRotation?: number;
}

interface PdfScrollModeChangedEvent {
  mode?: number;
}

interface PdfFindMatchesCountEvent {
  matchesCount?: PdfMatchCount;
}

interface PdfFindControlStateEvent {
  matchesCount?: PdfMatchCount;
  state?: number;
}

interface PdfLinkServiceHandle {
  setDocument: (pdfDocument: PdfDocumentHandle) => void;
  setViewer: (viewer: PdfViewerRuntime["pdfViewer"]) => void;
}

interface PdfFindControllerHandle {
  setDocument: (pdfDocument: PdfDocumentHandle) => void;
}

interface PdfViewerModule {
  EventBus: new () => PdfViewerRuntime["eventBus"];
  FindState: {
    NOT_FOUND: number;
    PENDING: number;
  };
  PDFFindController: new (options: {
    eventBus: PdfViewerRuntime["eventBus"];
    linkService: PdfLinkServiceHandle;
  }) => PdfFindControllerHandle;
  PDFLinkService: new (options: {
    eventBus: PdfViewerRuntime["eventBus"];
  }) => PdfLinkServiceHandle;
  PDFViewer: new (options: {
    annotationMode: number;
    container: HTMLDivElement;
    eventBus: PdfViewerRuntime["eventBus"];
    findController: PdfFindControllerHandle;
    linkService: PdfLinkServiceHandle;
    minDurationToUpdateCanvas: number;
    removePageBorders: boolean;
    textLayerMode: number;
    viewer: HTMLDivElement;
  }) => PdfViewerRuntime["pdfViewer"];
  ScrollMode: {
    PAGE: number;
    VERTICAL: number;
  };
}

interface PdfViewerRuntime {
  eventBus: {
    dispatch: (eventName: string, data: Record<string, unknown>) => void;
    off: <T>(eventName: string, listener: (event: T) => void) => void;
    on: <T>(eventName: string, listener: (event: T) => void) => void;
  };
  pdfViewer: {
    cleanup: () => void;
    currentPageNumber: number;
    currentScaleValue: string;
    pagesRotation: number;
    scrollMode: number;
    setDocument: (pdfDocument: PdfDocumentHandle) => void;
    setPageLabels: (labels: string[] | null) => void;
    updateScale: (options?: { steps?: number }) => void;
  };
  scrollMode: {
    PAGE: number;
    VERTICAL: number;
  };
}

interface PdfReaderWorkspaceProps {
  availableModes: ReaderMode[];
  bookmarks: Bookmark[];
  document: DocumentRecord;
  hasExtractedText: boolean;
  highlightNote: string;
  highlights: Highlight[];
  jumpRequest?: {
    nonce: number;
    pageIndex: number;
  };
  onChangeHighlightNote: (value: string) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onJumpToBookmark: (bookmark: Bookmark) => void;
  onJumpToHighlight: (highlight: Highlight) => void;
  onPageChange: (pageIndex: number) => void;
  onSaveBookmark: (args: { pageIndex: number }) => void;
  onSaveHighlight: (args: {
    pageIndex: number;
    selectionText?: string;
  }) => void;
  onSelectMode: (mode: ReaderMode) => void;
}

function sanitizePdfViewerState(
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

function getPdfSelectionText(container: HTMLDivElement | null) {
  const selection = globalThis.getSelection?.();
  const selectedText = selection?.toString().replace(/\s+/g, " ").trim();

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

  return selectedText;
}

function formatZoomLabel(args: {
  locale: "en" | "es" | "pt";
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

function dispatchFind(
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

export function PdfReaderWorkspace({
  availableModes,
  bookmarks,
  document: readerDocument,
  hasExtractedText,
  highlightNote,
  highlights,
  jumpRequest,
  onChangeHighlightNote,
  onDeleteBookmark,
  onDeleteHighlight,
  onJumpToBookmark,
  onJumpToHighlight,
  onPageChange,
  onSaveBookmark,
  onSaveHighlight,
  onSelectMode,
}: PdfReaderWorkspaceProps) {
  const { locale } = useLocale();
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerElementRef = useRef<HTMLDivElement | null>(null);
  const viewerRuntimeRef = useRef<PdfViewerRuntime | null>(null);
  const modeMenuRef = useRef<HTMLDivElement | null>(null);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [error, setError] = useState<string>();
  const [findMatches, setFindMatches] = useState({ current: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<PdfOutlineItem[]>([]);
  const [pageLabels, setPageLabels] = useState<string[] | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentHandle | null>(
    null,
  );
  const [pdfViewerModule, setPdfViewerModule] =
    useState<PdfViewerModule | null>(null);
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "not-found" | "pending" | "ready"
  >("idle");
  const [thumbnails, setThumbnails] = useState<PdfThumbnailItem[]>([]);
  const [requestedThumbnailPages, setRequestedThumbnailPages] = useState<
    number[]
  >([]);
  const [viewerState, setViewerState] = useState<PdfViewerState>(
    defaultPdfViewerState,
  );
  const [zoomPercent, setZoomPercent] = useState(100);
  const renderedThumbnailPagesRef = useRef(new Set<number>());
  const renderingThumbnailPagesRef = useRef(new Set<number>());
  const viewerStateRef = useRef(viewerState);
  const searchQueryRef = useRef(viewerState.searchQuery);

  useEffect(() => {
    if (!isModeMenuOpen && !isViewMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        modeMenuRef.current?.contains(target) ||
        viewMenuRef.current?.contains(target)
      ) {
        return;
      }

      setIsModeMenuOpen(false);
      setIsViewMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModeMenuOpen(false);
        setIsViewMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModeMenuOpen, isViewMenuOpen]);

  const requestThumbnailPage = useCallback(
    (pageIndex: number) => {
      const totalPages = pdfDocument?.numPages ?? 0;

      if (
        !Number.isInteger(pageIndex) ||
        pageIndex < 0 ||
        pageIndex >= totalPages
      ) {
        return;
      }

      setRequestedThumbnailPages((currentPages) => {
        if (currentPages.includes(pageIndex)) {
          return currentPages;
        }

        return [...currentPages, pageIndex].sort((left, right) => left - right);
      });
    },
    [pdfDocument?.numPages],
  );

  const requestThumbnailWindow = useCallback(
    (pageIndex: number) => {
      const totalPages = pdfDocument?.numPages ?? 0;

      if (totalPages === 0) {
        return;
      }

      const nextPages = new Set<number>();

      for (let offset = -2; offset <= 2; offset += 1) {
        const nextPageIndex = pageIndex + offset;

        if (nextPageIndex >= 0 && nextPageIndex < totalPages) {
          nextPages.add(nextPageIndex);
        }
      }

      for (
        let nextPageIndex = 0;
        nextPageIndex < Math.min(totalPages, 4);
        nextPageIndex += 1
      ) {
        nextPages.add(nextPageIndex);
      }

      setRequestedThumbnailPages((currentPages) => {
        const mergedPages = new Set(currentPages);
        nextPages.forEach((nextPage) => {
          mergedPages.add(nextPage);
        });

        return [...mergedPages].sort((left, right) => left - right);
      });
    },
    [pdfDocument?.numPages],
  );

  useEffect(() => {
    viewerStateRef.current = viewerState;
    searchQueryRef.current = viewerState.searchQuery;
  }, [viewerState]);

  const modeLabels: Record<ReaderMode, Record<"en" | "es" | "pt", string>> = {
    "pdf-page": {
      en: "Acrobat PDF",
      es: "PDF Acrobat",
      pt: "PDF Acrobat",
    },
    "focus-word": { en: "Focus Word", es: "Palabra foco", pt: "Palavra foco" },
    "phrase-chunk": {
      en: "Phrase Chunk",
      es: "Bloques de frases",
      pt: "Blocos de frases",
    },
    "guided-line": {
      en: "Guided Line",
      es: "Linea guiada",
      pt: "Linha guiada",
    },
    "classic-reader": {
      en: "Classic Reader",
      es: "Lector clasico",
      pt: "Leitor classico",
    },
  };

  useEffect(() => {
    let cancelled = false;
    let nextPdfDocument: PdfDocumentHandle | null = null;

    async function openPdfDocument() {
      setIsLoading(true);
      setError(undefined);
      setOutlineItems([]);
      setPageLabels(null);
      setPdfDocument(null);
      setSearchStatus("idle");
      setFindMatches({ current: 0, total: 0 });
      setThumbnails([]);
      setRequestedThumbnailPages([]);

      try {
        const [asset, storedViewerState, nextPdfViewerModule] =
          await Promise.all([
            getDocumentAsset(readerDocument.id),
            getStoredPdfViewerState(readerDocument.id),
            loadPdfJsViewer(),
          ]);

        if (!asset || asset.sourceKind !== "pdf") {
          if (!cancelled) {
            setError(
              getLocalizedCopy(locale, {
                en: "The original PDF is not stored on this device. Re-import the PDF locally to use the Acrobat view.",
                es: "El PDF original no esta guardado en este dispositivo. Importalo otra vez localmente para usar la vista Acrobat.",
                pt: "O PDF original nao esta salvo neste dispositivo. Importe o PDF novamente localmente para usar a visualizacao Acrobat.",
              }),
            );
          }
          return;
        }

        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument({
          cMapPacked: true,
          cMapUrl: getPdfAssetUrl("cmaps/"),
          data: new Uint8Array(await asset.blob.arrayBuffer()),
          iccUrl: getPdfAssetUrl("iccs/"),
          standardFontDataUrl: getPdfAssetUrl("standard_fonts/"),
          useWasm: false,
          useWorkerFetch: false,
          wasmUrl: getPdfAssetUrl("wasm/"),
        });

        nextPdfDocument =
          (await loadingTask.promise) as unknown as PdfDocumentHandle;
        const [labels, resolvedOutline] = await Promise.all([
          nextPdfDocument.getPageLabels(),
          buildResolvedPdfOutline(nextPdfDocument),
        ]);

        if (cancelled) {
          await Promise.resolve(nextPdfDocument.destroy?.());
          return;
        }

        const nextViewerState = sanitizePdfViewerState(
          storedViewerState,
          nextPdfDocument.numPages,
        );

        setPdfViewerModule(nextPdfViewerModule as unknown as PdfViewerModule);
        setPdfDocument(nextPdfDocument);
        setPageLabels(labels);
        setOutlineItems(resolvedOutline);
        setViewerState(nextViewerState);
        setCurrentPageIndex(nextViewerState.pageIndex);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : getLocalizedCopy(locale, {
                  en: "The PDF viewer could not open this document.",
                  es: "El visor PDF no pudo abrir este documento.",
                  pt: "O visualizador de PDF nao conseguiu abrir este documento.",
                }),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void openPdfDocument();

    return () => {
      cancelled = true;
      if (nextPdfDocument) {
        void Promise.resolve(nextPdfDocument.destroy?.());
      }
    };
  }, [locale, readerDocument.id]);

  useEffect(() => {
    if (!pdfDocument || !pdfViewerModule) {
      return;
    }

    const container = viewerContainerRef.current;
    const viewerElement = viewerElementRef.current;

    if (!container || !viewerElement) {
      return;
    }

    viewerElement.replaceChildren();

    const eventBus = new pdfViewerModule.EventBus();
    const linkService = new pdfViewerModule.PDFLinkService({ eventBus });
    const findController = new pdfViewerModule.PDFFindController({
      eventBus,
      linkService,
    });
    const pdfViewer = new pdfViewerModule.PDFViewer({
      annotationMode: 2,
      container,
      eventBus,
      findController,
      linkService,
      minDurationToUpdateCanvas: 150,
      removePageBorders: false,
      textLayerMode: 1,
      viewer: viewerElement,
    });

    linkService.setViewer(pdfViewer);
    linkService.setDocument(pdfDocument);
    findController.setDocument(pdfDocument);
    pdfViewer.setDocument(pdfDocument);
    pdfViewer.setPageLabels(pageLabels);

    const initialViewerState = sanitizePdfViewerState(
      viewerStateRef.current,
      pdfDocument.numPages,
    );
    pdfViewer.scrollMode =
      initialViewerState.scrollMode === "single-page"
        ? pdfViewerModule.ScrollMode.PAGE
        : pdfViewerModule.ScrollMode.VERTICAL;
    pdfViewer.pagesRotation = initialViewerState.rotation;
    pdfViewer.currentScaleValue = initialViewerState.zoomValue;
    pdfViewer.currentPageNumber = initialViewerState.pageIndex + 1;

    const handlePageChanging = (event: PdfPageChangingEvent) => {
      const nextPageIndex = Math.max(0, Number(event.pageNumber ?? 1) - 1);

      setCurrentPageIndex(nextPageIndex);
      setViewerState((currentState) =>
        currentState.pageIndex === nextPageIndex
          ? currentState
          : { ...currentState, pageIndex: nextPageIndex },
      );
      onPageChange(nextPageIndex);
    };

    const handleScaleChanging = (event: PdfScaleChangingEvent) => {
      const nextZoomValue =
        typeof event.presetValue === "string"
          ? event.presetValue
          : String(Number(event.scale ?? 1).toFixed(2));

      setZoomPercent(Math.round(Number(event.scale ?? 1) * 100));
      setViewerState((currentState) =>
        currentState.zoomValue === nextZoomValue
          ? currentState
          : { ...currentState, zoomValue: nextZoomValue },
      );
    };

    const handleRotationChanging = (event: PdfRotationChangingEvent) => {
      const nextRotation = Number(event.pagesRotation ?? 0) as
        | 0
        | 90
        | 180
        | 270;

      setViewerState((currentState) =>
        currentState.rotation === nextRotation
          ? currentState
          : { ...currentState, rotation: nextRotation },
      );
    };

    const handleScrollModeChanged = (event: PdfScrollModeChangedEvent) => {
      const nextScrollMode =
        Number(event.mode) === pdfViewerModule.ScrollMode.PAGE
          ? "single-page"
          : "continuous";

      setViewerState((currentState) =>
        currentState.scrollMode === nextScrollMode
          ? currentState
          : { ...currentState, scrollMode: nextScrollMode },
      );
    };

    const handleFindMatchesCount = (event: PdfFindMatchesCountEvent) => {
      setFindMatches(event.matchesCount ?? { current: 0, total: 0 });
    };

    const handleFindControlState = (event: PdfFindControlStateEvent) => {
      if (event.matchesCount) {
        setFindMatches(event.matchesCount);
      }

      if (event.state === pdfViewerModule.FindState.PENDING) {
        setSearchStatus("pending");
        return;
      }

      if (event.state === pdfViewerModule.FindState.NOT_FOUND) {
        setSearchStatus("not-found");
        return;
      }

      if ((event.matchesCount?.total ?? 0) > 0) {
        setSearchStatus("ready");
        return;
      }

      setSearchStatus(searchQueryRef.current.trim() ? "pending" : "idle");
    };

    eventBus.on("pagechanging", handlePageChanging);
    eventBus.on("rotationchanging", handleRotationChanging);
    eventBus.on("scalechanging", handleScaleChanging);
    eventBus.on("scrollmodechanged", handleScrollModeChanged);
    eventBus.on("updatefindcontrolstate", handleFindControlState);
    eventBus.on("updatefindmatchescount", handleFindMatchesCount);

    viewerRuntimeRef.current = {
      eventBus,
      pdfViewer,
      scrollMode: {
        PAGE: pdfViewerModule.ScrollMode.PAGE,
        VERTICAL: pdfViewerModule.ScrollMode.VERTICAL,
      },
    };

    if (initialViewerState.searchQuery.trim()) {
      dispatchFind(viewerRuntimeRef.current, initialViewerState.searchQuery);
    }

    return () => {
      viewerRuntimeRef.current = null;
      eventBus.off("pagechanging", handlePageChanging);
      eventBus.off("rotationchanging", handleRotationChanging);
      eventBus.off("scalechanging", handleScaleChanging);
      eventBus.off("scrollmodechanged", handleScrollModeChanged);
      eventBus.off("updatefindcontrolstate", handleFindControlState);
      eventBus.off("updatefindmatchescount", handleFindMatchesCount);
      pdfViewer.cleanup();
      viewerElement.replaceChildren();
    };
  }, [
    onPageChange,
    pageLabels,
    pdfDocument,
    pdfViewerModule,
    readerDocument.id,
  ]);

  useEffect(() => {
    if (!jumpRequest || !viewerRuntimeRef.current) {
      return;
    }

    viewerRuntimeRef.current.pdfViewer.currentPageNumber =
      jumpRequest.pageIndex + 1;
  }, [jumpRequest]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void savePdfViewerState(readerDocument.id, viewerState);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pdfDocument, readerDocument.id, viewerState]);

  useEffect(() => {
    const runtime = viewerRuntimeRef.current;
    const query = viewerState.searchQuery.trim();

    if (!runtime) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!query) {
        setFindMatches({ current: 0, total: 0 });
        setSearchStatus("idle");
        runtime.eventBus.dispatch("find", {
          caseSensitive: false,
          entireWord: false,
          findPrevious: false,
          highlightAll: false,
          phraseSearch: true,
          query: "",
          source: "leyendo",
          type: "",
        });
        return;
      }

      setSearchStatus("pending");
      dispatchFind(runtime, query);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [viewerState.searchQuery]);

  useEffect(() => {
    if (!pdfDocument) {
      setThumbnails([]);
      setRequestedThumbnailPages([]);
      renderedThumbnailPagesRef.current.clear();
      renderingThumbnailPagesRef.current.clear();
      return;
    }

    renderedThumbnailPagesRef.current.clear();
    renderingThumbnailPagesRef.current.clear();

    setThumbnails(
      Array.from({ length: pdfDocument.numPages }, (_, pageIndex) => ({
        pageIndex,
        pageLabel: getPdfPageLabel(pageIndex, pageLabels),
      })),
    );

    setRequestedThumbnailPages([]);
  }, [pageLabels, pdfDocument, viewerState.rotation]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    requestThumbnailWindow(currentPageIndex);
  }, [currentPageIndex, pdfDocument, requestThumbnailWindow]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    const pdfDocumentHandle = pdfDocument;
    const pagesToRender = requestedThumbnailPages
      .filter(
        (pageIndex) =>
          pageIndex >= 0 &&
          pageIndex < pdfDocumentHandle.numPages &&
          !renderedThumbnailPagesRef.current.has(pageIndex) &&
          !renderingThumbnailPagesRef.current.has(pageIndex),
      )
      .sort(
        (left, right) =>
          Math.abs(left - currentPageIndex) -
          Math.abs(right - currentPageIndex),
      );

    if (pagesToRender.length === 0) {
      return;
    }

    let cancelled = false;
    pagesToRender.forEach((pageIndex) => {
      renderingThumbnailPagesRef.current.add(pageIndex);
    });

    async function renderThumbnails() {
      for (const pageIndex of pagesToRender) {
        let pageHandle: PdfPageHandle | undefined;

        try {
          pageHandle = await pdfDocumentHandle.getPage(pageIndex + 1);

          if (cancelled) {
            return;
          }

          const baseViewport = pageHandle.getViewport({
            rotation: viewerState.rotation,
            scale: 1,
          });
          const scale = 156 / Math.max(1, baseViewport.width);
          const viewport = pageHandle.getViewport({
            rotation: viewerState.rotation,
            scale,
          });
          const canvas = globalThis.document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });

          if (!context) {
            continue;
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await pageHandle.render({
            canvasContext: context,
            transform: null,
            viewport,
          }).promise;

          if (cancelled) {
            return;
          }

          const imageUrl = canvas.toDataURL("image/png");
          renderedThumbnailPagesRef.current.add(pageIndex);

          setThumbnails((currentThumbnails) => {
            const nextThumbnails = [...currentThumbnails];
            const previousThumbnail = nextThumbnails[pageIndex];

            nextThumbnails[pageIndex] = {
              imageUrl,
              pageIndex,
              pageLabel:
                previousThumbnail?.pageLabel ??
                getPdfPageLabel(pageIndex, pageLabels),
            };

            return nextThumbnails;
          });
        } catch {
          continue;
        } finally {
          pageHandle?.cleanup?.();
          renderingThumbnailPagesRef.current.delete(pageIndex);
        }
      }
    }

    void renderThumbnails();

    return () => {
      cancelled = true;
    };
  }, [
    currentPageIndex,
    pageLabels,
    pdfDocument,
    requestedThumbnailPages,
    viewerState.rotation,
  ]);

  const currentPageLabel = useMemo(() => {
    return getPdfPageLabel(currentPageIndex, pageLabels);
  }, [currentPageIndex, pageLabels]);

  const searchStatusLabel = useMemo(() => {
    if (!viewerState.searchQuery.trim()) {
      return getLocalizedCopy(locale, {
        en: "Search the document",
        es: "Buscar en el documento",
        pt: "Buscar no documento",
      });
    }

    if (searchStatus === "not-found") {
      return getLocalizedCopy(locale, {
        en: "No matches",
        es: "Sin resultados",
        pt: "Sem resultados",
      });
    }

    if (findMatches.total > 0) {
      return getLocalizedCopy(locale, {
        en: `${findMatches.current} of ${findMatches.total}`,
        es: `${findMatches.current} de ${findMatches.total}`,
        pt: `${findMatches.current} de ${findMatches.total}`,
      });
    }

    return getLocalizedCopy(locale, {
      en: "Searching...",
      es: "Buscando...",
      pt: "Buscando...",
    });
  }, [findMatches, locale, searchStatus, viewerState.searchQuery]);

  const zoomLabel = useMemo(() => {
    return formatZoomLabel({
      locale,
      zoomPercent,
      zoomValue: viewerState.zoomValue,
    });
  }, [locale, viewerState.zoomValue, zoomPercent]);

  const viewerNotice = !hasExtractedText
    ? {
        description: getLocalizedCopy(locale, {
          en: "Leyendo can display this PDF visually and still save page bookmarks, but highlights and speed-reading modes need extracted text. Run OCR or export a text-based PDF to unlock them.",
          es: "Leyendo puede mostrar este PDF visualmente y aun guardar marcadores por pagina, pero los destacados y modos de lectura rapida necesitan texto extraido. Ejecuta OCR o exporta un PDF con texto para activarlos.",
          pt: "O Leyendo consegue mostrar este PDF visualmente e ainda salvar marcadores por pagina, mas destaques e modos de leitura rapida precisam de texto extraido. Rode OCR ou exporte um PDF com texto para habilitar tudo.",
        }),
        title: getLocalizedCopy(locale, {
          en: "This PDF needs OCR for text-driven reader features",
          es: "Este PDF necesita OCR para las funciones basadas en texto",
          pt: "Este PDF precisa de OCR para os recursos baseados em texto",
        }),
        tone: "warning" as const,
      }
    : undefined;

  const toolbarButtonClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-400";
  const toolbarChipClass =
    "inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700";
  const toolbarIconButtonClass =
    "rounded-full p-1 transition hover:bg-slate-100";
  const toolbarDropdownClass =
    "absolute top-full left-0 z-20 mt-3 w-[min(19rem,calc(100vw-3rem))] rounded-[1.25rem] border border-slate-300 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)]";

  const handleFindPrevious = useCallback(() => {
    const runtime = viewerRuntimeRef.current;
    const query = viewerState.searchQuery.trim();

    if (!runtime || !query) {
      return;
    }

    dispatchFind(runtime, query, true);
  }, [viewerState.searchQuery]);

  const handleFindNext = useCallback(() => {
    const runtime = viewerRuntimeRef.current;
    const query = viewerState.searchQuery.trim();

    if (!runtime || !query) {
      return;
    }

    dispatchFind(runtime, query, false);
  }, [viewerState.searchQuery]);

  const handleZoomPreset = useCallback((zoomValue: string) => {
    if (!viewerRuntimeRef.current) {
      return;
    }

    viewerRuntimeRef.current.pdfViewer.currentScaleValue = zoomValue;
  }, []);

  const handleZoomStep = useCallback((steps: number) => {
    if (!viewerRuntimeRef.current) {
      return;
    }

    viewerRuntimeRef.current.pdfViewer.updateScale({ steps });
  }, []);

  const handleRotate = useCallback(() => {
    if (!viewerRuntimeRef.current) {
      return;
    }

    viewerRuntimeRef.current.pdfViewer.pagesRotation =
      (viewerState.rotation + 90) % 360;
  }, [viewerState.rotation]);

  const handleScrollModeChange = useCallback(
    (scrollMode: "continuous" | "single-page") => {
      if (!viewerRuntimeRef.current) {
        return;
      }

      viewerRuntimeRef.current.pdfViewer.scrollMode =
        scrollMode === "single-page"
          ? viewerRuntimeRef.current.scrollMode.PAGE
          : viewerRuntimeRef.current.scrollMode.VERTICAL;
    },
    [],
  );

  const handlePageStep = useCallback(
    (delta: -1 | 1) => {
      if (!viewerRuntimeRef.current) {
        return;
      }

      viewerRuntimeRef.current.pdfViewer.currentPageNumber = Math.max(
        1,
        Math.min(pdfDocument?.numPages ?? 1, currentPageIndex + 1 + delta),
      );
    },
    [currentPageIndex, pdfDocument?.numPages],
  );

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-10 text-center text-slate-700 shadow-[0_20px_80px_rgba(20,26,56,0.08)]">
        <p className="text-sm tracking-[0.28em] text-sky-700 uppercase">
          {getLocalizedCopy(locale, {
            en: "Opening PDF",
            es: "Abriendo PDF",
            pt: "Abrindo PDF",
          })}
        </p>
        <div className="mt-5 flex items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-sky-700" />
        </div>
      </section>
    );
  }

  if (!pdfDocument || error) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-10 text-center text-amber-950 shadow-[0_20px_80px_rgba(20,26,56,0.08)]">
        <FileWarning className="mx-auto h-8 w-8 text-amber-700" />
        <h2 className="mt-5 text-3xl font-semibold tracking-tight">
          {getLocalizedCopy(locale, {
            en: "The Acrobat view is unavailable",
            es: "La vista Acrobat no esta disponible",
            pt: "A visualizacao Acrobat nao esta disponivel",
          })}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-amber-900/80">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-3 border-b border-slate-300/80 bg-slate-50 px-3 py-3 text-sm text-slate-700 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative" ref={modeMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsModeMenuOpen((current) => !current);
                  setIsViewMenuOpen(false);
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs tracking-[0.18em] text-slate-700 uppercase transition hover:border-slate-400 sm:px-4 sm:text-sm"
              >
                {getLocalizedCopy(locale, modeLabels["pdf-page"])}
                <ChevronDown
                  className={`h-4 w-4 transition ${isModeMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isModeMenuOpen ? (
                <div className={toolbarDropdownClass}>
                  <div className="grid gap-2">
                    {availableModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          onSelectMode(mode);
                          setIsModeMenuOpen(false);
                        }}
                        className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                          mode === "pdf-page"
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {getLocalizedCopy(locale, modeLabels[mode])}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700">
              <button
                type="button"
                onClick={() => handlePageStep(-1)}
                aria-label={getLocalizedCopy(locale, {
                  en: "Previous page",
                  es: "Pagina anterior",
                  pt: "Pagina anterior",
                })}
                title={getLocalizedCopy(locale, {
                  en: "Previous page",
                  es: "Pagina anterior",
                  pt: "Pagina anterior",
                })}
                className={toolbarIconButtonClass}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm">
                {getLocalizedCopy(locale, {
                  en: `Page ${currentPageLabel}`,
                  es: `Pagina ${currentPageLabel}`,
                  pt: `Pagina ${currentPageLabel}`,
                })}
              </span>
              <button
                type="button"
                onClick={() => handlePageStep(1)}
                aria-label={getLocalizedCopy(locale, {
                  en: "Next page",
                  es: "Pagina siguiente",
                  pt: "Proxima pagina",
                })}
                title={getLocalizedCopy(locale, {
                  en: "Next page",
                  es: "Pagina siguiente",
                  pt: "Proxima pagina",
                })}
                className={toolbarIconButtonClass}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className={toolbarChipClass}>
              {getLocalizedCopy(locale, {
                en: `${currentPageIndex + 1} of ${pdfDocument.numPages}`,
                es: `${currentPageIndex + 1} de ${pdfDocument.numPages}`,
                pt: `${currentPageIndex + 1} de ${pdfDocument.numPages}`,
              })}
            </span>

            <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700">
              <button
                type="button"
                onClick={() => handleZoomStep(-1)}
                aria-label={getLocalizedCopy(locale, {
                  en: "Zoom out",
                  es: "Alejar",
                  pt: "Diminuir zoom",
                })}
                title={getLocalizedCopy(locale, {
                  en: "Zoom out",
                  es: "Alejar",
                  pt: "Diminuir zoom",
                })}
                className={toolbarIconButtonClass}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span>{zoomLabel}</span>
              <button
                type="button"
                onClick={() => handleZoomStep(1)}
                aria-label={getLocalizedCopy(locale, {
                  en: "Zoom in",
                  es: "Acercar",
                  pt: "Aumentar zoom",
                })}
                title={getLocalizedCopy(locale, {
                  en: "Zoom in",
                  es: "Acercar",
                  pt: "Aumentar zoom",
                })}
                className={toolbarIconButtonClass}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <div className="relative" ref={viewMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsViewMenuOpen((current) => !current);
                  setIsModeMenuOpen(false);
                }}
                className={toolbarButtonClass}
              >
                {getLocalizedCopy(locale, {
                  en: "View",
                  es: "Vista",
                  pt: "Vista",
                })}
                <ChevronDown
                  className={`h-4 w-4 transition ${isViewMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isViewMenuOpen ? (
                <div
                  className={`${toolbarDropdownClass} right-0 left-auto sm:right-auto sm:left-0`}
                >
                  <p className="px-2 text-xs tracking-[0.2em] text-slate-500 uppercase">
                    {getLocalizedCopy(locale, {
                      en: "PDF view tools",
                      es: "Herramientas de vista PDF",
                      pt: "Ferramentas de visualizacao PDF",
                    })}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        {
                          label: getLocalizedCopy(locale, {
                            en: "Fit width",
                            es: "Ajustar ancho",
                            pt: "Ajustar largura",
                          }),
                          value: "page-width",
                        },
                        {
                          label: getLocalizedCopy(locale, {
                            en: "Fit page",
                            es: "Ajustar pagina",
                            pt: "Ajustar pagina",
                          }),
                          value: "page-fit",
                        },
                        {
                          label: getLocalizedCopy(locale, {
                            en: "Actual size",
                            es: "Tamano real",
                            pt: "Tamanho real",
                          }),
                          value: "page-actual",
                        },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            handleZoomPreset(preset.value);
                            setIsViewMenuOpen(false);
                          }}
                          className={`rounded-full border px-3 py-2 text-sm transition ${
                            viewerState.zoomValue === preset.value
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleRotate();
                        setIsViewMenuOpen(false);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      <RotateCw className="h-4 w-4" />
                      {getLocalizedCopy(locale, {
                        en: "Rotate",
                        es: "Rotar",
                        pt: "Girar",
                      })}
                    </button>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        {
                          label: getLocalizedCopy(locale, {
                            en: "Continuous",
                            es: "Continuo",
                            pt: "Continuo",
                          }),
                          value: "continuous" as const,
                        },
                        {
                          label: getLocalizedCopy(locale, {
                            en: "Single page",
                            es: "Pagina unica",
                            pt: "Pagina unica",
                          }),
                          value: "single-page" as const,
                        },
                      ].map((scrollMode) => (
                        <button
                          key={scrollMode.value}
                          type="button"
                          onClick={() => {
                            handleScrollModeChange(scrollMode.value);
                            setIsViewMenuOpen(false);
                          }}
                          className={`rounded-full px-3 py-2 text-sm transition ${
                            viewerState.scrollMode === scrollMode.value
                              ? "bg-slate-900 text-white"
                              : "border border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          {scrollMode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex w-full items-center gap-2 rounded-[1rem] border border-slate-300 bg-white px-3 py-2 sm:min-w-72 sm:rounded-full">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={viewerState.searchQuery}
              onChange={(event) => {
                setViewerState((currentState) => ({
                  ...currentState,
                  searchQuery: event.target.value,
                }));
              }}
              placeholder={getLocalizedCopy(locale, {
                en: "Search this PDF",
                es: "Buscar en este PDF",
                pt: "Buscar neste PDF",
              })}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="hidden text-xs tracking-[0.18em] text-slate-500 uppercase sm:inline">
              {searchStatusLabel}
            </span>
            <button
              type="button"
              onClick={handleFindPrevious}
              aria-label={getLocalizedCopy(locale, {
                en: "Previous match",
                es: "Resultado anterior",
                pt: "Resultado anterior",
              })}
              title={getLocalizedCopy(locale, {
                en: "Previous match",
                es: "Resultado anterior",
                pt: "Resultado anterior",
              })}
              className={`${toolbarIconButtonClass} disabled:opacity-40`}
              disabled={!viewerState.searchQuery.trim()}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleFindNext}
              aria-label={getLocalizedCopy(locale, {
                en: "Next match",
                es: "Resultado siguiente",
                pt: "Proximo resultado",
              })}
              title={getLocalizedCopy(locale, {
                en: "Next match",
                es: "Resultado siguiente",
                pt: "Proximo resultado",
              })}
              className={`${toolbarIconButtonClass} disabled:opacity-40`}
              disabled={!viewerState.searchQuery.trim()}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={viewerContainerRef}
          className="pdfViewer h-[72vh] min-h-120 overflow-auto bg-slate-300/70 px-2 py-4 sm:h-[82vh] sm:min-h-152 sm:px-4 sm:py-6 lg:h-[86vh]"
        >
          <div ref={viewerElementRef} className="pdfViewer" />
        </div>
      </div>

      <ReaderSidebar
        bookmarks={bookmarks}
        currentPdfPageIndex={currentPageIndex}
        currentPdfPageLabel={currentPageLabel}
        highlightNote={highlightNote}
        highlights={highlights}
        notice={viewerNotice}
        onChangeHighlightNote={onChangeHighlightNote}
        onDeleteBookmark={onDeleteBookmark}
        onDeleteHighlight={onDeleteHighlight}
        onJumpToBookmark={onJumpToBookmark}
        onJumpToHighlight={onJumpToHighlight}
        onJumpToOutlineItem={(outlineItem) => {
          if (
            typeof outlineItem.pageIndex === "number" &&
            viewerRuntimeRef.current
          ) {
            viewerRuntimeRef.current.pdfViewer.currentPageNumber =
              outlineItem.pageIndex + 1;
          }
        }}
        onJumpToThumbnail={(pageIndex) => {
          if (!viewerRuntimeRef.current) {
            return;
          }

          viewerRuntimeRef.current.pdfViewer.currentPageNumber = pageIndex + 1;
        }}
        onRequestThumbnail={requestThumbnailPage}
        onSaveBookmark={() => {
          onSaveBookmark({ pageIndex: currentPageIndex });
        }}
        onSaveHighlight={
          hasExtractedText
            ? () => {
                onSaveHighlight({
                  pageIndex: currentPageIndex,
                  selectionText: getPdfSelectionText(
                    viewerContainerRef.current,
                  ),
                });
              }
            : undefined
        }
        outlineItems={outlineItems}
        pdfThumbnails={thumbnails}
        saveHighlightDisabled={!hasExtractedText}
        showHighlightComposer
      />
    </section>
  );
}

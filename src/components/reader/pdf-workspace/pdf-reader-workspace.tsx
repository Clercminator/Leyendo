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
  dispatchFind,
  formatZoomLabel,
  getPdfSelectionText,
  pdfReaderModeLabels,
  sanitizePdfViewerState,
  type PdfDocumentHandle,
  type PdfFindControlStateEvent,
  type PdfFindMatchesCountEvent,
  type PdfMatchCount,
  type PdfOutlineNodeHandle,
  type PdfPageChangingEvent,
  type PdfPageHandle,
  type PdfRenderTask,
  type PdfRotationChangingEvent,
  type PdfScaleChangingEvent,
  type PdfScrollModeChangedEvent,
  type PdfViewerModule,
  type PdfViewerRuntime,
  type PdfViewport,
} from "@/components/reader/pdf-workspace/pdf-reader-workspace-helpers";
import { getPdfReaderWorkspaceCopy } from "@/components/reader/pdf-workspace/pdf-reader-workspace-copy";
import { PdfReaderWorkspaceMobileSidebar } from "@/components/reader/pdf-workspace/pdf-reader-workspace-mobile-sidebar";
import { PdfReaderWorkspaceSidebar } from "@/components/reader/pdf-workspace/pdf-reader-workspace-sidebar";
import type { PdfThumbnailItem } from "@/components/reader/reader-sidebar";
import {
  getDocumentAsset,
  getStoredPdfViewerState,
  savePdfViewerState,
} from "@/db/repositories";
import {
  buildResolvedPdfOutline,
  getPdfPageLabel,
  resolvePdfPageInput,
  type PdfOutlineItem,
} from "@/features/reader/pdf/navigation";
import { getLocalizedCopy } from "@/lib/locale";
import { measureAsync, recordPerfMetric } from "@/lib/perf/instrumentation";
import { getPdfAssetUrl, loadPdfJs, loadPdfJsViewer } from "@/lib/pdf/pdfjs";
import type { DocumentRecord } from "@/types/document";
import {
  defaultPdfViewerState,
  type Bookmark,
  type Highlight,
  type PdfViewerState,
  type ReaderMode,
} from "@/types/reader";

const PDF_VIEWER_STATE_SAVE_DELAY_MS = 700;
const PDF_THUMBNAIL_BATCH_SIZE = 4;
const PDF_THUMBNAIL_BATCH_SIZE_CONSTRAINED = 2;
const PDF_THUMBNAIL_INITIAL_BATCH_SIZE = 2;
const PDF_THUMBNAIL_INITIAL_BATCH_SIZE_CONSTRAINED = 1;
const PDF_THUMBNAIL_PINNED_PAGES = 4;
const PDF_THUMBNAIL_PINNED_PAGES_CONSTRAINED = 2;
const PDF_THUMBNAIL_WINDOW_RADIUS = 2;
const PDF_THUMBNAIL_WINDOW_RADIUS_CONSTRAINED = 1;
const PDF_THUMBNAIL_RENDER_DELAY_MS_CONSTRAINED = 48;
const PDF_DESKTOP_SIDEBAR_MEDIA_QUERY = "(min-width: 1024px)";

function getPerfNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function shouldUseConstrainedPdfMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const coarsePointer =
    window.matchMedia?.("(hover: none), (pointer: coarse)").matches ?? false;
  const lowConcurrency =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= 4;
  const deviceMemory = (
    navigator as Navigator & { deviceMemory?: number }
  ).deviceMemory;
  const lowMemory = typeof deviceMemory === "number" && deviceMemory <= 4;

  return coarsePointer || lowConcurrency || lowMemory;
}

function yieldToBrowser(delayMs = 0) {
  return new Promise<void>((resolve) => {
    if (delayMs > 0) {
      window.setTimeout(resolve, delayMs);
      return;
    }

    window.requestAnimationFrame(() => {
      resolve();
    });
  });
}

function compareThumbnailPagePriority(
  left: number,
  right: number,
  currentPageIndex: number,
) {
  if (left === currentPageIndex) {
    return -1;
  }

  if (right === currentPageIndex) {
    return 1;
  }

  const leftDistance = Math.abs(left - currentPageIndex);
  const rightDistance = Math.abs(right - currentPageIndex);

  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  const leftIsBehind = left < currentPageIndex;
  const rightIsBehind = right < currentPageIndex;

  if (leftIsBehind !== rightIsBehind) {
    return leftIsBehind ? 1 : -1;
  }

  return left - right;
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
  const [hasDesktopSidebar, setHasDesktopSidebar] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(PDF_DESKTOP_SIDEBAR_MEDIA_QUERY).matches;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<PdfOutlineItem[]>([]);
  const [pageJumpError, setPageJumpError] = useState<string>();
  const [pageJumpValue, setPageJumpValue] = useState("");
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
  const [thumbnailRenderCycle, setThumbnailRenderCycle] = useState(0);
  const [viewerState, setViewerState] = useState<PdfViewerState>(
    defaultPdfViewerState,
  );
  const [zoomPercent, setZoomPercent] = useState(100);
  const [selectedPdfText, setSelectedPdfText] = useState<string>();
  const isConstrainedPdfMode = useMemo(() => shouldUseConstrainedPdfMode(), []);
  const isViewerReadyRef = useRef(false);
  const pendingPageNumberRef = useRef<number | undefined>(undefined);
  const pendingViewerStateRef = useRef(viewerState);
  const renderedThumbnailPagesRef = useRef(new Set<number>());
  const renderingThumbnailPagesRef = useRef(new Set<number>());
  const viewerStateSaveTimeoutRef = useRef<number | undefined>(undefined);
  const viewerStateRef = useRef(viewerState);
  const searchQueryRef = useRef(viewerState.searchQuery);
  const activeBootstrapRunIdRef = useRef(0);
  const pendingFirstPageReadyMetricRef = useRef<
    | {
        pageNumber: number;
        pagesInitRecorded: boolean;
        runId: number;
        startedAt: number;
        viewerSetDocumentRecorded: boolean;
      }
    | undefined
  >(undefined);
  const thumbnailPinnedPageCount = isConstrainedPdfMode
    ? PDF_THUMBNAIL_PINNED_PAGES_CONSTRAINED
    : PDF_THUMBNAIL_PINNED_PAGES;
  const thumbnailRenderBatchSize = isConstrainedPdfMode
    ? PDF_THUMBNAIL_BATCH_SIZE_CONSTRAINED
    : PDF_THUMBNAIL_BATCH_SIZE;
  const initialThumbnailRenderBatchSize = isConstrainedPdfMode
    ? PDF_THUMBNAIL_INITIAL_BATCH_SIZE_CONSTRAINED
    : PDF_THUMBNAIL_INITIAL_BATCH_SIZE;
  const thumbnailWindowRadius = isConstrainedPdfMode
    ? PDF_THUMBNAIL_WINDOW_RADIUS_CONSTRAINED
    : PDF_THUMBNAIL_WINDOW_RADIUS;
  const shouldEagerlyRenderThumbnails =
    hasDesktopSidebar || isMobileSidebarOpen;
  const measurePdfBootstrapPhase = useCallback(
    async <T,>(phase: string, runId: number, callback: () => Promise<T>) => {
      const startedAt = getPerfNow();
      const result = await callback();

      if (activeBootstrapRunIdRef.current === runId) {
        recordPerfMetric({
          name: "reader.pdf-bootstrap-phase",
          durationMs: Math.round(getPerfNow() - startedAt),
          timestamp: Date.now(),
          detail: {
            documentId: readerDocument.id,
            phase,
          },
        });
      }

      return result;
    },
    [readerDocument.id],
  );
  const recordPdfBootstrapPhase = useCallback(
    (
      phase: string,
      runId: number,
      startedAt: number,
      detail: Record<string, number | string | boolean | undefined> = {},
    ) => {
      if (activeBootstrapRunIdRef.current !== runId) {
        return;
      }

      recordPerfMetric({
        name: "reader.pdf-bootstrap-phase",
        durationMs: Math.round(getPerfNow() - startedAt),
        timestamp: Date.now(),
        detail: {
          documentId: readerDocument.id,
          phase,
          ...detail,
        },
      });
    },
    [readerDocument.id],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(PDF_DESKTOP_SIDEBAR_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setHasDesktopSidebar(event.matches);
    };

    setHasDesktopSidebar(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

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

      for (
        let offset = -thumbnailWindowRadius;
        offset <= thumbnailWindowRadius;
        offset += 1
      ) {
        const nextPageIndex = pageIndex + offset;

        if (nextPageIndex >= 0 && nextPageIndex < totalPages) {
          nextPages.add(nextPageIndex);
        }
      }

      for (
        let nextPageIndex = 0;
        nextPageIndex < Math.min(totalPages, thumbnailPinnedPageCount);
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
    [pdfDocument?.numPages, thumbnailPinnedPageCount, thumbnailWindowRadius],
  );

  useEffect(() => {
    viewerStateRef.current = viewerState;
    pendingViewerStateRef.current = viewerState;
    searchQueryRef.current = viewerState.searchQuery;
  }, [viewerState]);

  const flushViewerState = useCallback(() => {
    if (!pdfDocument) {
      return;
    }

    void savePdfViewerState(readerDocument.id, pendingViewerStateRef.current);
  }, [pdfDocument, readerDocument.id]);

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
      pendingFirstPageReadyMetricRef.current = undefined;
      const bootstrapRunId = activeBootstrapRunIdRef.current + 1;
      activeBootstrapRunIdRef.current = bootstrapRunId;

      try {
        const [asset, storedViewerState, nextPdfViewerModule] =
          await Promise.all([
            measurePdfBootstrapPhase("asset-load", bootstrapRunId, () =>
              getDocumentAsset(readerDocument.id),
            ),
            getStoredPdfViewerState(readerDocument.id),
            measurePdfBootstrapPhase("viewer-module-load", bootstrapRunId, () =>
              loadPdfJsViewer(),
            ),
          ]);

        if (!asset || asset.sourceKind !== "pdf") {
          if (!cancelled) {
            setError(
              getLocalizedCopy(locale, {
                en: "The original PDF is not stored on this device. Re-import the PDF locally to use the Standard view.",
                es: "El PDF original no esta guardado en este dispositivo. Importalo otra vez localmente para usar la vista Standard.",
                pt: "O PDF original nao esta salvo neste dispositivo. Importe o PDF novamente localmente para usar a visualizacao Standard.",
              }),
            );
          }
          return;
        }

        const documentLoadStartedAt = getPerfNow();
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
        const loadedPdfDocument = nextPdfDocument;

        recordPdfBootstrapPhase(
          "document-load",
          bootstrapRunId,
          documentLoadStartedAt,
          {
            pageCount: loadedPdfDocument.numPages,
          },
        );
        const [labels, resolvedOutline] = await Promise.all([
          measurePdfBootstrapPhase("page-labels", bootstrapRunId, () =>
            loadedPdfDocument.getPageLabels(),
          ),
          measurePdfBootstrapPhase("outline", bootstrapRunId, () =>
            buildResolvedPdfOutline(loadedPdfDocument),
          ),
        ]);

        if (cancelled) {
          await Promise.resolve(nextPdfDocument.destroy?.());
          return;
        }

        const nextViewerState = sanitizePdfViewerState(
          storedViewerState,
          loadedPdfDocument.numPages,
        );
        pendingFirstPageReadyMetricRef.current = {
          pageNumber: nextViewerState.pageIndex + 1,
          pagesInitRecorded: false,
          runId: bootstrapRunId,
          startedAt: getPerfNow(),
          viewerSetDocumentRecorded: false,
        };

        setPdfViewerModule(nextPdfViewerModule as unknown as PdfViewerModule);
        setPdfDocument(loadedPdfDocument);
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

    const initialViewerState = sanitizePdfViewerState(
      viewerStateRef.current,
      pdfDocument.numPages,
    );
    isViewerReadyRef.current = false;
    pendingPageNumberRef.current = initialViewerState.pageIndex + 1;

    const applyPendingPageNumber = () => {
      const pendingPageNumber = pendingPageNumberRef.current;

      if (!pendingPageNumber) {
        return;
      }

      pdfViewer.currentPageNumber = pendingPageNumber;
      pendingPageNumberRef.current = undefined;
    };

    const handlePagesInit = () => {
      const pendingMetric = pendingFirstPageReadyMetricRef.current;

      if (
        pendingMetric &&
        pendingMetric.runId === activeBootstrapRunIdRef.current &&
        !pendingMetric.pagesInitRecorded
      ) {
        recordPdfBootstrapPhase(
          "pages-init",
          pendingMetric.runId,
          pendingMetric.startedAt,
          {
            pageNumber: pendingMetric.pageNumber,
          },
        );
        pendingMetric.pagesInitRecorded = true;
      }

      isViewerReadyRef.current = true;
      pdfViewer.scrollMode =
        initialViewerState.scrollMode === "single-page"
          ? pdfViewerModule.ScrollMode.PAGE
          : pdfViewerModule.ScrollMode.VERTICAL;
      pdfViewer.pagesRotation = initialViewerState.rotation;
      pdfViewer.currentScaleValue = initialViewerState.zoomValue;
      applyPendingPageNumber();
    };

    const handlePageRendered = (event: { pageNumber?: number }) => {
      const pendingMetric = pendingFirstPageReadyMetricRef.current;
      const renderedPageNumber = Number(event.pageNumber ?? 0);

      if (
        !pendingMetric ||
        pendingMetric.runId !== activeBootstrapRunIdRef.current ||
        !Number.isFinite(renderedPageNumber) ||
        renderedPageNumber !== pendingMetric.pageNumber
      ) {
        return;
      }

      recordPdfBootstrapPhase(
        "first-page-ready",
        pendingMetric.runId,
        pendingMetric.startedAt,
        {
        pageNumber: renderedPageNumber,
        },
      );
      pendingFirstPageReadyMetricRef.current = undefined;
    };

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
    eventBus.on("pagerendered", handlePageRendered);
    eventBus.on("pagesinit", handlePagesInit);
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

    linkService.setViewer(pdfViewer);
    linkService.setDocument(pdfDocument);
    findController.setDocument(pdfDocument);
    pdfViewer.setDocument(pdfDocument);
    pdfViewer.setPageLabels(pageLabels);

    const pendingMetric = pendingFirstPageReadyMetricRef.current;

    if (
      pendingMetric &&
      pendingMetric.runId === activeBootstrapRunIdRef.current &&
      !pendingMetric.viewerSetDocumentRecorded
    ) {
      recordPdfBootstrapPhase(
        "viewer-set-document",
        pendingMetric.runId,
        pendingMetric.startedAt,
        {
          pageNumber: pendingMetric.pageNumber,
        },
      );
      pendingMetric.viewerSetDocumentRecorded = true;
    }

    if (initialViewerState.searchQuery.trim()) {
      dispatchFind(viewerRuntimeRef.current, initialViewerState.searchQuery);
    }

    return () => {
      viewerRuntimeRef.current = null;
      isViewerReadyRef.current = false;
      pendingPageNumberRef.current = undefined;
      pendingFirstPageReadyMetricRef.current = undefined;
      eventBus.off("pagechanging", handlePageChanging);
      eventBus.off("pagerendered", handlePageRendered);
      eventBus.off("pagesinit", handlePagesInit);
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

    if (!isViewerReadyRef.current) {
      pendingPageNumberRef.current = jumpRequest.pageIndex + 1;
      return;
    }

    viewerRuntimeRef.current.pdfViewer.currentPageNumber =
      jumpRequest.pageIndex + 1;
  }, [jumpRequest]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!hasExtractedText) {
      setSelectedPdfText(undefined);
      return;
    }

    const handleSelectionChange = () => {
      setSelectedPdfText(getPdfSelectionText(viewerContainerRef.current));
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [hasExtractedText]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    if (viewerStateSaveTimeoutRef.current !== undefined) {
      window.clearTimeout(viewerStateSaveTimeoutRef.current);
    }

    viewerStateSaveTimeoutRef.current = window.setTimeout(() => {
      flushViewerState();
      viewerStateSaveTimeoutRef.current = undefined;
    }, PDF_VIEWER_STATE_SAVE_DELAY_MS);

    return () => {
      if (viewerStateSaveTimeoutRef.current !== undefined) {
        window.clearTimeout(viewerStateSaveTimeoutRef.current);
      }
    };
  }, [flushViewerState, pdfDocument, viewerState]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (globalThis.document.visibilityState !== "hidden") {
        return;
      }

      if (viewerStateSaveTimeoutRef.current !== undefined) {
        window.clearTimeout(viewerStateSaveTimeoutRef.current);
        viewerStateSaveTimeoutRef.current = undefined;
      }

      flushViewerState();
    };

    const handlePageHide = () => {
      if (viewerStateSaveTimeoutRef.current !== undefined) {
        window.clearTimeout(viewerStateSaveTimeoutRef.current);
        viewerStateSaveTimeoutRef.current = undefined;
      }

      flushViewerState();
    };

    window.addEventListener("pagehide", handlePageHide);
    globalThis.document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      globalThis.document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      if (viewerStateSaveTimeoutRef.current !== undefined) {
        window.clearTimeout(viewerStateSaveTimeoutRef.current);
        viewerStateSaveTimeoutRef.current = undefined;
      }
      flushViewerState();
    };
  }, [flushViewerState]);

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
    setThumbnailRenderCycle(0);
  }, [pageLabels, pdfDocument, viewerState.rotation]);

  useEffect(() => {
    if (!pdfDocument || !shouldEagerlyRenderThumbnails) {
      return;
    }

    requestThumbnailWindow(currentPageIndex);
  }, [
    currentPageIndex,
    pdfDocument,
    requestThumbnailWindow,
    shouldEagerlyRenderThumbnails,
  ]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    const pdfDocumentHandle = pdfDocument;
    const queuedThumbnailPages = requestedThumbnailPages
      .filter(
        (pageIndex) =>
          pageIndex >= 0 &&
          pageIndex < pdfDocumentHandle.numPages &&
          !renderedThumbnailPagesRef.current.has(pageIndex) &&
          !renderingThumbnailPagesRef.current.has(pageIndex),
      )
      .sort((left, right) =>
        compareThumbnailPagePriority(left, right, currentPageIndex),
      );
    const isInitialBatch = renderedThumbnailPagesRef.current.size === 0;
    const effectiveBatchSize = isInitialBatch
      ? Math.min(thumbnailRenderBatchSize, initialThumbnailRenderBatchSize)
      : thumbnailRenderBatchSize;
    const pagesToRender = queuedThumbnailPages.slice(0, effectiveBatchSize);
    const pendingQueueSize = queuedThumbnailPages.length;

    if (pagesToRender.length === 0) {
      return;
    }

    let cancelled = false;

    async function renderThumbnails() {
      await measureAsync(
        "reader.pdf-thumbnail-batch",
        {
          batchSize: pagesToRender.length,
          constrained: isConstrainedPdfMode,
          currentPageIndex,
          isInitialBatch,
          pendingQueueSize,
          rotation: viewerState.rotation,
        },
        async () => {
          for (const [renderIndex, pageIndex] of pagesToRender.entries()) {
            let pageHandle: PdfPageHandle | undefined;

            if (renderIndex > 0 || isConstrainedPdfMode) {
              await yieldToBrowser(
                isConstrainedPdfMode
                  ? PDF_THUMBNAIL_RENDER_DELAY_MS_CONSTRAINED
                  : 0,
              );

              if (cancelled) {
                return;
              }
            }

            renderingThumbnailPagesRef.current.add(pageIndex);

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
        },
      );

      if (!cancelled && pendingQueueSize > pagesToRender.length) {
        setThumbnailRenderCycle((currentCycle) => currentCycle + 1);
      }
    }

    void renderThumbnails();

    return () => {
      cancelled = true;
    };
  }, [
    currentPageIndex,
    isConstrainedPdfMode,
    initialThumbnailRenderBatchSize,
    pageLabels,
    pdfDocument,
    requestedThumbnailPages,
    thumbnailRenderCycle,
    thumbnailRenderBatchSize,
    viewerState.rotation,
  ]);

  const currentPageLabel = useMemo(() => {
    return getPdfPageLabel(currentPageIndex, pageLabels);
  }, [currentPageIndex, pageLabels]);

  useEffect(() => {
    setPageJumpValue(currentPageLabel);
  }, [currentPageLabel]);

  const {
    highlightHelperText,
    highlightNoteLabel,
    highlightNotePlaceholder,
    mobileSidebarClosedLabel,
    mobileSidebarOpenLabel,
    mobileSidebarSummary,
    mobileSidebarToggleLabel,
    saveHighlightLabel,
    searchStatusLabel,
    viewerNotice,
  } = useMemo(
    () =>
      getPdfReaderWorkspaceCopy({
        bookmarksCount: bookmarks.length,
        currentPageLabel,
        findMatches,
        hasExtractedText,
        highlightsCount: highlights.length,
        locale,
        searchQuery: viewerState.searchQuery,
        searchStatus,
        selectedPdfText,
      }),
    [
      bookmarks.length,
      currentPageLabel,
      findMatches,
      hasExtractedText,
      highlights.length,
      locale,
      searchStatus,
      selectedPdfText,
      viewerState.searchQuery,
    ],
  );

  const zoomLabel = useMemo(() => {
    return formatZoomLabel({
      locale,
      zoomPercent,
      zoomValue: viewerState.zoomValue,
    });
  }, [locale, viewerState.zoomValue, zoomPercent]);

  const toolbarButtonClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-400";
  const toolbarChipClass =
    "inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700";
  const toolbarIconButtonClass =
    "rounded-full p-1 transition hover:bg-slate-100";
  const toolbarDropdownClass =
    "absolute top-full left-0 z-20 mt-3 w-[min(19rem,calc(100vw-3rem))] rounded-[1.25rem] border border-slate-300 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)]";
  const closePdfToolsLabel = getLocalizedCopy(locale, {
    en: "Close PDF tools",
    es: "Cerrar herramientas PDF",
    pt: "Fechar ferramentas PDF",
  });
  const closeLabel = getLocalizedCopy(locale, {
    en: "Close",
    es: "Cerrar",
    pt: "Fechar",
  });

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

  const goToPageIndex = useCallback(
    (pageIndex: number) => {
      if (!viewerRuntimeRef.current || !pdfDocument) {
        return;
      }

      const nextPageNumber = Math.max(
        1,
        Math.min(pdfDocument.numPages, pageIndex + 1),
      );

      if (!isViewerReadyRef.current) {
        pendingPageNumberRef.current = nextPageNumber;
        return;
      }

      viewerRuntimeRef.current.pdfViewer.currentPageNumber = nextPageNumber;
      setPageJumpError(undefined);
      setIsMobileSidebarOpen(false);
    },
    [pdfDocument],
  );

  const handlePageJump = useCallback(() => {
    const resolvedPageIndex = resolvePdfPageInput({
      input: pageJumpValue,
      pageCount: pdfDocument?.numPages ?? 0,
      pageLabels,
    });

    if (resolvedPageIndex === null) {
      setPageJumpError(
        getLocalizedCopy(locale, {
          en: "Enter a valid page label or number.",
          es: "Ingresa una pagina o etiqueta valida.",
          pt: "Digite uma pagina ou etiqueta valida.",
        }),
      );
      return;
    }

    goToPageIndex(resolvedPageIndex);
  }, [goToPageIndex, locale, pageJumpValue, pageLabels, pdfDocument?.numPages]);

  const handlePageStep = useCallback(
    (delta: -1 | 1) => {
      if (!pdfDocument) {
        return;
      }

      goToPageIndex(currentPageIndex + delta);
    },
    [currentPageIndex, goToPageIndex, pdfDocument],
  );

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const handleSidebarJumpToOutlineItem = useCallback(
    (outlineItem: PdfOutlineItem) => {
      if (typeof outlineItem.pageIndex === "number") {
        goToPageIndex(outlineItem.pageIndex);
      }
    },
    [goToPageIndex],
  );

  const handleSidebarSaveBookmark = useCallback(() => {
    onSaveBookmark({ pageIndex: currentPageIndex });
  }, [currentPageIndex, onSaveBookmark]);

  const handleSidebarSaveHighlight = useCallback(() => {
    onSaveHighlight({
      pageIndex: currentPageIndex,
      selectionText: getPdfSelectionText(viewerContainerRef.current),
    });
  }, [currentPageIndex, onSaveHighlight]);

  const sidebarProps = {
    bookmarks,
    currentPdfPageIndex: currentPageIndex,
    currentPdfPageLabel: currentPageLabel,
    highlightHelperText,
    highlightNote,
    highlightNoteLabel,
    highlightNotePlaceholder,
    highlights,
    notice: viewerNotice,
    onChangeHighlightNote,
    onDeleteBookmark,
    onDeleteHighlight,
    onJumpToBookmark,
    onJumpToHighlight,
    onJumpToOutlineItem: handleSidebarJumpToOutlineItem,
    onJumpToThumbnail: goToPageIndex,
    onRequestThumbnail: requestThumbnailPage,
    onSaveBookmark: handleSidebarSaveBookmark,
    onSaveHighlight: hasExtractedText ? handleSidebarSaveHighlight : undefined,
    outlineItems,
    pdfThumbnails: thumbnails,
    saveHighlightDisabled: !hasExtractedText,
    saveHighlightLabel,
    showHighlightComposer: hasExtractedText,
  };

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
            en: "The Standard PDF view is unavailable",
            es: "La vista Standard PDF no esta disponible",
            pt: "A visualizacao Standard PDF nao esta disponivel",
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
      <PdfReaderWorkspaceMobileSidebar
        closeLabel={closeLabel}
        closeToolsLabel={closePdfToolsLabel}
        isOpen={isMobileSidebarOpen}
        sidebarClosedLabel={mobileSidebarClosedLabel}
        sidebarOpenLabel={mobileSidebarOpenLabel}
        sidebarSummary={mobileSidebarSummary}
        sidebarToggleLabel={mobileSidebarToggleLabel}
        onClose={closeMobileSidebar}
        onOpen={() => {
          setIsMobileSidebarOpen(true);
        }}
      >
        <PdfReaderWorkspaceSidebar
          {...sidebarProps}
          onClose={closeMobileSidebar}
        />
      </PdfReaderWorkspaceMobileSidebar>

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
                {getLocalizedCopy(locale, pdfReaderModeLabels["pdf-page"])}
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
                        {getLocalizedCopy(locale, pdfReaderModeLabels[mode])}
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
              <input
                value={pageJumpValue}
                onChange={(event) => {
                  setPageJumpValue(event.target.value);
                  setPageJumpError(undefined);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handlePageJump();
                  }
                }}
                aria-label={getLocalizedCopy(locale, {
                  en: "Jump to page",
                  es: "Ir a la pagina",
                  pt: "Ir para a pagina",
                })}
                placeholder={getLocalizedCopy(locale, {
                  en: "Page",
                  es: "Pagina",
                  pt: "Pagina",
                })}
                className="w-18 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handlePageJump}
                className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                {getLocalizedCopy(locale, {
                  en: "Go",
                  es: "Ir",
                  pt: "Ir",
                })}
              </button>
            </div>

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
          {pageJumpError ? (
            <p className="text-sm text-amber-700">{pageJumpError}</p>
          ) : null}
        </div>

        <div className="relative h-[72vh] min-h-120 sm:h-[82vh] sm:min-h-152 lg:h-[86vh]">
          <div
            ref={viewerContainerRef}
            className="absolute inset-0 overflow-auto bg-slate-300/70 px-2 py-4 sm:px-4 sm:py-6"
          >
            <div ref={viewerElementRef} className="pdfViewer" />
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <PdfReaderWorkspaceSidebar {...sidebarProps} />
      </div>
    </section>
  );
}

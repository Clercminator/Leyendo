"use client";

import {
  startTransition,
  useDeferredValue,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChevronDown } from "lucide-react";

import {
  deleteBookmark,
  deleteHighlight,
  getDocumentAsset,
  saveBookmark,
  saveHighlight,
} from "@/db/repositories";
import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { useLocale } from "@/components/layout/locale-provider";
import { PdfReaderWorkspace } from "@/components/reader/pdf-workspace/pdf-reader-workspace";
import { ReaderAdBreakOverlay } from "@/components/reader/reader-ad-break-overlay";
import { ReaderCanvas } from "@/components/reader/canvas/reader-canvas";
import { ReaderWorkspaceMobileSidebar } from "@/components/reader/workspace/reader-workspace-mobile-sidebar";
import { ReaderWorkspaceModeView } from "@/components/reader/workspace/reader-workspace-mode-view";
import { ReaderWorkspaceState } from "@/components/reader/workspace/reader-workspace-state";
import { ReaderSidebar } from "@/components/reader/reader-sidebar";
import {
  formatRemainingTimeAnnouncement,
  formatRemainingTimeLabel,
  mapChunkIndexBetweenChunks,
  rebuildStoredTextDocument,
  resolveReaderCanvasMode,
  shouldPreferLiteralMarkdownForMode,
  shouldSimplifyClassicMarkdown,
} from "@/components/reader/workspace/reader-workspace-helpers";
import { useCloudAnchorSync } from "@/components/reader/use-cloud-anchor-sync";
import { useReaderAdBreaks } from "@/components/reader/use-reader-ad-breaks";
import { useReaderDocument } from "@/components/reader/use-reader-document";
import { useReaderPersistence } from "@/components/reader/use-reader-persistence";
import { useReaderPlayback } from "@/components/reader/use-reader-playback";
import { deriveDocumentComplexityHints } from "@/features/ingest/build/document-complexity-hints";
import {
  clampChunkIndex,
  deriveReaderProgress,
  deriveRuntimeChunks,
  findChunkIndexByToken,
  jumpChunkIndex,
  repeatChunkIndex,
  resolveSessionChunkIndex,
  restartParagraphChunkIndex,
} from "@/features/reader/engine/navigation";
import { deriveRemainingPlaybackMs } from "@/features/reader/engine/timing";
import {
  getMatchingReadingGoal,
} from "@/features/reader/engine/presets";
import {
  resolvePdfSelectionAnchor,
  resolveSourcePageIndexForAnchor,
} from "@/features/reader/pdf/navigation";
import { isCatalogDocumentId, toCatalogOwnerId } from "@/lib/catalog";
import { createDocumentComplexityNotice } from "@/lib/document-complexity";
import { getLocalizedCopy } from "@/lib/locale";
import { recordPerfMetric } from "@/lib/perf/instrumentation";
import { getEffectivePlanTier, hasPlanAccess } from "@/lib/plans";
import { useReaderStore } from "@/state/reader-store";
import type { Chunk, DocumentModel, TextPresentation } from "@/types/document";
import type {
  Bookmark,
  Highlight,
  ReaderMode,
  ReaderPreferences,
} from "@/types/reader";
import {
  MAX_READER_WORDS_PER_MINUTE,
  MIN_READER_WORDS_PER_MINUTE,
  readerModes,
  readerPresets,
} from "@/types/reader";

interface ReaderWorkspaceProps {
  documentId?: string;
  bookmarkId?: string;
  highlightId?: string;
}

const READER_BURST_PREFERENCE_DELAY_MS = 120;

function getPerfNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function ReaderWorkspace({
  documentId,
  bookmarkId,
  highlightId,
}: ReaderWorkspaceProps) {
  const { locale } = useLocale();
  const { profile, syncReaderPreferences, user } = useSupabaseAuth();
  const userId = user?.id;
  const activePlanTier = user ? getEffectivePlanTier(profile) : "basic";
  const isRequestedCatalogDocument = isCatalogDocumentId(documentId);
  const canAccessCatalog = hasPlanAccess(profile, "max");
  const canSyncDocumentState = Boolean(userId && !isRequestedCatalogDocument);
  const localDocumentOwnerId = userId
    ? isRequestedCatalogDocument
      ? toCatalogOwnerId(userId)
      : userId
    : undefined;
  const {
    queueBookmarkDelete,
    queueBookmarkUpsert,
    queueHighlightDelete,
    queueHighlightUpsert,
  } = useCloudAnchorSync({
    userId: canSyncDocumentState ? userId : undefined,
  });
  const currentChunkIndex = useReaderStore(
    (state) => state.currentChunkIndex,
  );
  const isPlaying = useReaderStore((state) => state.isPlaying);
  const preferences = useReaderStore((state) => state.preferences);
  const setActiveDocument = useReaderStore((state) => state.setActiveDocument);
  const setChunkIndex = useReaderStore((state) => state.setChunkIndex);
  const setPlaying = useReaderStore((state) => state.setPlaying);
  const updatePreferences = useReaderStore(
    (state) => state.updatePreferences,
  );
  const [documentModeOverride, setDocumentModeOverride] = useState<
    ReaderMode | undefined
  >(undefined);
  const [highlightNote, setHighlightNote] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pdfAssetState, setPdfAssetState] = useState<
    "unknown" | "present" | "missing"
  >("unknown");
  const [pdfPageJumpRequest, setPdfPageJumpRequest] = useState<
    { nonce: number; pageIndex: number } | undefined
  >();
  const documentComplexityNoticeContentId = useId();
  const [textPresentationOverride, setTextPresentationOverride] = useState<{
    documentId: string | undefined;
    value: TextPresentation | undefined;
  }>({
    documentId: undefined,
    value: undefined,
  });
  const [isDocumentComplexityNoticeExpanded, setIsDocumentComplexityNoticeExpanded] =
    useState(false);
  const hasHydratedSessionRef = useRef(false);
  const lastAnchorTokenRef = useRef<number | undefined>(undefined);
  const liveStatusRegionRef = useRef<HTMLParagraphElement | null>(null);
  const liveStatusTimeoutRef = useRef<number | undefined>(undefined);
  const literalPayloadCacheRef = useRef<{
    source?: DocumentModel;
    literal?: DocumentModel;
  }>({});
  const preferencesRef = useRef(preferences);
  const forcedTextPresentationNoticeRef = useRef<string | undefined>(
    undefined,
  );
  const pendingModeSwitchMetricRef = useRef<
    | {
        from: ReaderMode;
        startedAt: number;
        to: ReaderMode;
      }
    | undefined
  >(undefined);
  const pendingPreferenceMetricRef = useRef<
    | {
        changes: string[];
        startedAt: number;
      }
    | undefined
  >(undefined);
  const queuedPreferenceAnnouncementRef = useRef<string | undefined>(
    undefined,
  );
  const queuedPreferenceChangesRef = useRef<Partial<ReaderPreferences>>({});
  const queuedPreferenceTimeoutRef = useRef<number | undefined>(undefined);
  const {
    document,
    savedSession,
    bookmarks,
    highlights,
    isLoading,
    error,
    prependBookmark,
    removeBookmark,
    prependHighlight,
    removeHighlight,
  } = useReaderDocument({
    canAccessCatalog,
    documentId,
    bookmarkId,
    highlightId,
    setActiveDocument,
    userId,
  });

  const payload = document?.payload;
  const canToggleTextPresentation = Boolean(
    payload?.sourceKind === "markdown" && payload.rawText?.trim().length,
  );
  const preferredTextPresentation = canToggleTextPresentation
    ? ((textPresentationOverride.documentId === document?.id
        ? textPresentationOverride.value
        : undefined) ??
        savedSession?.textPresentation ??
        "clean")
    : undefined;
  const hasExtractedText = Boolean(
    payload && payload.tokens.length > 0 && payload.text.trim().length > 0,
  );
  const canUsePdfPageMode =
    payload?.sourceKind === "pdf" && pdfAssetState === "present";
  const canOpenBrowserPdf =
    payload?.sourceKind === "pdf" && pdfAssetState === "present";
  const availableModes = useMemo<ReaderMode[]>(() => {
    if (canUsePdfPageMode && hasExtractedText) {
      return [...readerModes];
    }

    if (canUsePdfPageMode) {
      return ["pdf-page"];
    }

    return readerModes.filter((mode) => mode !== "pdf-page");
  }, [canUsePdfPageMode, hasExtractedText]);
  const requestedMode = documentModeOverride ?? preferences.mode;

  useEffect(() => {
    if (!document?.id) {
      setDocumentModeOverride(undefined);
      return;
    }

    if (payload?.sourceKind === "pdf" && pdfAssetState === "present") {
      setDocumentModeOverride("pdf-page");
      return;
    }

    setDocumentModeOverride(undefined);
  }, [document?.id, payload?.sourceKind, pdfAssetState]);

  const canvasMode = resolveReaderCanvasMode({
    availableModes,
    requestedMode,
  });
  const isPdfPageMode = canvasMode === "pdf-page";
  const runtimeReaderMode = isPdfPageMode ? "classic-reader" : canvasMode;
  const deferredChunkSize = useDeferredValue(preferences.chunkSize);
  const deferredFocusWindow = useDeferredValue(preferences.focusWindow);
  const runtimeChunkOptions = useMemo(
    () => ({
      mode: runtimeReaderMode,
      chunkSize: deferredChunkSize,
      focusWindow: deferredFocusWindow,
    }),
    [deferredChunkSize, deferredFocusWindow, runtimeReaderMode],
  );
  const getLiteralPayload = useCallback(() => {
    if (!payload || !canToggleTextPresentation) {
      return undefined;
    }

    const cachedLiteralPayload = literalPayloadCacheRef.current;

    if (cachedLiteralPayload.source === payload) {
      return cachedLiteralPayload.literal;
    }

    const nextLiteralPayload = rebuildStoredTextDocument(payload, "plain-text");

    literalPayloadCacheRef.current = {
      source: payload,
      literal: nextLiteralPayload,
    };

    return nextLiteralPayload;
  }, [canToggleTextPresentation, payload]);
  const shouldRestrictMarkdownToLiteral = useMemo(
    () =>
      shouldPreferLiteralMarkdownForMode({
        document: payload,
        mode: runtimeReaderMode,
      }),
    [payload, runtimeReaderMode],
  );
  const availableTextPresentations = useMemo<TextPresentation[]>(() => {
    if (!canToggleTextPresentation) {
      return [];
    }

    return shouldRestrictMarkdownToLiteral ? ["literal"] : ["clean", "literal"];
  }, [canToggleTextPresentation, shouldRestrictMarkdownToLiteral]);
  const textPresentation = canToggleTextPresentation
    ? (availableTextPresentations.includes(preferredTextPresentation ?? "clean")
        ? preferredTextPresentation
        : availableTextPresentations[0])
    : undefined;
  const getPayloadForPresentation = useCallback(
    (presentation: TextPresentation | undefined) => {
      if (!payload) {
        return undefined;
      }

      if (!canToggleTextPresentation || presentation !== "literal") {
        return payload;
      }

      return getLiteralPayload() ?? payload;
    },
    [canToggleTextPresentation, getLiteralPayload, payload],
  );
  const activePayload = useMemo(
    () => getPayloadForPresentation(textPresentation),
    [getPayloadForPresentation, textPresentation],
  );
  const runtimeChunks = useMemo(() => {
    const activePresentationPayload = getPayloadForPresentation(textPresentation);

    if (!activePresentationPayload) {
      return [];
    }

    return deriveRuntimeChunks(activePresentationPayload, runtimeChunkOptions);
  }, [getPayloadForPresentation, runtimeChunkOptions, textPresentation]);
  const canonicalMetricChunks = useMemo(() => {
    if (!payload) {
      return [];
    }

    return deriveRuntimeChunks(payload, 1);
  }, [payload]);
  const resolvedChunkIndex = runtimeChunks.length
    ? clampChunkIndex(runtimeChunks.length, currentChunkIndex)
    : 0;
  const activeChunk = runtimeChunks[resolvedChunkIndex];
  const canonicalMetricChunkIndex = useMemo(() => {
    if (canonicalMetricChunks.length === 0) {
      return 0;
    }

    if (!activeChunk || runtimeChunks.length === 0) {
      return 0;
    }

    return mapChunkIndexBetweenChunks({
      anchorText: activeChunk.text,
      currentChunkIndex: resolvedChunkIndex,
      sourceChunks: runtimeChunks,
      targetChunks: canonicalMetricChunks,
    });
  }, [
    activeChunk,
    canonicalMetricChunks,
    resolvedChunkIndex,
    runtimeChunks,
  ]);
  const currentParagraph =
    activePayload && activeChunk
      ? activePayload.blocks[activeChunk.paragraphIndex]
      : undefined;
  const currentPdfSourcePageIndex = useMemo(() => {
    if (!payload || payload.sourceKind !== "pdf") {
      return null;
    }

    return resolveSourcePageIndexForAnchor(payload, {
      chunkIndex: resolvedChunkIndex,
      paragraphIndex: activeChunk?.paragraphIndex,
      sourcePageIndex: activeChunk?.sourcePageIndex,
      tokenIndex: activeChunk?.anchorTokenIndex,
    });
  }, [
    activeChunk?.anchorTokenIndex,
    activeChunk?.paragraphIndex,
    activeChunk?.sourcePageIndex,
    payload,
    resolvedChunkIndex,
  ]);
  const runtimeChunkIndexBySourcePage = useMemo(() => {
    const chunkIndexByPage = new Map<number, number>();

    runtimeChunks.forEach((runtimeChunk, chunkIndex) => {
      if (
        typeof runtimeChunk.sourcePageIndex !== "number" ||
        chunkIndexByPage.has(runtimeChunk.sourcePageIndex)
      ) {
        return;
      }

      chunkIndexByPage.set(runtimeChunk.sourcePageIndex, chunkIndex);
    });

    return chunkIndexByPage;
  }, [runtimeChunks]);
  const progress = runtimeChunks.length
    ? deriveReaderProgress({ chunks: runtimeChunks }, resolvedChunkIndex)
    : 0;
  const sentenceCount = payload?.sentences.length ?? 0;
  const remainingWords = useMemo(() => {
    if (canonicalMetricChunks.length === 0) {
      return 0;
    }

    const remainingTokenIndexes = new Set<number>();
    const remainingChunkIndex =
      activeChunk && runtimeChunks.length > 0 ? canonicalMetricChunkIndex : 0;

    canonicalMetricChunks.slice(remainingChunkIndex).forEach((runtimeChunk) => {
      runtimeChunk.tokenIndexes.forEach((tokenIndex) => {
        remainingTokenIndexes.add(tokenIndex);
      });
    });

    return remainingTokenIndexes.size;
  }, [activeChunk, canonicalMetricChunkIndex, canonicalMetricChunks, runtimeChunks.length]);
  const remainingTimeMs = useMemo(() => {
    return deriveRemainingPlaybackMs(
      runtimeChunks,
      resolvedChunkIndex,
      {
        ...preferences,
        mode: canvasMode,
      },
    );
  }, [canvasMode, preferences, resolvedChunkIndex, runtimeChunks]);
  const remainingTimeLabel = useMemo(() => {
    return formatRemainingTimeLabel(remainingTimeMs, locale);
  }, [locale, remainingTimeMs]);
  const documentComplexityHints = useMemo(() => {
    if (!payload) {
      return [];
    }

    return (
      payload.complexityHints ??
      deriveDocumentComplexityHints({
        rawText: payload.rawText,
        sourceKind: payload.sourceKind,
      })
    );
  }, [payload]);
  const documentComplexityNotice = useMemo(
    () => createDocumentComplexityNotice(locale, documentComplexityHints),
    [documentComplexityHints, locale],
  );
  useEffect(() => {
    setIsDocumentComplexityNoticeExpanded(false);
  }, [document?.id, documentComplexityNotice?.title]);
  const expandComplexityNoticeLabel = getLocalizedCopy(locale, {
    en: "Expand",
    es: "Expandir",
    pt: "Expandir",
  });
  const collapseComplexityNoticeLabel = getLocalizedCopy(locale, {
    en: "Collapse",
    es: "Colapsar",
    pt: "Recolher",
  });
  const readerModeStatusNotice = useMemo(() => {
    if (payload?.sourceKind === "pdf" && pdfAssetState === "unknown") {
      return {
        description: getLocalizedCopy(locale, {
          en: "This device is still loading the PDF view and extracted text. Available reading modes may settle in a moment.",
          es: "Este dispositivo todavía está cargando la vista PDF y el texto extraído. Los modos de lectura disponibles pueden estabilizarse en un momento.",
          pt: "Este dispositivo ainda esta carregando a visualizacao em PDF e o texto extraido. Os modos de leitura disponiveis podem se estabilizar em instantes.",
        }),
        title: getLocalizedCopy(locale, {
          en: "Preparing this reading view",
          es: "Preparando esta vista de lectura",
          pt: "Preparando esta visualizacao de leitura",
        }),
      };
    }

    if (
      canToggleTextPresentation &&
      preferredTextPresentation === "clean" &&
      textPresentation === "literal" &&
      shouldRestrictMarkdownToLiteral
    ) {
      return {
        description: getLocalizedCopy(locale, {
          en: "Literal Text stays active in this mode so tables, task lists, code, and diagrams remain readable outside Classic Reader.",
          es: "Texto literal sigue activo en este modo para que las tablas, listas de tareas, el código y los diagramas sigan siendo legibles fuera del Lector clásico.",
          pt: "Texto literal permanece ativo neste modo para que tabelas, listas de tarefas, codigo e diagramas sigam legiveis fora do Leitor classico.",
        }),
        title: getLocalizedCopy(locale, {
          en: "Literal Text is active here",
          es: "Texto literal está activo aquí",
          pt: "Texto literal esta ativo aqui",
        }),
      };
    }

    return undefined;
  }, [
    canToggleTextPresentation,
    locale,
    payload?.sourceKind,
    pdfAssetState,
    preferredTextPresentation,
    shouldRestrictMarkdownToLiteral,
    textPresentation,
  ]);
  const simplifyClassicMarkdownPreview = useMemo(
    () => shouldSimplifyClassicMarkdown(activePayload),
    [activePayload],
  );
  const modeLabel = {
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
  }[canvasMode][locale];
  const readerAds = useReaderAdBreaks({
    documentId,
    isPlaying,
    ownerKey: userId ?? "guest",
    planTier: activePlanTier,
    readerMode: canvasMode,
    readerReady: Boolean(activePayload && (activeChunk || isPdfPageMode)),
    setPlaying,
  });

  const getRuntimeChunksForPresentation = useCallback(
    (presentation: TextPresentation | undefined) => {
      const targetPayload = getPayloadForPresentation(presentation);

      if (!targetPayload) {
        return [];
      }

      return deriveRuntimeChunks(targetPayload, runtimeChunkOptions);
    },
    [getPayloadForPresentation, runtimeChunkOptions],
  );

  useReaderPersistence({
    anchorText: activeChunk?.text,
    document,
    activeChunk,
    currentChunkIndex: resolvedChunkIndex,
    isPlaying,
    preferences,
    profileReaderPreferences: profile?.readerPreferences,
    runtimeChunks,
    syncReaderPreferences,
    textPresentation: preferredTextPresentation,
    userId: canSyncDocumentState ? userId : undefined,
    updatePreferences,
  });

  useReaderPlayback({
    activeChunk,
    currentChunkIndex: resolvedChunkIndex,
    isPlaying,
    preferences,
    runtimeChunkCount: runtimeChunks.length,
    setChunkIndex,
    setPlaying,
  });

  useEffect(() => {
    if (document?.sourceKind !== "pdf") {
      return;
    }

    let cancelled = false;

    void (async () => {
      const asset = await getDocumentAsset(document.id);

      if (!cancelled) {
        setPdfAssetState(asset?.sourceKind === "pdf" ? "present" : "missing");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [document?.id, document?.sourceKind]);

  useEffect(() => {
    if (isPdfPageMode && isPlaying) {
      setPlaying(false);
    }
  }, [isPdfPageMode, isPlaying, setPlaying]);

  useEffect(() => {
    if (
      runtimeChunks.length === 0 ||
      !savedSession ||
      hasHydratedSessionRef.current
    ) {
      return;
    }

    const nextIndex = resolveSessionChunkIndex(runtimeChunks, savedSession);
    hasHydratedSessionRef.current = true;
    startTransition(() => {
      setChunkIndex(nextIndex);
    });
  }, [runtimeChunks, savedSession, setChunkIndex]);

  useEffect(() => {
    hasHydratedSessionRef.current = false;
  }, [document?.id]);

  useEffect(() => {
    if (activeChunk) {
      lastAnchorTokenRef.current = activeChunk.anchorTokenIndex;
    }
  }, [activeChunk]);

  useEffect(() => {
    if (!bookmarkId || !isPdfPageMode) {
      return;
    }

    const pageBookmark = bookmarks.find(
      (bookmark) => bookmark.id === bookmarkId,
    );

    if (typeof pageBookmark?.sourcePageIndex !== "number") {
      return;
    }

    const sourcePageIndex = pageBookmark.sourcePageIndex;

    startTransition(() => {
      setPdfPageJumpRequest({
        nonce: Date.now(),
        pageIndex: sourcePageIndex,
      });
    });
  }, [bookmarkId, bookmarks, isPdfPageMode]);

  useEffect(() => {
    if (runtimeChunks.length === 0) {
      return;
    }

    const anchorTokenIndex = lastAnchorTokenRef.current;
    if (anchorTokenIndex === undefined) {
      return;
    }

    const nextIndex = resolveSessionChunkIndex(runtimeChunks, {
      currentChunkIndex: resolvedChunkIndex,
      currentTokenIndex: anchorTokenIndex,
    });

    if (nextIndex === currentChunkIndex) {
      return;
    }

    startTransition(() => {
      setChunkIndex(nextIndex);
    });
  }, [
    currentChunkIndex,
    deferredChunkSize,
    deferredFocusWindow,
    preferences.mode,
    resolvedChunkIndex,
    runtimeChunks,
    setChunkIndex,
  ]);

  const moveToChunk = useCallback(
    (nextIndex: number) => {
      if (runtimeChunks.length === 0) {
        return;
      }

      const bounded = Math.max(
        0,
        Math.min(nextIndex, runtimeChunks.length - 1),
      );
      startTransition(() => {
        setChunkIndex(bounded);
      });
    },
    [runtimeChunks.length, setChunkIndex],
  );

  const announce = useCallback((message: string) => {
    const liveRegion = liveStatusRegionRef.current;

    if (!liveRegion || typeof window === "undefined") {
      return;
    }

    liveRegion.textContent = "";

    if (liveStatusTimeoutRef.current !== undefined) {
      window.clearTimeout(liveStatusTimeoutRef.current);
    }

    liveStatusTimeoutRef.current = window.setTimeout(() => {
      if (liveStatusRegionRef.current) {
        liveStatusRegionRef.current.textContent = message;
      }

      liveStatusTimeoutRef.current = undefined;
    }, 0);
  }, []);

  useEffect(() => {
    const noticeSignature =
      canToggleTextPresentation &&
      preferredTextPresentation === "clean" &&
      textPresentation === "literal" &&
      shouldRestrictMarkdownToLiteral &&
      document?.id
        ? `${document.id}:${preferences.mode}`
        : undefined;

    if (!noticeSignature) {
      forcedTextPresentationNoticeRef.current = undefined;
      return;
    }

    if (forcedTextPresentationNoticeRef.current === noticeSignature) {
      return;
    }

    forcedTextPresentationNoticeRef.current = noticeSignature;
    announce(
      "Literal text view is active in this reading mode so tables, task markers, code, and diagrams stay readable. Switch to Classic Reader for rich Markdown rendering.",
    );
  }, [
    announce,
    canToggleTextPresentation,
    document?.id,
    preferredTextPresentation,
    preferences.mode,
    shouldRestrictMarkdownToLiteral,
    textPresentation,
  ]);

  const applyPreferenceChanges = useCallback(
    (changes: Partial<ReaderPreferences>) => {
      const nextPreferences = {
        ...preferencesRef.current,
        ...changes,
      };

      pendingPreferenceMetricRef.current = {
        changes: Object.keys(changes).sort(),
        startedAt: getPerfNow(),
      };

      updatePreferences({
        ...changes,
        readingGoal: getMatchingReadingGoal(nextPreferences),
      });
    },
    [updatePreferences],
  );

  const flushQueuedPreferenceChanges = useCallback(() => {
    const queuedChanges = queuedPreferenceChangesRef.current;

    if (Object.keys(queuedChanges).length === 0) {
      return;
    }

    queuedPreferenceChangesRef.current = {};
    const queuedAnnouncement = queuedPreferenceAnnouncementRef.current;
    queuedPreferenceAnnouncementRef.current = undefined;

    if (queuedPreferenceTimeoutRef.current !== undefined) {
      window.clearTimeout(queuedPreferenceTimeoutRef.current);
      queuedPreferenceTimeoutRef.current = undefined;
    }

    applyPreferenceChanges(queuedChanges);

    if (queuedAnnouncement) {
      announce(queuedAnnouncement);
    }
  }, [announce, applyPreferenceChanges]);

  const queueBurstPreferenceChanges = useCallback(
    (changes: Partial<ReaderPreferences>, announcement: string) => {
      if (typeof window === "undefined") {
        applyPreferenceChanges(changes);
        announce(announcement);
        return;
      }

      queuedPreferenceChangesRef.current = {
        ...queuedPreferenceChangesRef.current,
        ...changes,
      };
      queuedPreferenceAnnouncementRef.current = announcement;

      if (queuedPreferenceTimeoutRef.current !== undefined) {
        window.clearTimeout(queuedPreferenceTimeoutRef.current);
      }

      queuedPreferenceTimeoutRef.current = window.setTimeout(() => {
        flushQueuedPreferenceChanges();
      }, READER_BURST_PREFERENCE_DELAY_MS);
    },
    [announce, applyPreferenceChanges, flushQueuedPreferenceChanges],
  );

  const getQueuedPreferenceValue = useCallback(
    <Key extends keyof ReaderPreferences>(key: Key) => {
      const queuedPreferenceValue = queuedPreferenceChangesRef.current[key];

      return (queuedPreferenceValue ?? preferencesRef.current[key]) as ReaderPreferences[Key];
    },
    [],
  );

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    return () => {
      if (queuedPreferenceTimeoutRef.current !== undefined) {
        window.clearTimeout(queuedPreferenceTimeoutRef.current);
        queuedPreferenceTimeoutRef.current = undefined;
      }

      if (Object.keys(queuedPreferenceChangesRef.current).length > 0) {
        applyPreferenceChanges(queuedPreferenceChangesRef.current);
        queuedPreferenceChangesRef.current = {};
        queuedPreferenceAnnouncementRef.current = undefined;
      }
    };
  }, [applyPreferenceChanges]);

  useEffect(() => {
    const pendingPreferenceMetric = pendingPreferenceMetricRef.current;

    if (!pendingPreferenceMetric) {
      return;
    }

    pendingPreferenceMetricRef.current = undefined;
    recordPerfMetric({
      name: "reader.preference-apply",
      durationMs: Math.round(getPerfNow() - pendingPreferenceMetric.startedAt),
      timestamp: Date.now(),
      detail: {
        changes: pendingPreferenceMetric.changes.join(","),
        mode: preferences.mode,
      },
    });
  }, [preferences]);

  useEffect(() => {
    const pendingModeSwitchMetric = pendingModeSwitchMetricRef.current;

    if (!pendingModeSwitchMetric || pendingModeSwitchMetric.to !== canvasMode) {
      return;
    }

    pendingModeSwitchMetricRef.current = undefined;
    recordPerfMetric({
      name: "reader.mode-switch",
      durationMs: Math.round(getPerfNow() - pendingModeSwitchMetric.startedAt),
      timestamp: Date.now(),
      detail: {
        from: pendingModeSwitchMetric.from,
        to: pendingModeSwitchMetric.to,
      },
    });
  }, [canvasMode]);

  useEffect(() => {
    return () => {
      if (liveStatusTimeoutRef.current !== undefined) {
        window.clearTimeout(liveStatusTimeoutRef.current);
      }
    };
  }, []);

  const announceRemainingTime = useCallback(() => {
    announce(
      formatRemainingTimeAnnouncement({
        locale,
        modeLabel,
        remainingMs: remainingTimeMs,
        remainingWords,
        wordsPerMinute: preferences.wordsPerMinute,
      }),
    );
  }, [
    announce,
    locale,
    preferences.wordsPerMinute,
    remainingTimeMs,
    remainingWords,
    modeLabel,
  ]);

  const changeWordsPerMinute = useCallback(
    (delta: number) => {
      const nextWordsPerMinute = Math.max(
        MIN_READER_WORDS_PER_MINUTE,
        Math.min(
          MAX_READER_WORDS_PER_MINUTE,
          getQueuedPreferenceValue("wordsPerMinute") + delta,
        ),
      );
      queueBurstPreferenceChanges(
        { wordsPerMinute: nextWordsPerMinute },
        `Reading speed set to ${nextWordsPerMinute} words per minute.`,
      );
    },
    [getQueuedPreferenceValue, queueBurstPreferenceChanges],
  );

  const handleSaveBookmark = useCallback(async () => {
    if (!document || !activeChunk) {
      return;
    }

    const bookmark = await saveBookmark({
      documentId: document.id,
      label: `Bookmark ${bookmarks.length + 1}`,
      ownerId: localDocumentOwnerId,
      chunkIndex: resolvedChunkIndex,
      tokenIndex: activeChunk.anchorTokenIndex,
      paragraphIndex: activeChunk.paragraphIndex,
      sectionIndex: activeChunk.sectionIndex,
      anchorText: activeChunk.text,
      syncState: canSyncDocumentState ? "local-only" : undefined,
      textPresentation,
    });

    prependBookmark(bookmark);
    if (canSyncDocumentState) {
      queueBookmarkUpsert(bookmark);
    }
    announce(`${bookmark.label} saved.`);
  }, [
    activeChunk,
    announce,
    bookmarks.length,
    document,
    prependBookmark,
    queueBookmarkUpsert,
    resolvedChunkIndex,
    textPresentation,
    canSyncDocumentState,
    localDocumentOwnerId,
  ]);

  const handleSavePdfBookmark = useCallback(
    async ({ pageIndex }: { pageIndex: number }) => {
      if (!document || !payload) {
        return;
      }

      const chunkIndexForPage = runtimeChunks.findIndex(
        (runtimeChunk) => runtimeChunk.sourcePageIndex === pageIndex,
      );
      const resolvedIndex =
        chunkIndexForPage >= 0 ? chunkIndexForPage : resolvedChunkIndex;
      const anchorChunk = runtimeChunks[resolvedIndex];
      const isPageOnlyBookmark = !anchorChunk;

      const bookmark = await saveBookmark({
        documentId: document.id,
        label: `Bookmark ${bookmarks.length + 1}`,
        ownerId: localDocumentOwnerId,
        chunkIndex: isPageOnlyBookmark ? -1 : resolvedIndex,
        tokenIndex: isPageOnlyBookmark ? -1 : anchorChunk.anchorTokenIndex,
        paragraphIndex: isPageOnlyBookmark ? -1 : anchorChunk.paragraphIndex,
        sectionIndex: isPageOnlyBookmark ? -1 : anchorChunk.sectionIndex,
        sourcePageIndex: pageIndex,
        syncState: canSyncDocumentState ? "local-only" : undefined,
      });

      prependBookmark(bookmark);
      if (canSyncDocumentState) {
        queueBookmarkUpsert(bookmark);
      }

      announce(
        isPageOnlyBookmark
          ? `${bookmark.label} saved on page ${pageIndex + 1}.`
          : `${bookmark.label} saved.`,
      );
    },
    [
      announce,
      bookmarks.length,
      document,
      payload,
      prependBookmark,
      queueBookmarkUpsert,
      resolvedChunkIndex,
      runtimeChunks,
      canSyncDocumentState,
      localDocumentOwnerId,
    ],
  );

  const handleSaveHighlight = useCallback(async () => {
    if (!document || !activeChunk) {
      return;
    }

    const highlight = await saveHighlight({
      documentId: document.id,
      label: `Highlight ${highlights.length + 1}`,
      ownerId: localDocumentOwnerId,
      quote: activeChunk.text,
      note: highlightNote.trim() || undefined,
      chunkIndex: resolvedChunkIndex,
      tokenIndex: activeChunk.anchorTokenIndex,
      paragraphIndex: activeChunk.paragraphIndex,
      sectionIndex: activeChunk.sectionIndex,
      syncState: canSyncDocumentState ? "local-only" : undefined,
      textPresentation,
    });

    prependHighlight(highlight);
    if (canSyncDocumentState) {
      queueHighlightUpsert(highlight);
    }
    setHighlightNote("");
    announce(`${highlight.label} saved.`);
  }, [
    activeChunk,
    announce,
    document,
    highlightNote,
    highlights.length,
    prependHighlight,
    queueHighlightUpsert,
    resolvedChunkIndex,
    textPresentation,
    canSyncDocumentState,
    localDocumentOwnerId,
  ]);

  const handleSavePdfHighlight = useCallback(
    async (args: {
      pageIndex: number;
      selectionPrefixText?: string;
      selectionText?: string;
      selectionSuffixText?: string;
    }) => {
      if (!document || !payload || runtimeChunks.length === 0) {
        return;
      }

      const selectionText = args.selectionText?.trim();
      const preferredTokenIndex =
        runtimeChunks[resolvedChunkIndex]?.sourcePageIndex === args.pageIndex
          ? runtimeChunks[resolvedChunkIndex]?.anchorTokenIndex
          : runtimeChunkIndexBySourcePage.get(args.pageIndex) !== undefined
            ? runtimeChunks[runtimeChunkIndexBySourcePage.get(args.pageIndex) ?? -1]
                ?.anchorTokenIndex
            : undefined;
      const resolvedAnchor = selectionText
        ? resolvePdfSelectionAnchor({
            document: payload,
            pageIndex: args.pageIndex,
            preferredTokenIndex,
            prefixText: args.selectionPrefixText,
            quote: selectionText,
            suffixText: args.selectionSuffixText,
          })
        : null;
      const chunkIndexForSelection = resolvedAnchor
        ? resolveSessionChunkIndex(runtimeChunks, {
            currentChunkIndex: resolvedChunkIndex,
            currentTokenIndex: resolvedAnchor.tokenIndex,
          })
        : runtimeChunks.findIndex(
            (runtimeChunk) => runtimeChunk.sourcePageIndex === args.pageIndex,
          );
      const resolvedIndex =
        chunkIndexForSelection >= 0
          ? chunkIndexForSelection
          : resolvedChunkIndex;
      const anchorChunk = runtimeChunks[resolvedIndex];

      if (!anchorChunk) {
        return;
      }

      const highlight = await saveHighlight({
        documentId: document.id,
        label: `Highlight ${highlights.length + 1}`,
        ownerId: localDocumentOwnerId,
        quote: selectionText || anchorChunk.text,
        note: highlightNote.trim() || undefined,
        chunkIndex: resolvedIndex,
        tokenIndex: resolvedAnchor?.tokenIndex ?? anchorChunk.anchorTokenIndex,
        paragraphIndex:
          resolvedAnchor?.paragraphIndex ?? anchorChunk.paragraphIndex,
        sectionIndex: resolvedAnchor?.sectionIndex ?? anchorChunk.sectionIndex,
        sourcePageIndex: resolvedAnchor?.sourcePageIndex ?? args.pageIndex,
        syncState: canSyncDocumentState ? "local-only" : undefined,
      });

      prependHighlight(highlight);
      if (canSyncDocumentState) {
        queueHighlightUpsert(highlight);
      }
      setHighlightNote("");
      announce(`${highlight.label} saved.`);
    },
    [
      announce,
      document,
      highlightNote,
      highlights.length,
      payload,
      prependHighlight,
      queueHighlightUpsert,
      resolvedChunkIndex,
      runtimeChunkIndexBySourcePage,
      runtimeChunks,
      canSyncDocumentState,
      localDocumentOwnerId,
    ],
  );

  const handleDeleteBookmark = useCallback(
    async (bookmarkIdToDelete: string) => {
      if (canSyncDocumentState) {
        await queueBookmarkDelete(bookmarkIdToDelete);
      }

      await deleteBookmark(bookmarkIdToDelete);
      removeBookmark(bookmarkIdToDelete);
      announce("Bookmark deleted.");
    },
    [announce, canSyncDocumentState, queueBookmarkDelete, removeBookmark],
  );

  const handleDeleteHighlight = useCallback(
    async (highlightIdToDelete: string) => {
      if (canSyncDocumentState) {
        await queueHighlightDelete(highlightIdToDelete);
      }

      await deleteHighlight(highlightIdToDelete);
      removeHighlight(highlightIdToDelete);
      announce("Highlight deleted.");
    },
    [announce, canSyncDocumentState, queueHighlightDelete, removeHighlight],
  );

  const jumpToAnchor = useCallback(
    (anchor: {
      anchorText?: string;
      chunkIndex: number;
      paragraphIndex?: number;
      quote?: string;
      sourcePageIndex?: number;
      textPresentation?: TextPresentation;
      tokenIndex: number;
    }) => {
      const anchorPresentation = canToggleTextPresentation
        ? (anchor.textPresentation ?? textPresentation ?? "clean")
        : undefined;
      const targetChunks = getRuntimeChunksForPresentation(textPresentation);
      const nextChunkIndex =
        canToggleTextPresentation && anchorPresentation !== textPresentation
          ? mapChunkIndexBetweenChunks({
              anchorText: anchor.anchorText ?? anchor.quote,
              currentChunkIndex: anchor.chunkIndex,
              sourceChunks: getRuntimeChunksForPresentation(anchorPresentation),
              targetChunks,
            })
          : resolveSessionChunkIndex(targetChunks, {
              currentChunkIndex: anchor.chunkIndex,
              currentTokenIndex: anchor.tokenIndex,
            });

      moveToChunk(nextChunkIndex);

      if (!isPdfPageMode || !payload) {
        return;
      }

      const pageIndex = resolveSourcePageIndexForAnchor(payload, anchor);
      if (typeof pageIndex === "number") {
        setPdfPageJumpRequest({ nonce: Date.now(), pageIndex });
      }
    },
    [
      canToggleTextPresentation,
      getRuntimeChunksForPresentation,
      isPdfPageMode,
      moveToChunk,
      payload,
      textPresentation,
    ],
  );

  const jumpToBookmark = useCallback(
    (
      bookmark: Pick<
        Bookmark,
        | "anchorText"
        | "chunkIndex"
        | "label"
        | "sourcePageIndex"
        | "textPresentation"
        | "tokenIndex"
      >,
    ) => {
      if (
        typeof bookmark.sourcePageIndex === "number" &&
        (runtimeChunks.length === 0 || bookmark.chunkIndex < 0)
      ) {
        if (isPdfPageMode) {
          setPdfPageJumpRequest({
            nonce: Date.now(),
            pageIndex: bookmark.sourcePageIndex,
          });
        }

        announce(`${bookmark.label} loaded.`);
        return;
      }

      jumpToAnchor(bookmark);
      announce(`${bookmark.label} loaded.`);
    },
    [announce, isPdfPageMode, jumpToAnchor, runtimeChunks.length],
  );

  const jumpToHighlight = useCallback(
    (
      highlight: Pick<
        Highlight,
        | "chunkIndex"
        | "label"
        | "paragraphIndex"
        | "quote"
        | "sourcePageIndex"
        | "textPresentation"
        | "tokenIndex"
      >,
    ) => {
      jumpToAnchor(highlight);
      announce(`${highlight.label} loaded.`);
    },
    [announce, jumpToAnchor],
  );

  const jumpToToken = useCallback(
    (tokenIndex: number) => {
      const nextChunkIndex = findChunkIndexByToken(runtimeChunks, tokenIndex);
      jumpToAnchor({ chunkIndex: nextChunkIndex, tokenIndex });
    },
    [jumpToAnchor, runtimeChunks],
  );

  const handleTextPresentationSelection = useCallback(
    (nextPresentation: TextPresentation) => {
      if (!canToggleTextPresentation || runtimeChunks.length === 0) {
        return;
      }

      if (!availableTextPresentations.includes(nextPresentation)) {
        announce(
          "This reading mode keeps complex Markdown in literal text so layout-sensitive content stays readable. Switch to Classic Reader for rich Markdown rendering.",
        );
        return;
      }

      if (textPresentation === nextPresentation) {
        return;
      }

      const targetChunks = getRuntimeChunksForPresentation(nextPresentation);
      const nextChunkIndex = mapChunkIndexBetweenChunks({
        anchorText: activeChunk?.text,
        currentChunkIndex: resolvedChunkIndex,
        sourceChunks: runtimeChunks,
        targetChunks,
      });

      setTextPresentationOverride({
        documentId: document?.id,
        value: nextPresentation,
      });
      startTransition(() => {
        setChunkIndex(nextChunkIndex);
      });
      announce(
        nextPresentation === "literal"
          ? "Literal text view enabled."
          : "Clean Markdown view enabled.",
      );
    },
    [
      activeChunk?.text,
      announce,
      availableTextPresentations,
      canToggleTextPresentation,
      document?.id,
      getRuntimeChunksForPresentation,
      resolvedChunkIndex,
      runtimeChunks,
      setChunkIndex,
      setTextPresentationOverride,
      textPresentation,
    ],
  );
  const activeGoalLabel = preferences.readingGoal
    ? {
        "study-carefully": {
          en: "Study carefully",
          es: "Estudiar con calma",
          pt: "Estudar com calma",
        },
        "read-faster": {
          en: "Read faster",
          es: "Leer más rápido",
          pt: "Ler mais rapido",
        },
        "skim-overview": {
          en: "Skim for overview",
          es: "Vista general",
          pt: "Ler por panorama",
        },
        "practice-focus": {
          en: "Practice focus",
          es: "Practicar concentración",
          pt: "Praticar foco",
        },
      }[preferences.readingGoal][locale]
    : undefined;
  const modeView = useMemo(
    () => (
      <ReaderWorkspaceModeView
        activeChunk={activeChunk}
        activePayload={activePayload}
        canvasMode={canvasMode}
        focusWindow={deferredFocusWindow}
        reduceMotion={preferences.reduceMotion}
        runtimeChunks={runtimeChunks}
        simplifyClassicMarkdownPreview={simplifyClassicMarkdownPreview}
        onJumpToToken={jumpToToken}
      />
    ),
    [
      activeChunk,
      activePayload,
      canvasMode,
      deferredFocusWindow,
      jumpToToken,
      preferences.reduceMotion,
      runtimeChunks,
      simplifyClassicMarkdownPreview,
    ],
  );
  const sidebarToggleLabel = getLocalizedCopy(locale, {
    en: "Notes, highlights, and bookmarks",
    es: "Notas, destacados y marcadores",
    pt: "Notas, destaques e marcadores",
  });
  const sidebarOpenLabel = getLocalizedCopy(locale, {
    en: "Hide",
    es: "Ocultar",
    pt: "Ocultar",
  });
  const sidebarClosedLabel = getLocalizedCopy(locale, {
    en: "Show",
    es: "Mostrar",
    pt: "Mostrar",
  });
  const sidebarSummary = getLocalizedCopy(locale, {
    en: `${highlights.length} highlights · ${bookmarks.length} bookmarks`,
    es: `${highlights.length} destacados · ${bookmarks.length} marcadores`,
    pt: `${highlights.length} destaques · ${bookmarks.length} marcadores`,
  });
  const sidebarProps = {
    bookmarks,
    highlightNote,
    highlights,
    onChangeHighlightNote: setHighlightNote,
    onDeleteBookmark: (bookmarkIdToDelete: string) => {
      void handleDeleteBookmark(bookmarkIdToDelete);
    },
    onDeleteHighlight: (highlightIdToDelete: string) => {
      void handleDeleteHighlight(highlightIdToDelete);
    },
    onJumpToBookmark: jumpToBookmark,
    onJumpToHighlight: jumpToHighlight,
  };
  const mobileSidebarSection = isPdfPageMode ? null : (
    <ReaderWorkspaceMobileSidebar
      isOpen={isMobileSidebarOpen}
      sidebarClosedLabel={sidebarClosedLabel}
      sidebarOpenLabel={sidebarOpenLabel}
      sidebarSummary={sidebarSummary}
      sidebarToggleLabel={sidebarToggleLabel}
      onToggle={() => {
        setIsMobileSidebarOpen((currentValue) => !currentValue);
      }}
    >
      <ReaderSidebar {...sidebarProps} />
    </ReaderWorkspaceMobileSidebar>
  );

  const handleModeSelection = useCallback(
    (mode: ReaderPreferences["mode"]) => {
      flushQueuedPreferenceChanges();
      pendingModeSwitchMetricRef.current = {
        from: canvasMode,
        startedAt: getPerfNow(),
        to: mode,
      };

      setDocumentModeOverride(canUsePdfPageMode ? mode : undefined);
      applyPreferenceChanges({ mode });
      announce(
        `Reading mode set to ${mode
          .split("-")
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(" ")}.`,
      );
    },
      [
        announce,
        applyPreferenceChanges,
        canUsePdfPageMode,
        canvasMode,
        flushQueuedPreferenceChanges,
      ],
  );

  const handleOpenBrowserPdf = useCallback(
    ({ pageIndex }: { pageIndex?: number }) => {
      if (!document || document.sourceKind !== "pdf") {
        return;
      }

      if (typeof window === "undefined") {
        return;
      }

      const browserPdfUrl = new URL("/browser-pdf", window.location.origin);
      browserPdfUrl.searchParams.set("document", document.id);

      if (typeof pageIndex === "number") {
        browserPdfUrl.searchParams.set("page", String(pageIndex + 1));
      }

      const browserWindow = window.open(browserPdfUrl.toString(), "_blank");

      if (!browserWindow) {
        announce(
          getLocalizedCopy(locale, {
            en: "The browser blocked the new tab for this PDF.",
            es: "El navegador bloqueo la nueva pestana para este PDF.",
            pt: "O navegador bloqueou a nova aba para este PDF.",
          }),
        );
        return;
      }

      browserWindow.opener = null;
      announce(
        getLocalizedCopy(locale, {
          en:
            typeof pageIndex === "number"
              ? `Opening the original PDF on page ${pageIndex + 1} in a new tab.`
              : "Opening the original PDF in a new tab.",
          es:
            typeof pageIndex === "number"
              ? `Abriendo el PDF original en la pagina ${pageIndex + 1} en una nueva pestana.`
              : "Abriendo el PDF original en una nueva pestana.",
          pt:
            typeof pageIndex === "number"
              ? `Abrindo o PDF original na pagina ${pageIndex + 1} em uma nova aba.`
              : "Abrindo o PDF original em uma nova aba.",
        }),
      );
    },
    [announce, document, locale],
  );

  const handleReadPdfPageInClassic = useCallback(
    (pageIndex: number) => {
      const chunkIndexForPage = runtimeChunkIndexBySourcePage.get(pageIndex);

      if (
        typeof chunkIndexForPage === "number" &&
        chunkIndexForPage >= 0 &&
        chunkIndexForPage !== resolvedChunkIndex
      ) {
        startTransition(() => {
          setChunkIndex(chunkIndexForPage);
        });
      }

      handleModeSelection("classic-reader");
    },
    [
      handleModeSelection,
      resolvedChunkIndex,
      runtimeChunkIndexBySourcePage,
      setChunkIndex,
    ],
  );

  const handleReturnToOriginalPdfPage = useCallback(() => {
    void handleOpenBrowserPdf({
      pageIndex:
        typeof currentPdfSourcePageIndex === "number"
          ? currentPdfSourcePageIndex
          : undefined,
    });
  }, [currentPdfSourcePageIndex, handleOpenBrowserPdf]);

  const handleDecreaseChunkSize = useCallback(() => {
      const nextChunkSize = Math.max(1, getQueuedPreferenceValue("chunkSize") - 1);
      queueBurstPreferenceChanges(
        { chunkSize: nextChunkSize },
        `Chunk size set to ${nextChunkSize} ${nextChunkSize === 1 ? "word" : "words"}.`,
    );
    }, [getQueuedPreferenceValue, queueBurstPreferenceChanges]);

  const handleIncreaseChunkSize = useCallback(() => {
      const nextChunkSize = Math.min(6, getQueuedPreferenceValue("chunkSize") + 1);
      queueBurstPreferenceChanges(
        { chunkSize: nextChunkSize },
        `Chunk size set to ${nextChunkSize} words.`,
      );
    }, [getQueuedPreferenceValue, queueBurstPreferenceChanges]);

  const handleFontScaleChange = useCallback(
    (delta: number) => {
      const nextFontScale =
        delta > 0
            ? Math.min(
                1.8,
                Number((getQueuedPreferenceValue("fontScale") + delta).toFixed(1)),
              )
            : Math.max(
                0.8,
                Number((getQueuedPreferenceValue("fontScale") + delta).toFixed(1)),
              );
        queueBurstPreferenceChanges(
          { fontScale: nextFontScale },
          `Font scale set to ${nextFontScale.toFixed(1)} times.`,
        );
    },
      [getQueuedPreferenceValue, queueBurstPreferenceChanges],
  );

  const handleLineHeightChange = useCallback(
    (delta: number) => {
      const nextLineHeight =
        delta > 0
            ? Math.min(
                2.2,
                Number((getQueuedPreferenceValue("lineHeight") + delta).toFixed(1)),
              )
            : Math.max(
                1.2,
                Number((getQueuedPreferenceValue("lineHeight") + delta).toFixed(1)),
              );
        queueBurstPreferenceChanges(
          { lineHeight: nextLineHeight },
          `Line height set to ${nextLineHeight.toFixed(1)}.`,
        );
    },
      [getQueuedPreferenceValue, queueBurstPreferenceChanges],
  );

  const handlePresetSelection = useCallback(
    (presetId: (typeof readerPresets)[number]["id"]) => {
        flushQueuedPreferenceChanges();
      const preset = readerPresets.find((entry) => entry.id === presetId);
      if (!preset) {
        return;
      }

      applyPreferenceChanges({
        mode: preset.mode,
        wordsPerMinute: preset.wordsPerMinute,
        chunkSize: preset.chunkSize,
        focusWindow: preset.focusWindow,
        naturalPauses: preset.naturalPauses,
        smartPacing: preset.smartPacing,
        reduceMotion: preset.reduceMotion,
      });
      announce(`${preset.label} preset applied.`);
    },
    [announce, applyPreferenceChanges, flushQueuedPreferenceChanges],
  );

  const handleThemeSelection = useCallback(
    (theme: ReaderPreferences["theme"]) => {
      flushQueuedPreferenceChanges();
      applyPreferenceChanges({ theme });
      announce(`${theme.replace(/-/g, " ")} theme selected.`);
    },
    [announce, applyPreferenceChanges, flushQueuedPreferenceChanges],
  );

  const handleNaturalPausesToggle = useCallback(() => {
    flushQueuedPreferenceChanges();
    applyPreferenceChanges({ naturalPauses: !preferences.naturalPauses });
    announce(
      preferences.naturalPauses
        ? "Natural pauses disabled."
        : "Natural pauses enabled.",
    );
  }, [
    announce,
    applyPreferenceChanges,
    flushQueuedPreferenceChanges,
    preferences.naturalPauses,
  ]);

  const handleReduceMotionToggle = useCallback(() => {
    flushQueuedPreferenceChanges();
    applyPreferenceChanges({ reduceMotion: !preferences.reduceMotion });
    announce(
      preferences.reduceMotion
        ? "Reduced motion disabled."
        : "Reduced motion enabled.",
    );
  }, [
    announce,
    applyPreferenceChanges,
    flushQueuedPreferenceChanges,
    preferences.reduceMotion,
  ]);

  const handlePlaybackToggle = useCallback(() => {
    if (isPdfPageMode) {
      return;
    }

    if (!activeChunk) {
      return;
    }

    setPlaying(!isPlaying);
    announce(isPlaying ? "Playback paused." : "Playback resumed.");
  }, [activeChunk, announce, isPdfPageMode, isPlaying, setPlaying]);

  const lastAnnouncedAdPhaseRef = useRef<typeof readerAds.phase | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!readerAds.shouldRender) {
      lastAnnouncedAdPhaseRef.current = undefined;
      return;
    }

    if (readerAds.phase === "idle") {
      lastAnnouncedAdPhaseRef.current = readerAds.phase;
      return;
    }

    if (lastAnnouncedAdPhaseRef.current === readerAds.phase) {
      return;
    }

    lastAnnouncedAdPhaseRef.current = readerAds.phase;

    if (readerAds.phase === "playing") {
      announce(
        locale === "en"
          ? "Sponsor break in progress. The reader will unlock automatically when it finishes."
          : locale === "es"
            ? "Patrocinio en reproducción. El lector se desbloqueará automáticamente cuando termine."
            : "Patrocinio em reproducao. O leitor sera liberado automaticamente quando terminar.",
      );
      return;
    }

    if (readerAds.phase === "loading") {
      announce(
        locale === "en"
          ? "Loading sponsor break."
          : locale === "es"
            ? "Cargando patrocinio."
            : "Carregando patrocinio.",
      );
    }
  }, [announce, locale, readerAds.phase, readerAds.shouldRender]);

  if (!documentId) {
    return (
      <ReaderWorkspaceState
        actionHref="/#upload-panel"
        actionLabel={
          locale === "en"
            ? "Import a document"
            : locale === "es"
              ? "Importar documento"
              : "Importar documento"
        }
        description={
          locale === "en"
            ? "Import a PDF, DOCX, RTF, Markdown, TXT, or pasted text from the home page. Leyendo will open it here with local progress, bookmarks, and highlights."
            : locale === "es"
              ? "Importa un PDF, DOCX, RTF, Markdown, TXT o texto pegado desde la página principal. Leyendo lo abrirá aquí con progreso, marcadores y destacados locales."
              : "Importe um PDF, DOCX, RTF, Markdown, TXT ou texto colado pela pagina inicial. Leyendo vai abrir aqui com progresso, marcadores e destaques locais."
        }
        eyebrow={
          locale === "en"
            ? "Reader ready"
            : locale === "es"
              ? "Lector listo"
              : "Leitor pronto"
        }
        title={
          locale === "en"
            ? "Choose a document first, then the reader takes over."
            : locale === "es"
              ? "Elige un documento primero y luego el lector toma el relevo."
              : "Escolha um documento primeiro e depois o leitor assume."
        }
        variant="ready"
      />
    );
  }

  if (isLoading) {
    return (
      <ReaderWorkspaceState
        description={
          locale === "en"
            ? "Restoring the latest progress, pacing, and saved anchors from this device."
            : locale === "es"
              ? "Restaurando el progreso, ritmo y puntos guardados desde este dispositivo."
              : "Restaurando progresso, ritmo e pontos salvos deste dispositivo."
        }
        descriptionMaxWidth={false}
        eyebrow={
          locale === "en"
            ? "Loading"
            : locale === "es"
              ? "Cargando"
              : "Carregando"
        }
        title={
          locale === "en"
            ? "Preparing your saved document."
            : locale === "es"
              ? "Preparando tu documento guardado."
              : "Preparando seu documento salvo."
        }
        variant="loading"
      />
    );
  }

  if (
    !document ||
    error ||
    !activePayload ||
    (!activeChunk && !isPdfPageMode)
  ) {
    return (
      <ReaderWorkspaceState
        description={
          error ??
          (locale === "en"
            ? "Return to the home page, import the document again, and reopen it from the library if needed."
            : locale === "es"
              ? "Vuelve a la página principal, importa el documento otra vez y ábrelo desde la biblioteca si hace falta."
              : "Volte para a pagina inicial, importe o documento novamente e abra-o pela biblioteca se precisar.")
        }
        eyebrow={
          locale === "en"
            ? "Reader issue"
            : locale === "es"
              ? "Problema en el lector"
              : "Problema no leitor"
        }
        title={
          locale === "en"
            ? "This view is waiting for a document it can open."
            : locale === "es"
              ? "Esta vista está esperando un documento que pueda abrir."
              : "Esta visualizacao esta esperando um documento que possa abrir."
        }
        variant="warning"
      />
    );
  }

  return (
    <section
      className="space-y-3 lg:space-y-4"
      data-reader-theme={preferences.theme}
      data-reader-font-scale={preferences.fontScale.toFixed(1)}
      data-reader-line-height={preferences.lineHeight.toFixed(1)}
    >
      {!isPdfPageMode && documentComplexityNotice ? (
        <div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-500/10 px-4 py-4 shadow-[0_14px_40px_rgba(20,26,56,0.08)]">
          <button
            type="button"
            aria-controls={documentComplexityNoticeContentId}
            aria-expanded={isDocumentComplexityNoticeExpanded}
            aria-label={`${isDocumentComplexityNoticeExpanded ? collapseComplexityNoticeLabel : expandComplexityNoticeLabel} ${documentComplexityNotice.title}`}
            onClick={() => {
              setIsDocumentComplexityNoticeExpanded((current) => !current);
            }}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-(--accent-amber) uppercase">
              {documentComplexityNotice.title}
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-[0.68rem] font-medium tracking-[0.18em] text-(--text-muted) uppercase transition hover:border-amber-300/70 hover:bg-amber-500/15 hover:text-(--text-strong)">
              {isDocumentComplexityNoticeExpanded
                ? collapseComplexityNoticeLabel
                : expandComplexityNoticeLabel}
              <ChevronDown
                className={`h-4 w-4 transition ${isDocumentComplexityNoticeExpanded ? "rotate-180" : ""}`}
              />
            </span>
          </button>
          {isDocumentComplexityNoticeExpanded ? (
            <div id={documentComplexityNoticeContentId}>
              <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                {documentComplexityNotice.description}
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-(--text-muted)">
                {documentComplexityNotice.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-(--accent-amber)">*</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {readerModeStatusNotice ? (
        <div className="rounded-[1.5rem] border border-sky-300/30 bg-sky-500/10 px-4 py-4 shadow-[0_14px_40px_rgba(20,26,56,0.08)]">
          <p className="text-xs font-semibold tracking-[0.18em] text-(--accent-sky) uppercase">
            {readerModeStatusNotice.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-(--text-muted)">
            {readerModeStatusNotice.description}
          </p>
        </div>
      ) : null}
      {mobileSidebarSection}
      <div className="fade-rise-delayed relative z-20">
        <p
          ref={liveStatusRegionRef}
          className="sr-only"
          role="status"
          aria-live="polite"
        />

        {isPdfPageMode ? (
          <PdfReaderWorkspace
            availableModes={availableModes}
            bookmarks={bookmarks}
            document={document}
            hasExtractedText={hasExtractedText}
            highlightNote={highlightNote}
            highlights={highlights}
            jumpRequest={pdfPageJumpRequest}
            onChangeHighlightNote={setHighlightNote}
            onDeleteBookmark={(bookmarkIdToDelete: string) => {
              void handleDeleteBookmark(bookmarkIdToDelete);
            }}
            onDeleteHighlight={(highlightIdToDelete: string) => {
              void handleDeleteHighlight(highlightIdToDelete);
            }}
            onJumpToBookmark={jumpToBookmark}
            onJumpToHighlight={jumpToHighlight}
            onOpenBrowserPdf={(args) => {
              handleOpenBrowserPdf(args);
            }}
            onPageChange={(pageIndex) => {
              if (!hasExtractedText) {
                return;
              }

              const chunkIndexForPage =
                runtimeChunkIndexBySourcePage.get(pageIndex) ?? -1;

              if (
                chunkIndexForPage >= 0 &&
                chunkIndexForPage !== resolvedChunkIndex
              ) {
                startTransition(() => {
                  setChunkIndex(chunkIndexForPage);
                });
              }
            }}
            onReadCurrentPageInClassic={
              hasExtractedText ? handleReadPdfPageInClassic : undefined
            }
            onSaveBookmark={(args) => {
              void handleSavePdfBookmark(args);
            }}
            onSaveHighlight={(args) => {
              void handleSavePdfHighlight(args);
            }}
            onSelectMode={handleModeSelection}
          />
        ) : (
          <ReaderCanvas
            activeGoalLabel={activeGoalLabel}
            availableModes={availableModes}
            availableTextPresentations={availableTextPresentations}
            chunkSize={preferences.chunkSize}
            currentParagraphNumber={(currentParagraph?.index ?? 0) + 1}
            isPlaying={isPlaying}
            modeLabel={modeLabel}
            modeView={modeView}
            remainingWords={remainingWords}
            remainingTimeLabel={remainingTimeLabel}
            preferences={preferences}
            sentenceCount={sentenceCount}
            onAnnounceRemainingTime={announceRemainingTime}
            onChangeFontScale={handleFontScaleChange}
            onChangeLineHeight={handleLineHeightChange}
            onChangeWordsPerMinute={changeWordsPerMinute}
            onDecreaseChunkSize={handleDecreaseChunkSize}
            onIncreaseChunkSize={handleIncreaseChunkSize}
            onMoveBackward={() => moveToChunk(resolvedChunkIndex - 1)}
            onMoveBackwardFive={() =>
              moveToChunk(
                jumpChunkIndex(runtimeChunks.length, resolvedChunkIndex, -5),
              )
            }
            onMoveForward={() => moveToChunk(resolvedChunkIndex + 1)}
            onMoveForwardFive={() =>
              moveToChunk(
                jumpChunkIndex(runtimeChunks.length, resolvedChunkIndex, 5),
              )
            }
            onRepeatChunk={() =>
              moveToChunk(repeatChunkIndex(resolvedChunkIndex))
            }
            onRestart={() => moveToChunk(0)}
            onRestartParagraph={() =>
              moveToChunk(
                restartParagraphChunkIndex(runtimeChunks, resolvedChunkIndex),
              )
            }
            onReturnToOriginalPage={
              canOpenBrowserPdf ? handleReturnToOriginalPdfPage : undefined
            }
            onSaveBookmark={() => {
              void handleSaveBookmark();
            }}
            onSaveHighlight={() => {
              void handleSaveHighlight();
            }}
            onSelectMode={handleModeSelection}
            onSelectPreset={handlePresetSelection}
            onSelectTextPresentation={
              canToggleTextPresentation
                ? handleTextPresentationSelection
                : undefined
            }
            onSelectTheme={handleThemeSelection}
            onToggleNaturalPauses={handleNaturalPausesToggle}
            onTogglePlayback={handlePlaybackToggle}
            onToggleReduceMotion={handleReduceMotionToggle}
            progress={progress}
            textPresentation={textPresentation}
          />
        )}
      </div>

      {readerAds.shouldRender ? (
        <ReaderAdBreakOverlay
          adTagUrl={readerAds.adTagUrl}
          onBeginAdBreak={readerAds.beginAdBreak}
          consentRegion={readerAds.consentRegion}
          consentState={readerAds.consentState}
          demandMode={readerAds.demandMode}
          isOpen={readerAds.isOpen}
          locale={locale}
          onAdCompleted={() => {
            readerAds.handleAdCompleted();
            announce(
              locale === "en"
                ? "Sponsor break finished. Reading resumed."
                : locale === "es"
                  ? "El patrocinio termino. La lectura continua."
                  : "O patrocinio terminou. A leitura continua.",
            );
          }}
          onAdFailed={(reason) => {
            readerAds.handleAdFailed(reason);
            announce(
              locale === "en"
                ? "Sponsor break could not load, so the reader was unlocked."
                : locale === "es"
                  ? "El patrocinio no pudo cargarse, así que el lector se desbloqueó."
                  : "O patrocinio nao conseguiu carregar, entao o leitor foi liberado.",
            );
          }}
          onAdStarted={readerAds.handleAdStarted}
          onConsentDenied={() => {
            readerAds.denyConsent();
            announce(
              locale === "en"
                ? "Ad consent was declined, so Leyendo kept the reader unlocked."
                : locale === "es"
                  ? "Se rechazó el consentimiento publicitario, así que Leyendo dejó el lector desbloqueado."
                  : "O consentimento publicitario foi recusado, entao Leyendo manteve o leitor liberado.",
            );
          }}
          onConsentGranted={readerAds.grantConsent}
          onUpgradeClick={readerAds.trackUpgradeClick}
          phase={
            readerAds.phase === "idle"
              ? "prompt"
              : readerAds.phase === "consent"
                ? "consent"
                : readerAds.phase === "loading"
                  ? "loading"
                  : readerAds.phase === "playing"
                    ? "playing"
                    : "prompt"
          }
          provider={readerAds.provider}
          upgradeHref={readerAds.upgradeHref}
        />
      ) : null}

      {isPdfPageMode ? null : (
        <>
          <div className="hidden lg:block">
            <ReaderSidebar {...sidebarProps} />
          </div>
        </>
      )}
    </section>
  );
}

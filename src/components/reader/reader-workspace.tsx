"use client";

import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  deleteBookmark,
  deleteHighlight,
  getDocumentAsset,
  saveBookmark,
  saveHighlight,
} from "@/db/repositories";
import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { useLocale } from "@/components/layout/locale-provider";
import { ClassicReaderView } from "@/components/reader/classic-reader-view";
import { FocusWordView } from "@/components/reader/focus-word-view";
import { GuidedLineView } from "@/components/reader/guided-line-view";
import { PdfReaderWorkspace } from "@/components/reader/pdf-reader-workspace";
import { PhraseChunkView } from "@/components/reader/phrase-chunk-view";
import { ReaderAdBreakOverlay } from "@/components/reader/reader-ad-break-overlay";
import { ReaderCanvas } from "@/components/reader/reader-canvas";
import { ReaderSidebar } from "@/components/reader/reader-sidebar";
import { useCloudAnchorSync } from "@/components/reader/use-cloud-anchor-sync";
import { useReaderAdBreaks } from "@/components/reader/use-reader-ad-breaks";
import { useReaderDocument } from "@/components/reader/use-reader-document";
import { useReaderPersistence } from "@/components/reader/use-reader-persistence";
import { useReaderPlayback } from "@/components/reader/use-reader-playback";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
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
  getRecommendedPreferences,
} from "@/features/reader/engine/presets";
import {
  resolvePdfSelectionAnchor,
  resolveSourcePageIndexForAnchor,
} from "@/features/reader/pdf/navigation";
import { isCatalogDocumentId, toCatalogOwnerId } from "@/lib/catalog";
import { createDocumentComplexityNotice } from "@/lib/document-complexity";
import { getLocalizedCopy } from "@/lib/locale";
import { getEffectivePlanTier, hasPlanAccess } from "@/lib/plans";
import { useReaderStore } from "@/state/reader-store";
import type { Chunk, DocumentModel, TextPresentation } from "@/types/document";
import type {
  Bookmark,
  Highlight,
  ReaderMode,
  ReaderPreferences,
} from "@/types/reader";
import { readerModes, readerPresets } from "@/types/reader";

interface ReaderWorkspaceProps {
  documentId?: string;
  bookmarkId?: string;
  highlightId?: string;
}

function formatRemainingTimeLabel(ms: number, locale: string) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  switch (locale) {
    case "es":
      if (hours > 0) {
        return `Quedan ${hours}h ${minutes}m`;
      }

      if (minutes > 0) {
        return `Quedan ${minutes}m ${seconds}s`;
      }

      return `Quedan ${seconds}s`;
    case "pt":
      if (hours > 0) {
        return `Faltam ${hours}h ${minutes}m`;
      }

      if (minutes > 0) {
        return `Faltam ${minutes}m ${seconds}s`;
      }

      return `Faltam ${seconds}s`;
    default:
      if (hours > 0) {
        return `${hours}h ${minutes}m left`;
      }

      if (minutes > 0) {
        return `${minutes}m ${seconds}s left`;
      }

      return `${seconds}s left`;
  }
}

function formatRemainingTimeAnnouncement(args: {
  locale: string;
  modeLabel: string;
  remainingMs: number;
  remainingWords: number;
  wordsPerMinute: number;
}) {
  const { locale, modeLabel, remainingMs, remainingWords, wordsPerMinute } =
    args;
  const timeLabel = formatRemainingTimeLabel(remainingMs, locale);

  switch (locale) {
    case "es":
      return `${timeLabel}. Estimado con ${remainingWords} palabras restantes, ${wordsPerMinute} palabras por minuto y el modo ${modeLabel}.`;
    case "pt":
      return `${timeLabel}. Estimativa com ${remainingWords} palavras restantes, ${wordsPerMinute} palavras por minuto e o modo ${modeLabel}.`;
    default:
      return `${timeLabel}. Estimated from ${remainingWords} words remaining, ${wordsPerMinute} words per minute, in ${modeLabel} mode.`;
  }
}

function normalizeChunkText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function findChunkIndexByText(
  chunks: Chunk[],
  anchorText: string | undefined,
  preferredIndex: number,
) {
  if (!anchorText) {
    return undefined;
  }

  const normalizedAnchor = normalizeChunkText(anchorText);
  if (!normalizedAnchor) {
    return undefined;
  }

  const matches: number[] = [];

  chunks.forEach((chunk, index) => {
    if (normalizeChunkText(chunk.text) === normalizedAnchor) {
      matches.push(index);
    }
  });

  if (matches.length === 0) {
    return undefined;
  }

  return matches.reduce((bestIndex, currentIndex) => {
    return Math.abs(currentIndex - preferredIndex) <
      Math.abs(bestIndex - preferredIndex)
      ? currentIndex
      : bestIndex;
  });
}

function mapChunkIndexBetweenChunks(args: {
  anchorText?: string;
  currentChunkIndex: number;
  sourceChunks: Chunk[];
  targetChunks: Chunk[];
}) {
  const { anchorText, currentChunkIndex, sourceChunks, targetChunks } = args;

  if (targetChunks.length === 0) {
    return 0;
  }

  const progressRatio =
    sourceChunks.length <= 1
      ? 0
      : Math.max(0, currentChunkIndex) / (sourceChunks.length - 1);
  const preferredIndex =
    targetChunks.length <= 1
      ? 0
      : Math.round(progressRatio * (targetChunks.length - 1));
  const matchedIndex = findChunkIndexByText(
    targetChunks,
    anchorText,
    preferredIndex,
  );

  return clampChunkIndex(targetChunks.length, matchedIndex ?? preferredIndex);
}

function rebuildStoredTextDocument(
  document: DocumentModel,
  sourceKind: Extract<DocumentModel["sourceKind"], "markdown" | "plain-text">,
) {
  const rawText = document.rawText?.trim() ? document.rawText : document.text;
  const rebuilt = buildDocumentModel({
    title: document.title,
    rawText,
    sourceKind,
  });

  return {
    ...rebuilt,
    id: document.id,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    pages: document.pages,
    rawText,
  } satisfies DocumentModel;
}

const LARGE_MARKDOWN_RAW_TEXT_THRESHOLD = 80_000;
const LARGE_MARKDOWN_BLOCK_THRESHOLD = 400;
const LARGE_MARKDOWN_SENTENCE_THRESHOLD = 2_000;
const LARGE_MARKDOWN_TOKEN_THRESHOLD = 20_000;

function shouldSimplifyClassicMarkdown(
  document: DocumentModel | undefined,
): boolean {
  if (
    !document ||
    document.sourceKind !== "markdown" ||
    !document.rawText?.trim()
  ) {
    return false;
  }

  return (
    document.rawText.length >= LARGE_MARKDOWN_RAW_TEXT_THRESHOLD ||
    document.blocks.length >= LARGE_MARKDOWN_BLOCK_THRESHOLD ||
    document.sentences.length >= LARGE_MARKDOWN_SENTENCE_THRESHOLD ||
    document.tokens.length >= LARGE_MARKDOWN_TOKEN_THRESHOLD
  );
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
  const {
    currentChunkIndex,
    isPlaying,
    preferences,
    setActiveDocument,
    setChunkIndex,
    setMode,
    setPlaying,
    updatePreferences,
  } = useReaderStore();
  const [highlightNote, setHighlightNote] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pdfAssetState, setPdfAssetState] = useState<
    "unknown" | "present" | "missing"
  >("unknown");
  const [pdfPageJumpRequest, setPdfPageJumpRequest] = useState<
    { nonce: number; pageIndex: number } | undefined
  >();
  const [textPresentationOverride, setTextPresentationOverride] = useState<{
    documentId: string | undefined;
    value: TextPresentation | undefined;
  }>({
    documentId: undefined,
    value: undefined,
  });
  const hasHydratedSessionRef = useRef(false);
  const lastAnchorTokenRef = useRef<number | undefined>(undefined);
  const liveStatusRegionRef = useRef<HTMLParagraphElement | null>(null);
  const liveStatusTimeoutRef = useRef<number | undefined>(undefined);
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
  const textPresentation = canToggleTextPresentation
    ? ((textPresentationOverride.documentId === document?.id
        ? textPresentationOverride.value
        : undefined) ??
        savedSession?.textPresentation ??
        "clean")
    : undefined;
  const literalPayload = useMemo(() => {
    if (!payload || !canToggleTextPresentation) {
      return undefined;
    }

    return rebuildStoredTextDocument(payload, "plain-text");
  }, [canToggleTextPresentation, payload]);
  const activePayload =
    canToggleTextPresentation && textPresentation === "literal"
      ? (literalPayload ?? payload)
      : payload;
  const cleanRuntimeChunks = useMemo(
    () =>
      payload
        ? deriveRuntimeChunks(payload, {
            mode: preferences.mode,
            chunkSize: preferences.chunkSize,
            focusWindow: preferences.focusWindow,
          })
        : [],
    [payload, preferences.chunkSize, preferences.focusWindow, preferences.mode],
  );
  const literalRuntimeChunks = useMemo(
    () =>
      literalPayload
        ? deriveRuntimeChunks(literalPayload, {
            mode: preferences.mode,
            chunkSize: preferences.chunkSize,
            focusWindow: preferences.focusWindow,
          })
        : [],
    [
      literalPayload,
      preferences.chunkSize,
      preferences.focusWindow,
      preferences.mode,
    ],
  );
  const runtimeChunks = useMemo(
    () =>
      canToggleTextPresentation && textPresentation === "literal"
        ? literalRuntimeChunks
        : cleanRuntimeChunks,
    [
      canToggleTextPresentation,
      cleanRuntimeChunks,
      literalRuntimeChunks,
      textPresentation,
    ],
  );
  const resolvedChunkIndex = runtimeChunks.length
    ? clampChunkIndex(runtimeChunks.length, currentChunkIndex)
    : 0;
  const activeChunk = runtimeChunks[resolvedChunkIndex];
  const currentParagraph =
    activePayload && activeChunk
      ? activePayload.blocks[activeChunk.paragraphIndex]
      : undefined;
  const progress = runtimeChunks.length
    ? deriveReaderProgress({ chunks: runtimeChunks }, resolvedChunkIndex)
    : 0;
  const remainingWords = useMemo(() => {
    if (runtimeChunks.length === 0) {
      return 0;
    }

    const remainingTokenIndexes = new Set<number>();

    runtimeChunks.slice(resolvedChunkIndex).forEach((runtimeChunk) => {
      runtimeChunk.tokenIndexes.forEach((tokenIndex) => {
        remainingTokenIndexes.add(tokenIndex);
      });
    });

    return remainingTokenIndexes.size;
  }, [resolvedChunkIndex, runtimeChunks]);
  const remainingTimeMs = useMemo(() => {
    return deriveRemainingPlaybackMs(
      runtimeChunks,
      resolvedChunkIndex,
      preferences,
    );
  }, [preferences, resolvedChunkIndex, runtimeChunks]);
  const remainingTimeLabel = useMemo(() => {
    return formatRemainingTimeLabel(remainingTimeMs, locale);
  }, [locale, remainingTimeMs]);
  const hasExtractedText = Boolean(
    activePayload &&
    activePayload.tokens.length > 0 &&
    activePayload.text.trim().length > 0,
  );
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
  const canUsePdfPageMode =
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
  const isPdfPageMode =
    canUsePdfPageMode && (!hasExtractedText || preferences.mode === "pdf-page");
  const canvasMode = isPdfPageMode
    ? "pdf-page"
    : preferences.mode === "pdf-page"
      ? "classic-reader"
      : preferences.mode;
  const simplifyClassicMarkdownPreview = useMemo(
    () => shouldSimplifyClassicMarkdown(activePayload),
    [activePayload],
  );
  const modeLabel = {
    "pdf-page": { en: "Standard", es: "Standard", pt: "Standard" },
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
      if (!canToggleTextPresentation) {
        return runtimeChunks;
      }

      return presentation === "literal"
        ? literalRuntimeChunks
        : cleanRuntimeChunks;
    },
    [
      canToggleTextPresentation,
      cleanRuntimeChunks,
      literalRuntimeChunks,
      runtimeChunks,
    ],
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
    textPresentation,
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
    preferences.chunkSize,
    preferences.focusWindow,
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

  const applyPreferenceChanges = useCallback(
    (changes: Partial<typeof preferences>) => {
      const nextPreferences = {
        ...preferences,
        ...changes,
      };

      updatePreferences({
        ...changes,
        readingGoal: getMatchingReadingGoal(nextPreferences),
      });
    },
    [preferences, updatePreferences],
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
        120,
        Math.min(700, preferences.wordsPerMinute + delta),
      );
      applyPreferenceChanges({ wordsPerMinute: nextWordsPerMinute });
      announce(`Reading speed set to ${nextWordsPerMinute} words per minute.`);
    },
    [announce, applyPreferenceChanges, preferences.wordsPerMinute],
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
      syncState: canSyncDocumentState ? "synced" : undefined,
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
        syncState: canSyncDocumentState ? "synced" : undefined,
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
      syncState: canSyncDocumentState ? "synced" : undefined,
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
    async (args: { pageIndex: number; selectionText?: string }) => {
      if (!document || !payload || runtimeChunks.length === 0) {
        return;
      }

      const selectionText = args.selectionText?.trim();
      const resolvedAnchor = selectionText
        ? resolvePdfSelectionAnchor({
            document: payload,
            pageIndex: args.pageIndex,
            quote: selectionText,
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
        syncState: canSyncDocumentState ? "synced" : undefined,
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
      runtimeChunks,
      canSyncDocumentState,
      localDocumentOwnerId,
    ],
  );

  const handleDeleteBookmark = useCallback(
    async (bookmarkIdToDelete: string) => {
      if (canSyncDocumentState) {
        queueBookmarkDelete(bookmarkIdToDelete);
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
        queueHighlightDelete(highlightIdToDelete);
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
      quote?: string;
      textPresentation?: TextPresentation;
      tokenIndex: number;
    }) => {
      const anchorPresentation = canToggleTextPresentation
        ? (anchor.textPresentation ?? "clean")
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
        "chunkIndex" | "label" | "quote" | "textPresentation" | "tokenIndex"
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
      if (
        !canToggleTextPresentation ||
        textPresentation === nextPresentation ||
        runtimeChunks.length === 0
      ) {
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
  const renderModeView = () => {
    if (!activePayload || !activeChunk) {
      return null;
    }

    switch (canvasMode) {
      case "classic-reader":
        return (
          <ClassicReaderView
            document={activePayload}
            chunk={activeChunk}
            onJumpToToken={jumpToToken}
            reduceMotion={preferences.reduceMotion}
            simplifyMarkdownPreview={simplifyClassicMarkdownPreview}
          />
        );
      case "phrase-chunk":
        return (
          <PhraseChunkView
            document={activePayload}
            chunk={activeChunk}
            chunks={runtimeChunks}
          />
        );
      case "guided-line":
        return (
          <GuidedLineView
            document={activePayload}
            chunk={activeChunk}
            chunks={runtimeChunks}
            focusWindow={preferences.focusWindow}
            onJumpToToken={jumpToToken}
          />
        );
      default:
        return <FocusWordView document={activePayload} chunk={activeChunk} />;
    }
  };

  const activeGoalLabel = preferences.readingGoal
    ? {
        "study-carefully": {
          en: "Study carefully",
          es: "Estudiar con calma",
          pt: "Estudar com calma",
        },
        "read-faster": {
          en: "Read faster",
          es: "Leer mas rapido",
          pt: "Ler mais rapido",
        },
        "skim-overview": {
          en: "Skim for overview",
          es: "Explorar panorama",
          pt: "Ler por panorama",
        },
        "practice-focus": {
          en: "Practice focus",
          es: "Practicar enfoque",
          pt: "Praticar foco",
        },
      }[preferences.readingGoal][locale]
    : undefined;
  const recommendedGoalPreferences = useMemo(
    () =>
      preferences.readingGoal
        ? getRecommendedPreferences(preferences.readingGoal)
        : undefined,
    [preferences.readingGoal],
  );
  const recommendedModeLabel = useMemo(() => {
    if (!recommendedGoalPreferences) {
      return undefined;
    }

    return getLocalizedCopy(locale, {
      en:
        recommendedGoalPreferences.mode === "pdf-page"
          ? "Standard PDF"
          : recommendedGoalPreferences.mode === "focus-word"
            ? "Focus Word"
            : recommendedGoalPreferences.mode === "phrase-chunk"
              ? "Phrase Chunk"
              : recommendedGoalPreferences.mode === "guided-line"
                ? "Guided Line"
                : "Classic Reader",
      es:
        recommendedGoalPreferences.mode === "pdf-page"
          ? "PDF standard"
          : recommendedGoalPreferences.mode === "focus-word"
            ? "Palabra foco"
            : recommendedGoalPreferences.mode === "phrase-chunk"
              ? "Bloques de frases"
              : recommendedGoalPreferences.mode === "guided-line"
                ? "Linea guiada"
                : "Lector clasico",
      pt:
        recommendedGoalPreferences.mode === "pdf-page"
          ? "PDF standard"
          : recommendedGoalPreferences.mode === "focus-word"
            ? "Palavra foco"
            : recommendedGoalPreferences.mode === "phrase-chunk"
              ? "Blocos de frases"
              : recommendedGoalPreferences.mode === "guided-line"
                ? "Linha guiada"
                : "Leitor classico",
    });
  }, [locale, recommendedGoalPreferences]);
  const modeAvailabilityNote = useMemo(() => {
    if (payload?.sourceKind !== "pdf") {
      return undefined;
    }

    if (canUsePdfPageMode && !hasExtractedText) {
      return locale === "en"
        ? "This PDF can stay in Standard view, but the faster text modes need selectable text or OCR before they can help."
        : locale === "es"
          ? "Este PDF puede quedarse en vista Standard, pero los modos rapidos de texto necesitan texto seleccionable u OCR antes de poder ayudar."
          : "Este PDF pode ficar na vista Standard, mas os modos rapidos de texto precisam de texto selecionavel ou OCR antes de conseguir ajudar.";
    }

    if (!canUsePdfPageMode && hasExtractedText) {
      return locale === "en"
        ? "Text modes are available, but the original PDF pages are missing on this device, so Standard view cannot open right now."
        : locale === "es"
          ? "Los modos de texto estan disponibles, pero las paginas originales del PDF faltan en este dispositivo, asi que la vista Standard no puede abrirse ahora mismo."
          : "Os modos de texto estao disponiveis, mas as paginas originais do PDF faltam neste dispositivo, entao a vista Standard nao pode abrir agora.";
    }

    if (canUsePdfPageMode && hasExtractedText) {
      return locale === "en"
        ? "This PDF supports both Standard page view and the text-based speed modes, so you can trade layout fidelity for pacing help whenever needed."
        : locale === "es"
          ? "Este PDF admite tanto la vista Standard por paginas como los modos rapidos de texto, asi que puedes cambiar fidelidad de layout por ayuda de ritmo cuando haga falta."
          : "Este PDF suporta tanto a vista Standard por paginas quanto os modos rapidos de texto, entao voce pode trocar fidelidade de layout por ajuda de ritmo quando precisar.";
    }

    return undefined;
  }, [canUsePdfPageMode, hasExtractedText, locale, payload?.sourceKind]);
  const sessionFeedbackCards = useMemo(() => {
    const paceDelta = recommendedGoalPreferences
      ? preferences.wordsPerMinute - recommendedGoalPreferences.wordsPerMinute
      : 0;
    const paceTitle = activeGoalLabel
      ? paceDelta >= 45
        ? locale === "en"
          ? `Above your saved ${activeGoalLabel.toLowerCase()} pace`
          : locale === "es"
            ? `Por encima de tu ritmo guardado para ${activeGoalLabel.toLowerCase()}`
            : `Acima do ritmo salvo para ${activeGoalLabel.toLowerCase()}`
        : paceDelta <= -45
          ? locale === "en"
            ? `Below your saved ${activeGoalLabel.toLowerCase()} pace`
            : locale === "es"
              ? `Por debajo de tu ritmo guardado para ${activeGoalLabel.toLowerCase()}`
              : `Abaixo do ritmo salvo para ${activeGoalLabel.toLowerCase()}`
          : locale === "en"
            ? `Near your saved ${activeGoalLabel.toLowerCase()} pace`
            : locale === "es"
              ? `Cerca de tu ritmo guardado para ${activeGoalLabel.toLowerCase()}`
              : `Perto do ritmo salvo para ${activeGoalLabel.toLowerCase()}`
      : locale === "en"
        ? "Current session pace"
        : locale === "es"
          ? "Ritmo actual de la sesion"
          : "Ritmo atual da sessao";
    const paceDescription = activeGoalLabel && recommendedGoalPreferences
      ? locale === "en"
        ? `${preferences.wordsPerMinute} WPM in ${modeLabel}. Saved goal: ${activeGoalLabel}. Recommended start for that goal is ${recommendedGoalPreferences.wordsPerMinute} WPM in ${recommendedModeLabel}.`
        : locale === "es"
          ? `${preferences.wordsPerMinute} WPM en ${modeLabel}. Objetivo guardado: ${activeGoalLabel}. El inicio recomendado para ese objetivo es ${recommendedGoalPreferences.wordsPerMinute} WPM en ${recommendedModeLabel}.`
          : `${preferences.wordsPerMinute} WPM em ${modeLabel}. Objetivo salvo: ${activeGoalLabel}. O inicio recomendado para esse objetivo e ${recommendedGoalPreferences.wordsPerMinute} WPM em ${recommendedModeLabel}.`
      : locale === "en"
        ? `${preferences.wordsPerMinute} WPM in ${modeLabel}. Save a reading goal to compare this session against a recommended starting pace.`
        : locale === "es"
          ? `${preferences.wordsPerMinute} WPM en ${modeLabel}. Guarda un objetivo de lectura para comparar esta sesion con un ritmo recomendado de inicio.`
          : `${preferences.wordsPerMinute} WPM em ${modeLabel}. Salve um objetivo de leitura para comparar esta sessao com um ritmo inicial recomendado.`;

    const checkNextDescription = preferences.readingGoal === "study-carefully"
      ? locale === "en"
        ? "Before raising speed, can you explain the last section in one sentence without looking back?"
        : locale === "es"
          ? "Antes de subir la velocidad, puedes explicar la ultima seccion en una sola frase sin mirar atras?"
          : "Antes de aumentar a velocidade, voce consegue explicar a ultima secao em uma frase sem olhar para tras?"
      : preferences.readingGoal === "skim-overview"
        ? locale === "en"
          ? "Before slowing down, can you name the document structure so far: setup, argument, evidence, or conclusion?"
          : locale === "es"
            ? "Antes de bajar el ritmo, puedes nombrar la estructura del documento hasta ahora: apertura, argumento, evidencia o conclusion?"
            : "Antes de diminuir o ritmo, voce consegue nomear a estrutura do documento ate aqui: abertura, argumento, evidencia ou conclusao?"
        : preferences.readingGoal === "practice-focus"
          ? locale === "en"
            ? "Did attention drift in the last paragraph, or can you recall it cleanly before touching the controls?"
            : locale === "es"
              ? "Se desvio tu atencion en el ultimo parrafo, o puedes recordarlo con claridad antes de tocar los controles?"
              : "Sua atencao se desviou no ultimo paragrafo, ou voce consegue recorda-lo com clareza antes de mexer nos controles?"
          : locale === "en"
            ? "Before raising pace again, can you say what the last section just did: define, compare, argue, or conclude?"
            : locale === "es"
              ? "Antes de volver a subir el ritmo, puedes decir que hizo la ultima seccion: definir, comparar, argumentar o concluir?"
              : "Antes de aumentar o ritmo de novo, voce consegue dizer o que a ultima secao acabou de fazer: definir, comparar, argumentar ou concluir?";

    return [
      {
        key: "benchmark",
        eyebrow:
          locale === "en"
            ? "Pace benchmark"
            : locale === "es"
              ? "Benchmark de ritmo"
              : "Benchmark de ritmo",
        title: paceTitle,
        description: paceDescription,
      },
      {
        key: "snapshot",
        eyebrow:
          locale === "en"
            ? "Session snapshot"
            : locale === "es"
              ? "Resumen de sesion"
              : "Resumo da sessao",
        title:
          locale === "en"
            ? `${progress}% complete · ${remainingWords} words left`
            : locale === "es"
              ? `${progress}% completado · ${remainingWords} palabras por delante`
              : `${progress}% concluido · ${remainingWords} palavras pela frente`,
        description:
          locale === "en"
            ? `${remainingTimeLabel} in ${modeLabel}. ${activePayload?.sections.length ?? 0} ${(activePayload?.sections.length ?? 0) === 1 ? "section" : "sections"} in this document.`
            : locale === "es"
              ? `${remainingTimeLabel} en ${modeLabel}. ${activePayload?.sections.length ?? 0} ${(activePayload?.sections.length ?? 0) === 1 ? "seccion" : "secciones"} en este documento.`
              : `${remainingTimeLabel} em ${modeLabel}. ${activePayload?.sections.length ?? 0} ${(activePayload?.sections.length ?? 0) === 1 ? "secao" : "secoes"} neste documento.`,
      },
      {
        key: "check-next",
        eyebrow:
          locale === "en"
            ? "Check before changing pace"
            : locale === "es"
              ? "Comprueba antes de cambiar el ritmo"
              : "Confira antes de mudar o ritmo",
        title:
          locale === "en"
            ? "Comprehension prompt"
            : locale === "es"
              ? "Pregunta de comprension"
              : "Pergunta de compreensao",
        description: checkNextDescription,
        note: modeAvailabilityNote,
      },
    ];
  }, [
    activeGoalLabel,
    activePayload?.sections.length,
    locale,
    modeAvailabilityNote,
    modeLabel,
    preferences.readingGoal,
    preferences.wordsPerMinute,
    progress,
    recommendedGoalPreferences,
    recommendedModeLabel,
    remainingTimeLabel,
    remainingWords,
  ]);
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
    <div className="lg:hidden">
      <button
        type="button"
        aria-controls="reader-sidebar-mobile"
        onClick={() => {
          setIsMobileSidebarOpen((currentValue) => !currentValue);
        }}
        className="flex w-full items-start justify-between gap-4 rounded-[1.35rem] border border-(--border-soft) bg-(--surface-card) px-4 py-3 text-left shadow-[0_14px_40px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
      >
        <span>
          <span className="block text-xs tracking-[0.2em] text-(--accent-sky) uppercase">
            {sidebarToggleLabel}
          </span>
          <span className="mt-1 block text-sm text-(--text-muted)">
            {sidebarSummary}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1.5 text-xs font-medium text-(--text-strong)">
          {isMobileSidebarOpen ? sidebarOpenLabel : sidebarClosedLabel}
        </span>
      </button>
      {isMobileSidebarOpen ? (
        <div id="reader-sidebar-mobile" className="mt-3">
          <ReaderSidebar {...sidebarProps} />
        </div>
      ) : null}
    </div>
  );

  const handleModeSelection = useCallback(
    (mode: ReaderPreferences["mode"]) => {
      setMode(mode);
      applyPreferenceChanges({ mode });
      announce(
        `Reading mode set to ${mode
          .split("-")
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(" ")}.`,
      );
    },
    [announce, applyPreferenceChanges, setMode],
  );

  const handleDecreaseChunkSize = useCallback(() => {
    const nextChunkSize = Math.max(1, preferences.chunkSize - 1);
    applyPreferenceChanges({ chunkSize: nextChunkSize });
    announce(
      `Chunk size set to ${nextChunkSize} ${nextChunkSize === 1 ? "word" : "words"}.`,
    );
  }, [announce, applyPreferenceChanges, preferences.chunkSize]);

  const handleIncreaseChunkSize = useCallback(() => {
    const nextChunkSize = Math.min(6, preferences.chunkSize + 1);
    applyPreferenceChanges({ chunkSize: nextChunkSize });
    announce(`Chunk size set to ${nextChunkSize} words.`);
  }, [announce, applyPreferenceChanges, preferences.chunkSize]);

  const handleFontScaleChange = useCallback(
    (delta: number) => {
      const nextFontScale =
        delta > 0
          ? Math.min(1.8, Number((preferences.fontScale + delta).toFixed(1)))
          : Math.max(0.8, Number((preferences.fontScale + delta).toFixed(1)));
      applyPreferenceChanges({ fontScale: nextFontScale });
      announce(`Font scale set to ${nextFontScale.toFixed(1)} times.`);
    },
    [announce, applyPreferenceChanges, preferences.fontScale],
  );

  const handleLineHeightChange = useCallback(
    (delta: number) => {
      const nextLineHeight =
        delta > 0
          ? Math.min(2.2, Number((preferences.lineHeight + delta).toFixed(1)))
          : Math.max(1.2, Number((preferences.lineHeight + delta).toFixed(1)));
      applyPreferenceChanges({ lineHeight: nextLineHeight });
      announce(`Line height set to ${nextLineHeight.toFixed(1)}.`);
    },
    [announce, applyPreferenceChanges, preferences.lineHeight],
  );

  const handlePresetSelection = useCallback(
    (presetId: (typeof readerPresets)[number]["id"]) => {
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
    [announce, applyPreferenceChanges],
  );

  const handleThemeSelection = useCallback(
    (theme: ReaderPreferences["theme"]) => {
      applyPreferenceChanges({ theme });
      announce(`${theme.replace(/-/g, " ")} theme selected.`);
    },
    [announce, applyPreferenceChanges],
  );

  const handleNaturalPausesToggle = useCallback(() => {
    applyPreferenceChanges({ naturalPauses: !preferences.naturalPauses });
    announce(
      preferences.naturalPauses
        ? "Natural pauses disabled."
        : "Natural pauses enabled.",
    );
  }, [announce, applyPreferenceChanges, preferences.naturalPauses]);

  const handleReduceMotionToggle = useCallback(() => {
    applyPreferenceChanges({ reduceMotion: !preferences.reduceMotion });
    announce(
      preferences.reduceMotion
        ? "Reduced motion disabled."
        : "Reduced motion enabled.",
    );
  }, [announce, applyPreferenceChanges, preferences.reduceMotion]);

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
            ? "Patrocinio en reproduccion. El lector se desbloqueara automaticamente cuando termine."
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
      <section className="editorial-panel fade-rise rounded-[2rem] border border-dashed border-(--border-soft) bg-(--surface-card) p-10 text-center shadow-[0_20px_80px_rgba(20,26,56,0.12)] backdrop-blur-xl">
        <p className="editorial-kicker text-(--accent-sky)">
          {locale === "en"
            ? "Reader ready"
            : locale === "es"
              ? "Lector listo"
              : "Leitor pronto"}
        </p>
        <h2 className="font-heading mt-4 text-4xl leading-tight font-semibold text-(--text-strong)">
          {locale === "en"
            ? "Choose a document first, then the reader takes over."
            : locale === "es"
              ? "Elige un documento primero y luego el lector toma el relevo."
              : "Escolha um documento primeiro e depois o leitor assume."}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-(--text-muted)">
          {locale === "en"
            ? "Import a PDF, DOCX, RTF, Markdown, TXT, or pasted text from the home page. Leyendo will open it here with local progress, bookmarks, and highlights."
            : locale === "es"
              ? "Importa un PDF, DOCX, RTF, Markdown, TXT o texto pegado desde la pagina principal. Leyendo lo abrira aqui con progreso, marcadores y destacados locales."
              : "Importe um PDF, DOCX, RTF, Markdown, TXT ou texto colado pela pagina inicial. Leyendo vai abrir aqui com progresso, marcadores e destaques locais."}
        </p>
        <Link
          href="/#upload-panel"
          className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-6 py-3 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
        >
          {locale === "en"
            ? "Import a document"
            : locale === "es"
              ? "Importar documento"
              : "Importar documento"}
        </Link>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="editorial-panel fade-rise rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-10 text-center shadow-[0_20px_80px_rgba(20,26,56,0.12)] backdrop-blur-xl">
        <p className="editorial-kicker text-(--accent-sky)">
          {locale === "en"
            ? "Loading"
            : locale === "es"
              ? "Cargando"
              : "Carregando"}
        </p>
        <h2 className="font-heading mt-4 text-4xl leading-tight font-semibold text-(--text-strong)">
          {locale === "en"
            ? "Preparing your saved document."
            : locale === "es"
              ? "Preparando tu documento guardado."
              : "Preparando seu documento salvo."}
        </h2>
        <p className="mt-4 text-base leading-8 text-(--text-muted)">
          {locale === "en"
            ? "Restoring the latest progress, pacing, and saved anchors from this device."
            : locale === "es"
              ? "Restaurando el progreso, ritmo y puntos guardados desde este dispositivo."
              : "Restaurando progresso, ritmo e pontos salvos deste dispositivo."}
        </p>
      </section>
    );
  }

  if (
    !document ||
    error ||
    !activePayload ||
    (!activeChunk && !isPdfPageMode)
  ) {
    return (
      <section className="editorial-panel fade-rise rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-10 text-center shadow-[0_20px_80px_rgba(20,26,56,0.12)] backdrop-blur-xl">
        <p className="editorial-kicker text-(--accent-amber)">
          {locale === "en"
            ? "Reader issue"
            : locale === "es"
              ? "Problema en el lector"
              : "Problema no leitor"}
        </p>
        <h2 className="font-heading mt-4 text-4xl leading-tight font-semibold text-(--text-strong)">
          {locale === "en"
            ? "This view is waiting for a document it can open."
            : locale === "es"
              ? "Esta vista esta esperando un documento que pueda abrir."
              : "Esta visualizacao esta esperando um documento que possa abrir."}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-(--text-muted)">
          {error ??
            (locale === "en"
              ? "Return to the home page, import the document again, and reopen it from the library if needed."
              : locale === "es"
                ? "Vuelve a la pagina principal, importa el documento otra vez y abrelo desde la biblioteca si hace falta."
                : "Volte para a pagina inicial, importe o documento novamente e abra-o pela biblioteca se precisar.")}
        </p>
      </section>
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
          <p className="text-xs font-semibold tracking-[0.18em] text-(--accent-amber) uppercase">
            {documentComplexityNotice.title}
          </p>
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
      <div className="grid gap-3 lg:grid-cols-3">
        {sessionFeedbackCards.map((card) => (
          <div
            key={card.key}
            className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-card) px-4 py-4 shadow-[0_14px_40px_rgba(20,26,56,0.08)]"
          >
            <p className="text-xs tracking-[0.18em] text-(--accent-sky) uppercase">
              {card.eyebrow}
            </p>
            <h2 className="mt-2 text-base font-semibold text-(--text-strong)">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              {card.description}
            </p>
            {card.note ? (
              <p className="mt-3 text-sm leading-6 text-(--accent-amber)">
                {card.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
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
            onPageChange={(pageIndex) => {
              if (!hasExtractedText) {
                return;
              }

              const chunkIndexForPage = runtimeChunks.findIndex(
                (runtimeChunk) => runtimeChunk.sourcePageIndex === pageIndex,
              );

              if (
                chunkIndexForPage >= 0 &&
                chunkIndexForPage !== resolvedChunkIndex
              ) {
                startTransition(() => {
                  setChunkIndex(chunkIndexForPage);
                });
              }
            }}
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
            chunkSize={preferences.chunkSize}
            currentParagraphNumber={(currentParagraph?.index ?? 0) + 1}
            isPlaying={isPlaying}
            modeLabel={modeLabel}
            modeView={renderModeView()}
            remainingTimeLabel={remainingTimeLabel}
            preferences={preferences}
            sentenceCount={activePayload.sentences.length}
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
                  ? "El patrocinio no pudo cargarse, asi que el lector se desbloqueo."
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
                  ? "Se rechazo el consentimiento publicitario, asi que Leyendo dejo el lector desbloqueado."
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

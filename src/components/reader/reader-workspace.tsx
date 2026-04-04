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
import { ReaderCanvas } from "@/components/reader/reader-canvas";
import { ReaderSidebar } from "@/components/reader/reader-sidebar";
import { useReaderDocument } from "@/components/reader/use-reader-document";
import { useReaderPersistence } from "@/components/reader/use-reader-persistence";
import { useReaderPlayback } from "@/components/reader/use-reader-playback";
import {
  clampChunkIndex,
  deriveReaderProgress,
  deriveRuntimeChunks,
  jumpChunkIndex,
  repeatChunkIndex,
  resolveSessionChunkIndex,
  restartParagraphChunkIndex,
} from "@/features/reader/engine/navigation";
import { deriveRemainingPlaybackMs } from "@/features/reader/engine/timing";
import { getMatchingReadingGoal } from "@/features/reader/engine/presets";
import {
  resolvePdfSelectionAnchor,
  resolveSourcePageIndexForAnchor,
} from "@/features/reader/pdf/navigation";
import { getLocalizedCopy } from "@/lib/locale";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteCloudBookmark,
  deleteCloudHighlight,
  upsertCloudBookmarks,
  upsertCloudHighlights,
} from "@/lib/supabase/library-sync";
import { useReaderStore } from "@/state/reader-store";
import type { Bookmark, ReaderMode, ReaderPreferences } from "@/types/reader";
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

export function ReaderWorkspace({
  documentId,
  bookmarkId,
  highlightId,
}: ReaderWorkspaceProps) {
  const { locale } = useLocale();
  const { profile, syncReaderPreferences, user } = useSupabaseAuth();
  const userId = user?.id;
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
  const [statusMessage, setStatusMessage] = useState("");
  const hasHydratedSessionRef = useRef(false);
  const lastAnchorTokenRef = useRef<number | undefined>(undefined);
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
    documentId,
    bookmarkId,
    highlightId,
    setActiveDocument,
    userId,
  });

  const payload = document?.payload;
  const runtimeChunks = useMemo(
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
  const resolvedChunkIndex = runtimeChunks.length
    ? clampChunkIndex(runtimeChunks.length, currentChunkIndex)
    : 0;
  const activeChunk = runtimeChunks[resolvedChunkIndex];
  const currentParagraph =
    payload && activeChunk
      ? payload.blocks[activeChunk.paragraphIndex]
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
    payload && payload.tokens.length > 0 && payload.text.trim().length > 0,
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

  useReaderPersistence({
    document,
    activeChunk,
    currentChunkIndex: resolvedChunkIndex,
    isPlaying,
    preferences,
    profileReaderPreferences: profile?.readerPreferences,
    runtimeChunks,
    syncReaderPreferences,
    userId,
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
    setStatusMessage("");
    window.setTimeout(() => {
      setStatusMessage(message);
    }, 0);
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
      ownerId: userId,
      chunkIndex: resolvedChunkIndex,
      tokenIndex: activeChunk.anchorTokenIndex,
      paragraphIndex: activeChunk.paragraphIndex,
      sectionIndex: activeChunk.sectionIndex,
      syncState: userId ? "synced" : undefined,
    });

    prependBookmark(bookmark);
    if (userId) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        void upsertCloudBookmarks(supabase, userId, [bookmark]).catch(
          (error) => {
            console.warn("bookmark sync failed", error);
          },
        );
      }
    }
    announce(`${bookmark.label} saved.`);
  }, [
    activeChunk,
    announce,
    bookmarks.length,
    document,
    prependBookmark,
    resolvedChunkIndex,
    userId,
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
        ownerId: userId,
        chunkIndex: isPageOnlyBookmark ? -1 : resolvedIndex,
        tokenIndex: isPageOnlyBookmark ? -1 : anchorChunk.anchorTokenIndex,
        paragraphIndex: isPageOnlyBookmark ? -1 : anchorChunk.paragraphIndex,
        sectionIndex: isPageOnlyBookmark ? -1 : anchorChunk.sectionIndex,
        sourcePageIndex: pageIndex,
        syncState: userId ? "synced" : undefined,
      });

      prependBookmark(bookmark);
      if (userId) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          void upsertCloudBookmarks(supabase, userId, [bookmark]).catch(
            (error) => {
              console.warn("bookmark sync failed", error);
            },
          );
        }
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
      resolvedChunkIndex,
      runtimeChunks,
      userId,
    ],
  );

  const handleSaveHighlight = useCallback(async () => {
    if (!document || !activeChunk) {
      return;
    }

    const highlight = await saveHighlight({
      documentId: document.id,
      label: `Highlight ${highlights.length + 1}`,
      ownerId: userId,
      quote: activeChunk.text,
      note: highlightNote.trim() || undefined,
      chunkIndex: resolvedChunkIndex,
      tokenIndex: activeChunk.anchorTokenIndex,
      paragraphIndex: activeChunk.paragraphIndex,
      sectionIndex: activeChunk.sectionIndex,
      syncState: userId ? "synced" : undefined,
    });

    prependHighlight(highlight);
    if (userId) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        void upsertCloudHighlights(supabase, userId, [highlight]).catch(
          (error) => {
            console.warn("highlight sync failed", error);
          },
        );
      }
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
    resolvedChunkIndex,
    userId,
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
        ownerId: userId,
        quote: selectionText || anchorChunk.text,
        note: highlightNote.trim() || undefined,
        chunkIndex: resolvedIndex,
        tokenIndex: resolvedAnchor?.tokenIndex ?? anchorChunk.anchorTokenIndex,
        paragraphIndex:
          resolvedAnchor?.paragraphIndex ?? anchorChunk.paragraphIndex,
        sectionIndex: resolvedAnchor?.sectionIndex ?? anchorChunk.sectionIndex,
        syncState: userId ? "synced" : undefined,
      });

      prependHighlight(highlight);
      if (userId) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          void upsertCloudHighlights(supabase, userId, [highlight]).catch(
            (error) => {
              console.warn("highlight sync failed", error);
            },
          );
        }
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
      resolvedChunkIndex,
      runtimeChunks,
      userId,
    ],
  );

  const handleDeleteBookmark = useCallback(
    async (bookmarkIdToDelete: string) => {
      if (userId) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            await deleteCloudBookmark(supabase, userId, bookmarkIdToDelete);
          } catch (error) {
            console.warn("cloud bookmark delete failed", error);
          }
        }
      }

      await deleteBookmark(bookmarkIdToDelete);
      removeBookmark(bookmarkIdToDelete);
      announce("Bookmark deleted.");
    },
    [announce, removeBookmark, userId],
  );

  const handleDeleteHighlight = useCallback(
    async (highlightIdToDelete: string) => {
      if (userId) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            await deleteCloudHighlight(supabase, userId, highlightIdToDelete);
          } catch (error) {
            console.warn("cloud highlight delete failed", error);
          }
        }
      }

      await deleteHighlight(highlightIdToDelete);
      removeHighlight(highlightIdToDelete);
      announce("Highlight deleted.");
    },
    [announce, removeHighlight, userId],
  );

  const jumpToAnchor = useCallback(
    (anchor: { chunkIndex: number; tokenIndex: number }) => {
      const nextChunkIndex = resolveSessionChunkIndex(runtimeChunks, {
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
    [isPdfPageMode, moveToChunk, payload, runtimeChunks],
  );

  const jumpToBookmark = useCallback(
    (
      bookmark: Pick<
        Bookmark,
        "chunkIndex" | "label" | "sourcePageIndex" | "tokenIndex"
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
    (highlight: { chunkIndex: number; tokenIndex: number; label: string }) => {
      jumpToAnchor(highlight);
      announce(`${highlight.label} loaded.`);
    },
    [announce, jumpToAnchor],
  );

  const renderModeView = () => {
    if (!payload || !activeChunk) {
      return null;
    }

    switch (canvasMode) {
      case "classic-reader":
        return (
          <ClassicReaderView
            document={payload}
            chunk={activeChunk}
            reduceMotion={preferences.reduceMotion}
          />
        );
      case "phrase-chunk":
        return (
          <PhraseChunkView
            document={payload}
            chunk={activeChunk}
            chunks={runtimeChunks}
          />
        );
      case "guided-line":
        return (
          <GuidedLineView
            document={payload}
            chunk={activeChunk}
            chunks={runtimeChunks}
            focusWindow={preferences.focusWindow}
          />
        );
      default:
        return <FocusWordView document={payload} chunk={activeChunk} />;
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

  if (error || !payload || (!activeChunk && !isPdfPageMode)) {
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
      {mobileSidebarSection}
      <div className="fade-rise-delayed relative z-20">
        <p className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </p>

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
            sentenceCount={payload.sentences.length}
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
            onSelectTheme={handleThemeSelection}
            onToggleNaturalPauses={handleNaturalPausesToggle}
            onTogglePlayback={handlePlaybackToggle}
            onToggleReduceMotion={handleReduceMotionToggle}
            progress={progress}
          />
        )}
      </div>

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

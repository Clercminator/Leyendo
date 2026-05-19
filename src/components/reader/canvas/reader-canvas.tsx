"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  BookmarkPlus,
  Clock3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  SkipBack,
  SkipForward,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import {
  getReaderCanvasCopy,
  modeLabels,
  pdfViewModeLabels,
  presetCopy,
  themeLabels,
  themePreviewSwatchClassNames,
} from "@/components/reader/canvas/reader-canvas-content";
import { ReaderCanvasMobileTools } from "@/components/reader/canvas/reader-canvas-mobile-tools";
import { getLocalizedCopy } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { TextPresentation } from "@/types/document";
import {
  type PdfScrollMode,
  readerModes,
  readerPresets,
  type ReaderPreferences,
} from "@/types/reader";

interface ReaderCanvasPdfCompanionProps {
  currentPageIndex: number;
  currentPageLabel: string;
  pageCount: number;
  pageJumpError?: string;
  pageJumpValue: string;
  scrollMode: PdfScrollMode;
  searchQuery: string;
  searchStatusLabel: string;
  zoomLabel: string;
  onPageJump: () => void;
  onPageJumpValueChange: (value: string) => void;
  onPageStep: (delta: -1 | 1) => void;
  onSearchNext: () => void;
  onSearchPrevious: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectScrollMode: (scrollMode: PdfScrollMode) => void;
  onSelectZoomValue: (zoomValue: string) => void;
  onZoomStep: (steps: number) => void;
}

interface ReaderCanvasProps {
  activeGoalLabel?: string;
  availableModes?: (typeof readerModes)[number][];
  availableTextPresentations?: TextPresentation[];
  className?: string;
  chunkSize: number;
  currentParagraphNumber: number;
  isPlaying: boolean;
  modeLabel: string;
  modeView: React.ReactNode;
  pdfCompanion?: ReaderCanvasPdfCompanionProps;
  remainingWords?: number;
  remainingTimeLabel: string;
  preferences: ReaderPreferences;
  sentenceCount: number;
  onAnnounceRemainingTime: () => void;
  onChangeFontScale: (delta: number) => void;
  onChangeLineHeight: (delta: number) => void;
  onChangeWordsPerMinute: (delta: number) => void;
  onDecreaseChunkSize: () => void;
  onIncreaseChunkSize: () => void;
  onMoveBackward: () => void;
  onMoveBackwardFive: () => void;
  onMoveForward: () => void;
  onMoveForwardFive: () => void;
  onRepeatChunk: () => void;
  onRestart: () => void;
  onRestartParagraph: () => void;
  onReturnToOriginalPage?: () => void;
  onSaveBookmark: () => void;
  onSaveHighlight: () => void;
  onSelectMode: (mode: (typeof readerModes)[number]) => void;
  onSelectPreset: (presetId: (typeof readerPresets)[number]["id"]) => void;
  onSelectTextPresentation?: (presentation: TextPresentation) => void;
  onSelectTheme: (theme: ReaderPreferences["theme"]) => void;
  onToggleNaturalPauses: () => void;
  onTogglePlayback: () => void;
  onToggleReduceMotion: () => void;
  progress: number;
  textPresentation?: TextPresentation;
}

type ReaderCanvasMenu =
  | "mode"
  | "preset"
  | "text-presentation"
  | "theme"
  | "save"
  | "font-scale"
  | "line-height"
  | "playback"
  | "pdf-view"
  | "more";

type DesktopBottomMenu = Extract<
  ReaderCanvasMenu,
  "save" | "font-scale" | "line-height" | "playback" | "more"
>;

const desktopBottomMenus = new Set<DesktopBottomMenu>([
  "save",
  "font-scale",
  "line-height",
  "playback",
  "more",
]);

function isDesktopBottomMenu(
  value: ReaderCanvasMenu | null,
): value is DesktopBottomMenu {
  return value !== null && desktopBottomMenus.has(value as DesktopBottomMenu);
}

function shouldBlockPlaybackShortcut(args: {
  canvasElement: HTMLElement | null;
  target: EventTarget | null;
}) {
  const { canvasElement, target } = args;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (
    target.isContentEditable ||
    target.closest("[contenteditable='true']") ||
    target.closest(
      "input, textarea, select, button, a, summary, [role='button'], [role='link'], [role='menuitem'], [role='option'], [data-reader-token-index], [data-reader-line-index], [data-reader-paragraph-index]",
    )
  ) {
    return true;
  }

  if (target === document.body || target === document.documentElement) {
    return false;
  }

  return target !== document.body && Boolean(canvasElement && !canvasElement.contains(target));
}

function getCompactReaderChromeValue() {
  if (typeof window === "undefined") {
    return false;
  }

  const compactViewport =
    window.matchMedia?.("(max-width: 1023px)").matches ??
    window.innerWidth <= 1023;
  const touchViewport =
    (window.matchMedia?.("(hover: none), (pointer: coarse)").matches ??
      false) && window.innerWidth <= 1100;

  return compactViewport || touchViewport;
}

export function ReaderCanvas({
  activeGoalLabel,
  availableModes = [...readerModes],
  availableTextPresentations = ["clean", "literal"],
  className,
  chunkSize,
  currentParagraphNumber,
  isPlaying,
  modeLabel,
  modeView,
  pdfCompanion,
  remainingWords,
  remainingTimeLabel,
  preferences,
  sentenceCount,
  onAnnounceRemainingTime,
  onChangeFontScale,
  onChangeLineHeight,
  onChangeWordsPerMinute,
  onDecreaseChunkSize,
  onIncreaseChunkSize,
  onMoveBackward,
  onMoveBackwardFive,
  onMoveForward,
  onMoveForwardFive,
  onRepeatChunk,
  onRestart,
  onRestartParagraph,
  onReturnToOriginalPage,
  onSaveBookmark,
  onSaveHighlight,
  onSelectMode,
  onSelectPreset,
  onSelectTextPresentation,
  onSelectTheme,
  onToggleNaturalPauses,
  onTogglePlayback,
  onToggleReduceMotion,
  progress,
  textPresentation,
}: ReaderCanvasProps) {
  const { locale } = useLocale();
  const canvasRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<ReaderCanvasMenu | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompactReaderChrome, setIsCompactReaderChrome] = useState(false);
  const [isMobileChromeVisible, setIsMobileChromeVisible] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [isReaderDetailsPinned, setIsReaderDetailsPinned] = useState(false);
  const [isReaderDetailsHovered, setIsReaderDetailsHovered] = useState(false);
  const [isReaderDetailsFocused, setIsReaderDetailsFocused] = useState(false);
  const [desktopBottomMenuPanelStyle, setDesktopBottomMenuPanelStyle] =
    useState<CSSProperties>();
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const textPresentationMenuRef = useRef<HTMLDivElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const fontScaleMenuRef = useRef<HTMLDivElement>(null);
  const lineHeightMenuRef = useRef<HTMLDivElement>(null);
  const playbackMenuRef = useRef<HTMLDivElement>(null);
  const pdfViewMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const readerDetailsRef = useRef<HTMLDivElement>(null);
  const readerDetailsId = useId();
  const isReaderDetailsOpen =
    isReaderDetailsPinned || isReaderDetailsHovered || isReaderDetailsFocused;
  const transportButtonClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:w-auto sm:rounded-full sm:px-3.5";
  const compactStepButtonClass =
    "rounded-full border border-(--border-soft) bg-(--surface-chip) px-2.5 py-1.5 text-xs text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-strong)";
  const settingsTriggerClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:w-auto sm:rounded-full sm:px-3.5";
  const desktopBottomMenuPositionClass = isFullscreen
    ? "bottom-full top-auto"
    : "top-full bottom-auto";
  const settingsPanelClass = cn(
    "reader-dropdown-panel absolute left-0 z-60 w-[19rem] max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
    desktopBottomMenuPositionClass,
  );
  const settingsRowClass =
    "min-w-0 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5";
  const topControlButtonClass =
    "inline-flex min-h-9 w-auto max-w-full shrink-0 touch-manipulation items-center justify-between gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-[11px] tracking-[0.14em] text-(--text-strong) uppercase whitespace-nowrap transition hover:border-(--border-strong) hover:bg-(--surface-chip) active:scale-[0.985] sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-sm sm:justify-center";
  const statusChipClass =
    "inline-flex min-h-9 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-2 py-1.5 text-center text-[11px] leading-tight text-(--text-strong) sm:min-h-auto sm:px-3 sm:text-sm";
  const statusIconButtonClass =
    "inline-flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) text-(--text-muted) transition hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong) active:scale-[0.985] sm:h-10 sm:w-10";
  const readerDetailsStatClass =
    "flex min-h-11 items-center rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong)";
  const mobileStatCardClass =
    "rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-left";
  const mobilePrimaryButtonClass =
    "inline-flex min-h-10 touch-manipulation items-center justify-center gap-2 rounded-[0.95rem] border border-(--border-soft) bg-(--surface-soft) px-2.5 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) active:scale-[0.985]";
  const pdfToolbarButtonClass =
    "inline-flex min-h-10 touch-manipulation items-center justify-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) active:scale-[0.985]";
  const pdfToolbarChipClass =
    "inline-flex min-h-10 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-(--text-strong)";
  const pdfToolbarIconButtonClass =
    "rounded-full p-1 touch-manipulation text-(--text-strong) transition hover:bg-(--surface-chip) active:scale-[0.985]";
  const compactTopControlButtonClass = cn(
    topControlButtonClass,
    isCompactReaderChrome &&
      "min-h-8 rounded-[0.95rem] px-2.5 py-1.5 text-[10px] tracking-[0.12em] shadow-[0_14px_32px_rgba(20,26,56,0.08)] sm:min-h-9 sm:px-3 sm:py-2 sm:text-[11px]",
  );
  const compactDockSurfaceClass =
    "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-(--border-strong) bg-(--surface-card)/94 p-1 shadow-[0_18px_40px_rgba(20,26,56,0.18)] backdrop-blur-xl";
  const compactDockButtonClass =
    "inline-flex min-h-10 touch-manipulation items-center justify-center gap-2 rounded-full px-3 py-2 text-[11px] tracking-[0.16em] text-(--text-strong) uppercase transition hover:bg-(--surface-soft) active:scale-[0.985]";
  const compactDockIconButtonClass =
    "inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-(--text-strong) transition hover:bg-(--surface-soft) active:scale-[0.985]";

  const getDesktopBottomMenuElement = useCallback(
    (menu: DesktopBottomMenu) => {
      switch (menu) {
        case "save":
          return saveMenuRef.current;
        case "font-scale":
          return fontScaleMenuRef.current;
        case "line-height":
          return lineHeightMenuRef.current;
        case "playback":
          return playbackMenuRef.current;
        case "more":
          return moreMenuRef.current;
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isDesktopBottomMenu(openMenu) || isCompactReaderChrome) {
      setDesktopBottomMenuPanelStyle(undefined);
      return;
    }

    const updateDesktopBottomMenuPanelStyle = () => {
      const menuElement = getDesktopBottomMenuElement(openMenu);
      const panelElement = menuElement?.querySelector<HTMLElement>(
        ".reader-dropdown-panel",
      );
      const canvasElement = canvasRef.current;

      if (!menuElement || !panelElement || !canvasElement) {
        setDesktopBottomMenuPanelStyle(undefined);
        return;
      }

      const triggerRect = menuElement.getBoundingClientRect();
      const panelRect = panelElement.getBoundingClientRect();
      const canvasRect = canvasElement.getBoundingClientRect();
      const viewportPadding = 16;
      const canvasPadding = 16;
      const verticalGap = 12;
      const boundaryLeft = Math.max(viewportPadding, canvasRect.left + canvasPadding);
      const boundaryRight = Math.min(
        window.innerWidth - viewportPadding,
        canvasRect.right - canvasPadding,
      );
      const boundaryTop = Math.max(viewportPadding, canvasRect.top + canvasPadding);
      const boundaryBottom = Math.min(
        window.innerHeight - viewportPadding,
        canvasRect.bottom - canvasPadding,
      );
      const availableWidth = Math.max(
        triggerRect.width,
        boundaryRight - boundaryLeft,
      );
      const panelWidth = Math.min(panelRect.width, availableWidth);
      const baseLeft =
        openMenu === "more"
          ? triggerRect.right - panelWidth
          : triggerRect.left;
      const clampedLeft = Math.min(
        Math.max(baseLeft, boundaryLeft),
        Math.max(boundaryLeft, boundaryRight - panelWidth),
      );
      const horizontalOffset = clampedLeft - triggerRect.left;
      const spaceBelow = Math.max(
        0,
        boundaryBottom - triggerRect.bottom - verticalGap,
      );
      const spaceAbove = Math.max(
        0,
        triggerRect.top - boundaryTop - verticalGap,
      );

      let openAbove = false;

      if (isFullscreen && spaceAbove > 0) {
        openAbove = true;
      } else if (spaceBelow >= panelRect.height) {
        openAbove = false;
      } else if (spaceAbove >= panelRect.height) {
        openAbove = true;
      } else {
        openAbove = spaceAbove > spaceBelow;
      }

      const availableHeight = Math.max(0, openAbove ? spaceAbove : spaceBelow);

      setDesktopBottomMenuPanelStyle({
        bottom: openAbove ? `calc(100% + ${verticalGap}px)` : "auto",
        left: `${Math.round(horizontalOffset)}px`,
        maxHeight:
          availableHeight > 0 ? `${Math.round(availableHeight)}px` : undefined,
        maxWidth: availableWidth > 0 ? `${Math.round(availableWidth)}px` : undefined,
        overflowY: availableHeight < panelRect.height ? "auto" : undefined,
        overscrollBehavior: "contain",
        right: "auto",
        top: openAbove ? "auto" : `calc(100% + ${verticalGap}px)`,
      });
    };

    const frameId = window.requestAnimationFrame(
      updateDesktopBottomMenuPanelStyle,
    );
    const viewport = window.visualViewport;

    window.addEventListener("resize", updateDesktopBottomMenuPanelStyle);
    viewport?.addEventListener("resize", updateDesktopBottomMenuPanelStyle);
    viewport?.addEventListener("scroll", updateDesktopBottomMenuPanelStyle);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateDesktopBottomMenuPanelStyle);
      viewport?.removeEventListener(
        "resize",
        updateDesktopBottomMenuPanelStyle,
      );
      viewport?.removeEventListener(
        "scroll",
        updateDesktopBottomMenuPanelStyle,
      );
    };
  }, [getDesktopBottomMenuElement, isCompactReaderChrome, isFullscreen, openMenu]);

  const closeReaderDetails = useCallback(() => {
    setIsReaderDetailsPinned(false);
    setIsReaderDetailsHovered(false);
    setIsReaderDetailsFocused(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const resolveCompactReaderChrome = () => {
      setIsCompactReaderChrome(getCompactReaderChromeValue());
    };

    resolveCompactReaderChrome();
    window.addEventListener("resize", resolveCompactReaderChrome);

    return () => {
      window.removeEventListener("resize", resolveCompactReaderChrome);
    };
  }, []);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        modeMenuRef.current?.contains(target) ||
        presetMenuRef.current?.contains(target) ||
        textPresentationMenuRef.current?.contains(target) ||
        saveMenuRef.current?.contains(target) ||
        themeMenuRef.current?.contains(target) ||
        fontScaleMenuRef.current?.contains(target) ||
        lineHeightMenuRef.current?.contains(target) ||
        playbackMenuRef.current?.contains(target) ||
        pdfViewMenuRef.current?.contains(target) ||
        moreMenuRef.current?.contains(target)
      ) {
        return;
      }

      setOpenMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!isReaderDetailsPinned) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (readerDetailsRef.current?.contains(target)) {
        return;
      }

      closeReaderDetails();
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closeReaderDetails, isReaderDetailsPinned]);

  useEffect(() => {
    if (!isReaderDetailsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      closeReaderDetails();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeReaderDetails, isReaderDetailsOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === canvasRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileToolsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileToolsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileToolsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.code !== "Space" && event.key !== " ") ||
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        Boolean(openMenu) ||
        isMobileToolsOpen ||
        shouldBlockPlaybackShortcut({
          canvasElement: canvasRef.current,
          target: event.target,
        })
      ) {
        return;
      }

      event.preventDefault();
      onTogglePlayback();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileToolsOpen, onTogglePlayback, openMenu, preferences.mode]);

  const activePreset = readerPresets.find((preset) => {
    return (
      preset.mode === preferences.mode &&
      preset.wordsPerMinute === preferences.wordsPerMinute &&
      preset.chunkSize === chunkSize &&
      preset.focusWindow === preferences.focusWindow &&
      preset.naturalPauses === preferences.naturalPauses &&
      preset.smartPacing === preferences.smartPacing &&
      preset.reduceMotion === preferences.reduceMotion
    );
  });
  const activePresetSummary = activePreset
    ? getLocalizedCopy(locale, presetCopy[activePreset.id].summary)
    : null;

  const copy = getReaderCanvasCopy(locale, activeGoalLabel);
  const sessionCountSummary =
    typeof remainingWords === "number"
      ? locale === "en"
        ? `${sentenceCount} ${copy.sentenceCount} · ${remainingWords} ${remainingWords === 1 ? copy.word : copy.words} left`
        : locale === "es"
          ? `${sentenceCount} ${copy.sentenceCount} · ${remainingWords} ${remainingWords === 1 ? copy.word : copy.words} por delante`
          : `${sentenceCount} ${copy.sentenceCount} · ${remainingWords} ${remainingWords === 1 ? copy.word : copy.words} pela frente`
      : `${sentenceCount} ${copy.sentenceCount}`;

  const renderReaderDetailsButton = (args?: {
    className?: string;
    showFullscreenToggle?: boolean;
  }) => (
    <div className={cn("inline-flex items-center gap-2", args?.className)}>
      {args?.showFullscreenToggle ? (
        <button
          type="button"
          aria-label={
            isFullscreen ? copy.exitFullscreen : copy.enterFullscreen
          }
          onClick={() => {
            void toggleFullscreen();
          }}
          className={statusIconButtonClass}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isFullscreen ? copy.collapse : copy.expand}
          </span>
        </button>
      ) : null}
      <div
        ref={readerDetailsRef}
        className="relative inline-flex items-center"
        onMouseEnter={() => {
          if (isCompactReaderChrome) {
            return;
          }

          setIsReaderDetailsHovered(true);
        }}
        onMouseLeave={() => {
          if (isCompactReaderChrome) {
            return;
          }

          setIsReaderDetailsHovered(false);
        }}
        onFocusCapture={() => {
          setIsReaderDetailsFocused(true);
        }}
        onBlurCapture={(event) => {
          if (
            event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            return;
          }

          setIsReaderDetailsFocused(false);
        }}
      >
        <button
          type="button"
          aria-controls={readerDetailsId}
          aria-describedby={isReaderDetailsOpen ? readerDetailsId : undefined}
          aria-expanded={isReaderDetailsOpen}
          aria-label={copy.readerDetails}
          onClick={(event) => {
            const nextPinned = !isReaderDetailsPinned;

            setIsReaderDetailsPinned(nextPinned);

            if (!nextPinned) {
              setIsReaderDetailsFocused(false);
              event.currentTarget.blur();
            }
          }}
          className={`${statusIconButtonClass} ${isReaderDetailsOpen ? "border-(--border-strong) bg-(--surface-chip) text-(--text-strong)" : ""}`}
        >
          <Info className="h-4 w-4" />
        </button>
        {isReaderDetailsOpen ? (
          <div
            id={readerDetailsId}
            className="absolute top-full right-0 z-60 mt-2 w-[18rem] max-w-[calc(100vw-2rem)] rounded-[1rem] border border-(--border-strong) bg-(--surface-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl sm:w-[24rem]"
          >
            <div className="grid gap-2">
              <span className={readerDetailsStatClass}>
                {progress}% {copy.complete}
              </span>
              <span className={readerDetailsStatClass}>{sessionCountSummary}</span>
              <button
                type="button"
                aria-label={`${copy.timeLeft}: ${remainingTimeLabel}`}
                onClick={onAnnounceRemainingTime}
                className={`${readerDetailsStatClass} gap-2 text-left transition hover:border-(--border-strong) hover:bg-(--surface-chip)`}
              >
                <Clock3 className="h-4 w-4 text-(--accent-amber)" />
                {remainingTimeLabel}
              </button>
            </div>
            <div className="mt-3 border-t border-(--border-soft) pt-3">
              <p className="text-[11px] leading-5 text-(--text-muted) sm:text-xs">
                {copy.timeEstimateHelp}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-(--text-muted) sm:text-xs sm:leading-6">
                {copy.readingModeHelp}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const toggleFullscreen = async () => {
    if (!document.fullscreenEnabled) {
      return;
    }

    if (document.fullscreenElement === canvasRef.current) {
      await document.exitFullscreen();
      return;
    }

    await canvasRef.current?.requestFullscreen();
  };

  const toggleCompactControls = useCallback(() => {
    if (!isCompactReaderChrome) {
      return;
    }

    closeReaderDetails();
    setOpenMenu(null);
    if (isMobileToolsOpen) {
      setIsMobileToolsOpen(false);
    }
    setIsMobileChromeVisible((current) => !current);
  }, [closeReaderDetails, isCompactReaderChrome, isMobileToolsOpen]);

  const compactStatusPanel =
    isCompactReaderChrome && isMobileChromeVisible ? (
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="min-w-0">
          <span className={statusChipClass}>
            {copy.paragraph} {currentParagraphNumber}
          </span>
        </div>
        {renderReaderDetailsButton()}
      </div>
    ) : null;

  return (
    <section
      ref={canvasRef}
      id="reader-canvas"
      aria-labelledby="reader-canvas-title"
      tabIndex={-1}
      className={cn(
        "reader-canvas relative isolate flex h-[calc(100svh-5.75rem)] min-h-0 w-full flex-col gap-1.5 overflow-visible rounded-[1.1rem] border border-(--border-soft) bg-(--surface-strong) px-2 py-2 text-left sm:h-[calc(100svh-6.25rem)] sm:gap-2 sm:rounded-[1.35rem] sm:px-2.5 sm:py-2.5 md:h-[calc(100svh-8rem)] md:min-h-136 md:gap-5 md:rounded-[1.65rem] md:px-5 md:py-4 lg:h-[86vh] lg:min-h-176 lg:gap-6 lg:rounded-[1.75rem] lg:px-8 lg:py-6",
        className,
      )}
    >
      <h2 id="reader-canvas-title" className="sr-only">
        {copy.readerCanvas}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-2 sm:space-y-3.5">
          <div
            className={cn(
              isCompactReaderChrome
                ? "flex items-center gap-1.5 overflow-x-auto pb-0.5 text-sm"
                : "grid gap-2 text-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3",
            )}
          >
            <div ref={modeMenuRef} className="relative z-40">
              <button
                type="button"
                aria-label={copy.changeReadingMode}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "mode" ? null : "mode",
                  );
                }}
                className={cn(
                  compactTopControlButtonClass,
                  "text-(--accent-sky) tracking-[0.16em] sm:tracking-[0.22em]",
                )}
              >
                {modeLabel}
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "mode" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "mode" ? (
                <div className="reader-dropdown-panel absolute top-full left-0 z-60 mt-3 w-full min-w-0 rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl sm:min-w-60 lg:w-64 lg:max-w-[calc(100vw-2.5rem)]">
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.readingMode}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {availableModes.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          onSelectMode(value as (typeof readerModes)[number]);
                          setOpenMenu(null);
                        }}
                        className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                          preferences.mode === value
                            ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                            : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                        }`}
                      >
                        {getLocalizedCopy(locale, modeLabels[value])}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {onSelectTextPresentation && textPresentation ? (
              <div ref={textPresentationMenuRef} className="relative z-40">
                <button
                  type="button"
                  aria-label={copy.changeTextView}
                  onClick={() => {
                    setOpenMenu((current) =>
                      current === "text-presentation"
                        ? null
                        : "text-presentation",
                    );
                  }}
                    className={compactTopControlButtonClass}
                >
                  {textPresentation === "literal"
                    ? copy.literalText
                    : copy.cleanMarkdown}
                  <ChevronDown
                    className={`h-4 w-4 transition ${openMenu === "text-presentation" ? "rotate-180" : ""}`}
                  />
                </button>
                {openMenu === "text-presentation" ? (
                  <div className="reader-dropdown-panel absolute top-full left-0 z-60 mt-3 w-56 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl">
                    <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                      {copy.textViewMenu}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {availableTextPresentations.map((value) => {
                        const option = {
                          label:
                            value === "literal"
                              ? copy.literalText
                              : copy.cleanMarkdown,
                          value,
                        } as const;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onSelectTextPresentation(option.value);
                              setOpenMenu(null);
                            }}
                            className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                              textPresentation === option.value
                                ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                                : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {onReturnToOriginalPage ? (
              <button
                type="button"
                onClick={onReturnToOriginalPage}
                className={compactTopControlButtonClass}
              >
                {copy.returnToOriginalPage}
              </button>
            ) : null}
            {isCompactReaderChrome && pdfCompanion ? (
              <span className={`${statusChipClass} shrink-0`}>
                {copy.pageCountSummary({
                  currentPageNumber: pdfCompanion.currentPageIndex + 1,
                  pageCount: pdfCompanion.pageCount,
                })}
              </span>
            ) : null}
            {!isCompactReaderChrome ? (
              <div ref={themeMenuRef} className="relative z-40">
                <button
                  type="button"
                  aria-label={copy.changeTheme}
                  onClick={() => {
                    setOpenMenu((current) =>
                      current === "theme" ? null : "theme",
                    );
                  }}
                  className={compactTopControlButtonClass}
                >
                  {getLocalizedCopy(locale, themeLabels[preferences.theme])}
                  <ChevronDown
                    className={`h-4 w-4 transition ${openMenu === "theme" ? "rotate-180" : ""}`}
                  />
                </button>
                {openMenu === "theme" ? (
                  <div className="reader-dropdown-panel absolute top-full right-0 z-60 mt-3 w-56 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl">
                    <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                      {copy.themeMenu}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {Object.entries(themeLabels).map(([value, labels]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            onSelectTheme(value as ReaderPreferences["theme"]);
                            setOpenMenu(null);
                          }}
                          className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                            preferences.theme === value
                              ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                              : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                          }`}
                        >
                          {getLocalizedCopy(locale, labels)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {!isCompactReaderChrome ? (
              renderReaderDetailsButton({
                className: "justify-self-end lg:ml-auto",
                showFullscreenToggle: true,
              })
            ) : null}
          </div>
          {activePresetSummary ? (
            <p className="hidden text-sm leading-6 text-(--text-muted) lg:block">
              <span className="mr-2 inline-flex rounded-full border border-(--border-soft) bg-(--surface-soft) px-2.5 py-1 text-[11px] tracking-[0.18em] text-(--accent-amber) uppercase">
                {activePreset
                  ? getLocalizedCopy(locale, presetCopy[activePreset.id].label)
                  : copy.customPreset}
              </span>
              {activePresetSummary}
            </p>
          ) : null}
          {pdfCompanion ? (
            !isCompactReaderChrome ? (
              <div className="hidden gap-2 sm:gap-3 lg:grid">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className={pdfToolbarChipClass}>
                  <button
                    type="button"
                    onClick={() => {
                      pdfCompanion.onPageStep(-1);
                    }}
                    aria-label={copy.previousPage}
                    title={copy.previousPage}
                    className={pdfToolbarIconButtonClass}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm">
                    {copy.pageCountSummary({
                      currentPageNumber: pdfCompanion.currentPageIndex + 1,
                      pageCount: pdfCompanion.pageCount,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      pdfCompanion.onPageStep(1);
                    }}
                    aria-label={copy.nextPage}
                    title={copy.nextPage}
                    className={pdfToolbarIconButtonClass}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className={pdfToolbarChipClass}>
                  <input
                    value={pdfCompanion.pageJumpValue}
                    onChange={(event) => {
                      pdfCompanion.onPageJumpValueChange(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        pdfCompanion.onPageJump();
                      }
                    }}
                    aria-label={copy.jumpToPage}
                    placeholder={copy.pageFieldPlaceholder}
                    className="w-18 min-w-0 bg-transparent text-sm text-(--text-strong) placeholder:text-(--text-muted) focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={pdfCompanion.onPageJump}
                    className="rounded-full border border-(--border-soft) bg-(--surface-chip) px-2.5 py-1 text-xs font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-strong)"
                  >
                    {copy.goToPage}
                  </button>
                </div>

                <div ref={pdfViewMenuRef} className="relative z-40">
                  <button
                    type="button"
                    aria-label={`${copy.view}: ${pdfCompanion.zoomLabel}`}
                    onClick={() => {
                      setOpenMenu((current) =>
                        current === "pdf-view" ? null : "pdf-view",
                      );
                    }}
                    className={pdfToolbarButtonClass}
                  >
                    {copy.view}
                    <span className="text-(--text-muted) normal-case tracking-normal">
                      {pdfCompanion.zoomLabel}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition ${openMenu === "pdf-view" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openMenu === "pdf-view" ? (
                    <div
                      className={cn(
                        "reader-dropdown-panel absolute left-0 z-60 w-[19rem] max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
                        "top-full mt-3",
                      )}
                    >
                      <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                        {copy.viewMenu}
                      </p>
                      <div className="mt-3 grid gap-2">
                        <div className="flex items-center justify-between rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong)">
                          <button
                            type="button"
                            onClick={() => {
                              pdfCompanion.onZoomStep(-1);
                            }}
                            aria-label={copy.zoomOut}
                            title={copy.zoomOut}
                            className={pdfToolbarIconButtonClass}
                          >
                            <ZoomOut className="h-4 w-4" />
                          </button>
                          <span>{pdfCompanion.zoomLabel}</span>
                          <button
                            type="button"
                            onClick={() => {
                              pdfCompanion.onZoomStep(1);
                            }}
                            aria-label={copy.zoomIn}
                            title={copy.zoomIn}
                            className={pdfToolbarIconButtonClass}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {[
                            { label: copy.fitWidth, value: "page-width" },
                            { label: copy.fitPage, value: "page-fit" },
                            { label: copy.actualSize, value: "page-actual" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                pdfCompanion.onSelectZoomValue(option.value);
                                setOpenMenu(null);
                              }}
                              className={`rounded-full border px-3 py-2 text-sm transition ${
                                pdfCompanion.zoomLabel === option.label
                                  ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                                  : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(Object.entries(pdfViewModeLabels) as Array<
                            [PdfScrollMode, Record<"en" | "es" | "pt", string>]
                          >).map(([value, labels]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                pdfCompanion.onSelectScrollMode(value);
                                setOpenMenu(null);
                              }}
                              className={`rounded-full border px-3 py-2 text-sm transition ${
                                pdfCompanion.scrollMode === value
                                  ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                                  : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                              }`}
                            >
                              {getLocalizedCopy(locale, labels)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-2 rounded-[1.1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-(--text-strong)">
                <Search className="h-4 w-4 shrink-0 text-(--text-muted)" />
                <input
                  value={pdfCompanion.searchQuery}
                  onChange={(event) => {
                    pdfCompanion.onSearchQueryChange(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      pdfCompanion.onSearchNext();
                    }
                  }}
                  aria-label={copy.pdfSearch}
                  placeholder={copy.pdfSearch}
                  className="min-w-0 flex-1 bg-transparent text-sm text-(--text-strong) placeholder:text-(--text-muted) focus:outline-none"
                />
                <span className="text-[11px] tracking-[0.18em] text-(--text-muted) uppercase sm:text-xs">
                  {pdfCompanion.searchStatusLabel}
                </span>
                <button
                  type="button"
                  onClick={pdfCompanion.onSearchPrevious}
                  aria-label={copy.previous}
                  title={copy.previous}
                  className={pdfToolbarIconButtonClass}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={pdfCompanion.onSearchNext}
                  aria-label={copy.next}
                  title={copy.next}
                  className={pdfToolbarIconButtonClass}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {pdfCompanion.pageJumpError ? (
                <p className="px-1 text-sm text-(--accent-amber)">
                  {pdfCompanion.pageJumpError}
                </p>
              ) : null}
              </div>
            ) : null
          ) : null}
        </div>
        <div className="mt-2 flex min-h-0 flex-1 sm:mt-6">
          <div className="relative flex min-h-0 min-w-0 flex-1 items-stretch overflow-hidden *:h-full">
            {modeView}
          </div>
        </div>
      </div>

      {isCompactReaderChrome ? (
        <div className="pointer-events-none absolute right-3 bottom-3 z-40 lg:hidden">
          <div className={compactDockSurfaceClass}>
            <button
              type="button"
              aria-label={
                isMobileChromeVisible ? copy.hideControls : copy.controls
              }
              onClick={toggleCompactControls}
              className={cn(
                compactDockButtonClass,
                isMobileChromeVisible && "bg-(--surface-soft)",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {isMobileChromeVisible ? copy.hideControls : copy.controls}
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          isCompactReaderChrome
            ? "pointer-events-none absolute inset-x-2 bottom-16 z-30 lg:hidden"
            : "shrink-0 space-y-3 border-t border-(--border-soft) pt-4 sm:pt-5",
          isCompactReaderChrome && !isMobileChromeVisible && "hidden",
        )}
        aria-label="Reader transport and annotation controls"
      >
        {isCompactReaderChrome ? (
          <div className="pointer-events-auto rounded-[1.2rem] border border-(--border-strong) bg-(--surface-card)/96 p-2 shadow-[0_20px_50px_rgba(20,26,56,0.2)] backdrop-blur-xl">
            <div className="space-y-2.5">
              {compactStatusPanel}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                aria-label={copy.previous}
                onClick={onMoveBackward}
                className={mobilePrimaryButtonClass}
              >
                <ChevronLeft className="h-4 w-4" />
                {copy.previous}
              </button>
              <button
                type="button"
                aria-label={isPlaying ? copy.pause : copy.play}
                onClick={onTogglePlayback}
                className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[1rem] border border-(--accent-sky)/35 bg-(--accent-sky)/16 px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--accent-sky)/55 hover:bg-(--accent-sky)/24 active:scale-[0.985]"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isPlaying ? copy.pause : copy.play}
              </button>
              <button
                type="button"
                aria-label={copy.next}
                onClick={onMoveForward}
                className={mobilePrimaryButtonClass}
              >
                {copy.next}
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={copy.readingTools}
                onClick={() => {
                  setOpenMenu(null);
                  setIsMobileToolsOpen(true);
                }}
                className={mobilePrimaryButtonClass}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {copy.tools}
              </button>
            </div>
          </div>
        ) : null}
        {!isCompactReaderChrome ? (
          <div className="flex flex-wrap items-center gap-3">
            <div ref={saveMenuRef} className="relative z-30">
              <button
                type="button"
                aria-label={copy.save}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "save" ? null : "save",
                  );
                }}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--accent-amber)/35 bg-(--accent-amber)/16 px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--accent-amber)/55 hover:bg-(--accent-amber)/24 sm:w-auto sm:rounded-full sm:px-3.5"
              >
                <BookmarkPlus className="h-4 w-4" />
                {copy.save}
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "save" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "save" ? (
                <div
                  className={cn(
                    "reader-dropdown-panel absolute left-0 z-60 w-56 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
                    desktopBottomMenuPositionClass,
                  )}
                  style={desktopBottomMenuPanelStyle}
                >
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.saveMenu}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSaveBookmark();
                        setOpenMenu(null);
                      }}
                      className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    >
                      {copy.saveBookmark}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSaveHighlight();
                        setOpenMenu(null);
                      }}
                      className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    >
                      {copy.saveHighlight}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label={isPlaying ? copy.pause : copy.play}
              onClick={onTogglePlayback}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--accent-sky)/35 bg-(--accent-sky)/16 px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--accent-sky)/55 hover:bg-(--accent-sky)/24 sm:w-auto sm:rounded-full sm:px-3.5"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlaying ? copy.pause : copy.play}
            </button>
            <button
              type="button"
              aria-label={copy.previous}
              onClick={onMoveBackward}
              className={transportButtonClass}
            >
              <ChevronLeft className="h-4 w-4" />
              {copy.previous}
            </button>
            <button
              type="button"
              aria-label={copy.next}
              onClick={onMoveForward}
              className={transportButtonClass}
            >
              {copy.next}
              <ChevronRight className="h-4 w-4" />
            </button>
            <div ref={fontScaleMenuRef} className="relative z-30">
              <button
                type="button"
                aria-label={copy.fontScaleSettings}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "font-scale" ? null : "font-scale",
                  );
                }}
                className={settingsTriggerClass}
              >
                {copy.fontScale}
                <span className="text-(--text-muted)">
                  {preferences.fontScale.toFixed(1)}x
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "font-scale" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "font-scale" ? (
                <div className={settingsPanelClass} style={desktopBottomMenuPanelStyle}>
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.fontScale}
                  </p>
                  <div className={`${settingsRowClass} mt-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                          {copy.currentValue}
                        </p>
                        <p className="mt-1 text-sm text-(--text-strong)">
                          {preferences.fontScale.toFixed(1)}x
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={copy.decreaseFontScale}
                          onClick={() => {
                            onChangeFontScale(-0.1);
                          }}
                          className={compactStepButtonClass}
                        >
                          -0.1
                        </button>
                        <button
                          type="button"
                          aria-label={copy.increaseFontScale}
                          onClick={() => {
                            onChangeFontScale(0.1);
                          }}
                          className={compactStepButtonClass}
                        >
                          +0.1
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={lineHeightMenuRef} className="relative z-30">
              <button
                type="button"
                aria-label={copy.lineHeightSettings}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "line-height" ? null : "line-height",
                  );
                }}
                className={settingsTriggerClass}
              >
                {copy.lineHeight}
                <span className="text-(--text-muted)">
                  {preferences.lineHeight.toFixed(1)}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "line-height" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "line-height" ? (
                <div className={settingsPanelClass} style={desktopBottomMenuPanelStyle}>
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.lineHeight}
                  </p>
                  <div className={`${settingsRowClass} mt-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                          {copy.currentValue}
                        </p>
                        <p className="mt-1 text-sm text-(--text-strong)">
                          {preferences.lineHeight.toFixed(1)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={copy.decreaseLineHeight}
                          onClick={() => {
                            onChangeLineHeight(-0.1);
                          }}
                          className={compactStepButtonClass}
                        >
                          -0.1
                        </button>
                        <button
                          type="button"
                          aria-label={copy.increaseLineHeight}
                          onClick={() => {
                            onChangeLineHeight(0.1);
                          }}
                          className={compactStepButtonClass}
                        >
                          +0.1
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={playbackMenuRef} className="relative z-30">
              <button
                type="button"
                aria-label={copy.playbackSettings}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "playback" ? null : "playback",
                  );
                }}
                className={`${settingsTriggerClass} justify-between text-left sm:justify-center`}
              >
                <span className="flex flex-col items-start sm:contents">
                  <span>{copy.playback}</span>
                  <span className="text-xs text-(--text-muted) sm:hidden">
                    {preferences.wordsPerMinute} WPM · {chunkSize}{" "}
                    {chunkSize === 1 ? copy.word : copy.words}
                  </span>
                </span>
                <span className="hidden text-(--text-muted) sm:inline">
                  {preferences.wordsPerMinute} WPM
                </span>
                <span className="hidden text-(--text-muted)/60 sm:inline">
                  •
                </span>
                <span className="hidden text-(--text-muted) sm:inline">
                  {chunkSize} {chunkSize === 1 ? copy.word : copy.words}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "playback" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "playback" ? (
                <div className={settingsPanelClass} style={desktopBottomMenuPanelStyle}>
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.playback}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <div className={settingsRowClass}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                            {copy.speed}
                          </p>
                          <p className="mt-1 text-sm text-(--text-strong)">
                            {preferences.wordsPerMinute} WPM
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onChangeWordsPerMinute(-20);
                            }}
                            aria-label={copy.decreaseReadingSpeed}
                            className={compactStepButtonClass}
                          >
                            -20
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onChangeWordsPerMinute(20);
                            }}
                            aria-label={copy.increaseReadingSpeed}
                            className={compactStepButtonClass}
                          >
                            +20
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={settingsRowClass}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                            {copy.chunkSize}
                          </p>
                          <p className="mt-1 text-sm text-(--text-strong)">
                            {chunkSize}{" "}
                            {chunkSize === 1 ? copy.word : copy.words}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={onDecreaseChunkSize}
                            aria-label={copy.decreaseChunkSize}
                            className={compactStepButtonClass}
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={onIncreaseChunkSize}
                            aria-label={copy.increaseChunkSize}
                            className={compactStepButtonClass}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={onToggleNaturalPauses}
                        className={`rounded-[1rem] border px-3 py-3 text-left text-sm transition ${
                          preferences.naturalPauses
                            ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                            : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                        }`}
                      >
                        {copy.naturalPauses}
                      </button>
                      <button
                        type="button"
                        onClick={onToggleReduceMotion}
                        className={`rounded-[1rem] border px-3 py-3 text-left text-sm transition ${
                          preferences.reduceMotion
                            ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                            : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                        }`}
                      >
                        {copy.reduceMotion}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={moreMenuRef} className="relative z-30">
              <button
                type="button"
                aria-label={copy.moreActions}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "more" ? null : "more",
                  );
                }}
                className={settingsTriggerClass}
              >
                {copy.more}
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "more" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "more" ? (
                <div
                  className={cn(
                    "reader-dropdown-panel absolute right-0 z-60 w-80 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
                    desktopBottomMenuPositionClass,
                  )}
                  style={desktopBottomMenuPanelStyle}
                >
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.moreActions}
                  </p>
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                            {copy.presets}
                          </p>
                          <p className="mt-1 text-sm font-medium text-(--text-strong)">
                            {activePreset
                              ? getLocalizedCopy(
                                  locale,
                                  presetCopy[activePreset.id].label,
                                )
                              : copy.customPreset}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {readerPresets.map((preset) => {
                          const isActive = activePreset?.id === preset.id;

                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                onSelectPreset(preset.id);
                                setOpenMenu(null);
                              }}
                              className={`rounded-[1rem] border px-3 py-2.5 text-left transition ${
                                isActive
                                  ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                                  : "border-(--border-soft) bg-(--surface-card) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium">
                                  {getLocalizedCopy(
                                    locale,
                                    presetCopy[preset.id].label,
                                  )}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                    isActive
                                      ? "border-white/20 bg-white/10 text-white/80"
                                      : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted)"
                                  }`}
                                >
                                  {preset.wordsPerMinute} WPM
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onMoveBackwardFive();
                          setOpenMenu(null);
                        }}
                        className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      >
                        <span className="inline-flex items-center gap-2">
                          <SkipBack className="h-4 w-4" />
                          {copy.backFive}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRestart();
                          setOpenMenu(null);
                        }}
                        className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      >
                        <span className="inline-flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          {copy.restart}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRestartParagraph();
                          setOpenMenu(null);
                        }}
                        className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Undo2 className="h-4 w-4" />
                          {copy.restartParagraph}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRepeatChunk();
                          setOpenMenu(null);
                        }}
                        className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      >
                        <span className="inline-flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          {copy.repeatChunk}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onMoveForwardFive();
                          setOpenMenu(null);
                        }}
                        className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      >
                        <span className="inline-flex items-center gap-2">
                          <SkipForward className="h-4 w-4" />
                          {copy.forwardFive}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {isCompactReaderChrome && isMobileToolsOpen ? (
        <ReaderCanvasMobileTools
          availableTextPresentations={availableTextPresentations}
          chunkSize={chunkSize}
          copy={copy}
          isFullscreen={isFullscreen}
          locale={locale}
          pdfCompanion={pdfCompanion}
          preferences={preferences}
          textPresentation={textPresentation}
          onChangeFontScale={onChangeFontScale}
          onChangeLineHeight={onChangeLineHeight}
          onChangeWordsPerMinute={onChangeWordsPerMinute}
          onClose={() => {
            setIsMobileChromeVisible(false);
            setIsMobileToolsOpen(false);
          }}
          onDecreaseChunkSize={onDecreaseChunkSize}
          onIncreaseChunkSize={onIncreaseChunkSize}
          onMoveBackwardFive={onMoveBackwardFive}
          onMoveForwardFive={onMoveForwardFive}
          onRepeatChunk={onRepeatChunk}
          onRestart={onRestart}
          onRestartParagraph={onRestartParagraph}
          onReturnToOriginalPage={onReturnToOriginalPage}
          onSaveBookmark={onSaveBookmark}
          onSaveHighlight={onSaveHighlight}
          onSelectPreset={onSelectPreset}
          onSelectTextPresentation={onSelectTextPresentation}
          onSelectTheme={onSelectTheme}
          onToggleFullscreen={toggleFullscreen}
          onToggleNaturalPauses={onToggleNaturalPauses}
          onToggleReduceMotion={onToggleReduceMotion}
        />
      ) : null}
    </section>
  );
}

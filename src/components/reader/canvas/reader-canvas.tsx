"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BookmarkPlus,
  Clock3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  SkipBack,
  SkipForward,
  Undo2,
} from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import {
  getReaderCanvasCopy,
  modeLabels,
  presetCopy,
  themeLabels,
  themePreviewSwatchClassNames,
} from "@/components/reader/canvas/reader-canvas-content";
import { ReaderCanvasMobileTools } from "@/components/reader/canvas/reader-canvas-mobile-tools";
import { getLocalizedCopy } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { TextPresentation } from "@/types/document";
import {
  readerModes,
  readerPresets,
  type ReaderPreferences,
} from "@/types/reader";

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
  const [openMenu, setOpenMenu] = useState<
    | "mode"
    | "preset"
    | "text-presentation"
    | "theme"
    | "save"
    | "font-scale"
    | "line-height"
    | "playback"
    | "more"
    | null
  >(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompactReaderChrome, setIsCompactReaderChrome] = useState(false);
  const [isMobileChromeVisible, setIsMobileChromeVisible] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const textPresentationMenuRef = useRef<HTMLDivElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const fontScaleMenuRef = useRef<HTMLDivElement>(null);
  const lineHeightMenuRef = useRef<HTMLDivElement>(null);
  const playbackMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const transportButtonClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:w-auto sm:rounded-full sm:px-3.5";
  const compactStepButtonClass =
    "rounded-full border border-(--border-soft) bg-(--surface-chip) px-2.5 py-1.5 text-xs text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-strong)";
  const settingsTriggerClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:w-auto sm:rounded-full sm:px-3.5";
  const desktopBottomMenuPositionClass = isFullscreen
    ? "bottom-full top-auto mb-3 mt-0"
    : "top-full mt-3";
  const settingsPanelClass = cn(
    "reader-dropdown-panel absolute left-0 z-60 w-[19rem] max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
    desktopBottomMenuPositionClass,
  );
  const settingsRowClass =
    "min-w-0 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5";
  const topControlButtonClass =
    "inline-flex min-h-10 w-full shrink-0 items-center justify-between gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs tracking-[0.14em] text-(--text-strong) uppercase whitespace-nowrap transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-sm lg:w-auto lg:justify-center";
  const statusChipClass =
    "inline-flex min-h-9 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-2 py-1.5 text-center text-[11px] leading-tight text-(--text-strong) sm:min-h-auto sm:px-3 sm:text-sm";
  const mobileStatCardClass =
    "rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-left";
  const mobilePrimaryButtonClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-[0.95rem] border border-(--border-soft) bg-(--surface-soft) px-2.5 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const resolveCompactReaderChrome = () => {
      const compactViewport =
        window.matchMedia?.("(max-width: 1023px)").matches ??
        window.innerWidth <= 1023;
      const touchViewport =
        (window.matchMedia?.("(hover: none), (pointer: coarse)").matches ??
          false) &&
        window.innerWidth <= 1100;

      setIsCompactReaderChrome(compactViewport || touchViewport);
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
        preferences.mode === "pdf-page" ||
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

    const renderSessionCountChip = () => (
      <span className={statusChipClass}>{sessionCountSummary}</span>
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

    setOpenMenu(null);
    if (isMobileToolsOpen) {
      setIsMobileToolsOpen(false);
    }
    setIsMobileChromeVisible((current) => !current);
  }, [isCompactReaderChrome, isMobileToolsOpen]);

  return (
    <section
      ref={canvasRef}
      id="reader-canvas"
      aria-labelledby="reader-canvas-title"
      tabIndex={-1}
      className={cn(
        "reader-canvas relative isolate flex h-[calc(100svh-6.75rem)] min-h-120 w-full flex-col gap-3 overflow-visible rounded-[1.5rem] border border-(--border-soft) bg-(--surface-strong) px-3 py-3 text-left md:h-[calc(100svh-8rem)] md:min-h-136 md:gap-5 md:rounded-[1.65rem] md:px-5 md:py-4 lg:h-[86vh] lg:min-h-176 lg:gap-6 lg:rounded-[1.75rem] lg:px-8 lg:py-6",
        className,
      )}
    >
      <h2 id="reader-canvas-title" className="sr-only">
        {copy.readerCanvas}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "space-y-3 sm:space-y-4",
            !isMobileChromeVisible && isCompactReaderChrome && "hidden",
          )}
        >
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
            <div ref={modeMenuRef} className="relative z-40">
              <button
                type="button"
                aria-label={copy.changeReadingMode}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "mode" ? null : "mode",
                  );
                }}
                className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs tracking-[0.16em] text-(--accent-sky) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip) md:min-h-11 md:px-4 md:py-2.5 md:text-sm md:tracking-[0.22em] lg:w-auto lg:justify-center"
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
            <div ref={presetMenuRef} className="relative z-40">
              <button
                type="button"
                aria-label={copy.changePreset}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "preset" ? null : "preset",
                  );
                }}
                className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs tracking-widest text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip) md:min-h-11 md:px-4 md:py-2.5 md:text-sm md:tracking-[0.14em] lg:w-auto lg:justify-center"
              >
                {activePreset
                  ? getLocalizedCopy(locale, presetCopy[activePreset.id].label)
                  : copy.customPreset}
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "preset" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "preset" ? (
                <div className="reader-dropdown-panel absolute top-full left-0 z-60 mt-3 w-full min-w-0 rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl sm:min-w-[18rem] lg:w-80 lg:max-w-[calc(100vw-2.5rem)]">
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.presetMenu}
                  </p>
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
                          className={`rounded-[1rem] border px-3 py-3 text-left transition ${
                            isActive
                              ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                              : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">
                              {getLocalizedCopy(
                                locale,
                                presetCopy[preset.id].label,
                              )}
                            </p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                isActive
                                  ? "border-white/20 bg-white/10 text-white/80"
                                  : "border-(--border-soft) bg-(--surface-chip) text-(--text-muted)"
                              }`}
                            >
                              {preset.wordsPerMinute} WPM
                            </span>
                          </div>
                          <p
                            className={`mt-1.5 text-xs leading-5 ${isActive ? "text-white/80" : "text-(--text-muted)"}`}
                          >
                            {getLocalizedCopy(
                              locale,
                              presetCopy[preset.id].summary,
                            )}
                          </p>
                        </button>
                      );
                    })}
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
                  className={topControlButtonClass}
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
                  className={topControlButtonClass}
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
            {!isCompactReaderChrome && isFullscreen ? (
              <>
                <span className={statusChipClass}>
                  {progress}% {copy.complete}
                </span>
                {renderSessionCountChip()}
                <button
                  type="button"
                  aria-label={`${copy.timeLeft}: ${remainingTimeLabel}`}
                  onClick={onAnnounceRemainingTime}
                  className={`${statusChipClass} gap-2 transition hover:border-(--border-strong) hover:bg-(--surface-chip)`}
                >
                  <Clock3 className="h-4 w-4 text-(--accent-amber)" />
                  {remainingTimeLabel}
                </button>
              </>
            ) : null}
            {!isCompactReaderChrome ? (
              <button
                type="button"
                aria-label={
                  isFullscreen ? copy.exitFullscreen : copy.enterFullscreen
                }
                onClick={() => {
                  void toggleFullscreen();
                }}
                className={topControlButtonClass}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
                {isFullscreen ? copy.collapse : copy.expand}
              </button>
            ) : null}
          </div>
          {isCompactReaderChrome && isMobileChromeVisible ? (
            <div className="grid gap-2 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className={statusChipClass}>
                  {copy.paragraph} {currentParagraphNumber} · {progress}%
                </span>
                {renderSessionCountChip()}
                <button
                  type="button"
                  aria-label={`${copy.timeLeft}: ${remainingTimeLabel}`}
                  onClick={onAnnounceRemainingTime}
                  className={`${statusChipClass} gap-2 transition hover:border-(--border-strong) hover:bg-(--surface-chip)`}
                >
                  <Clock3 className="h-4 w-4 text-(--accent-amber)" />
                  {remainingTimeLabel}
                </button>
              </div>
            </div>
          ) : isFullscreen ? null : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={statusChipClass}>
                {progress}% {copy.complete}
              </span>
              {renderSessionCountChip()}
              <button
                type="button"
                aria-label={`${copy.timeLeft}: ${remainingTimeLabel}`}
                onClick={onAnnounceRemainingTime}
                className={`${statusChipClass} gap-2 transition hover:border-(--border-strong) hover:bg-(--surface-chip)`}
              >
                <Clock3 className="h-4 w-4 text-(--accent-amber)" />
                {remainingTimeLabel}
              </button>
            </div>
          )}
          <p className="hidden text-sm leading-6 text-(--text-muted) lg:block lg:leading-7">
            {copy.readingModeHelp}
          </p>
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
        </div>
        <div className="mt-3 flex min-h-0 flex-1 sm:mt-6">
          <div className="relative flex min-h-0 min-w-0 flex-1 items-stretch overflow-hidden *:h-full">
            {modeView}
          </div>
        </div>
        {isCompactReaderChrome ? (
          <div className="mt-3 flex justify-end lg:hidden">
            <button
              type="button"
              aria-label={
                isMobileChromeVisible ? copy.hideControls : copy.controls
              }
              onClick={toggleCompactControls}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs tracking-[0.16em] text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {isMobileChromeVisible ? copy.hideControls : copy.controls}
            </button>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "shrink-0 space-y-3 border-t border-(--border-soft) pt-4 sm:pt-5",
          isCompactReaderChrome ? !isMobileChromeVisible && "hidden" : "",
        )}
        aria-label="Reader transport and annotation controls"
      >
        {isCompactReaderChrome ? (
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-(--accent-sky)/35 bg-(--accent-sky)/16 px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--accent-sky)/55 hover:bg-(--accent-sky)/24"
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
                <div className={settingsPanelClass}>
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
                <div className={settingsPanelClass}>
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
                <div className={settingsPanelClass}>
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
                    "reader-dropdown-panel absolute right-0 z-60 w-56 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
                    desktopBottomMenuPositionClass,
                  )}
                >
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.moreActions}
                  </p>
                  <div className="mt-3 grid gap-2">
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
          onSaveBookmark={onSaveBookmark}
          onSaveHighlight={onSaveHighlight}
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

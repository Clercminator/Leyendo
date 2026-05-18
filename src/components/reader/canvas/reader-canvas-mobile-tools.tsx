import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  pdfViewModeLabels,
  themeLabels,
  themePreviewSwatchClassNames,
  type ReaderCanvasCopy,
} from "@/components/reader/canvas/reader-canvas-content";
import { getLocalizedCopy, type AppLocale } from "@/lib/locale";
import type { TextPresentation } from "@/types/document";
import type { PdfScrollMode, ReaderPreferences } from "@/types/reader";

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

interface ReaderCanvasMobileToolsProps {
  availableTextPresentations?: TextPresentation[];
  chunkSize: number;
  copy: ReaderCanvasCopy;
  isFullscreen: boolean;
  locale: AppLocale;
  pdfCompanion?: ReaderCanvasPdfCompanionProps;
  preferences: ReaderPreferences;
  textPresentation?: TextPresentation;
  onChangeFontScale: (delta: number) => void;
  onChangeLineHeight: (delta: number) => void;
  onChangeWordsPerMinute: (delta: number) => void;
  onClose: () => void;
  onDecreaseChunkSize: () => void;
  onIncreaseChunkSize: () => void;
  onMoveBackwardFive: () => void;
  onMoveForwardFive: () => void;
  onRepeatChunk: () => void;
  onRestart: () => void;
  onRestartParagraph: () => void;
  onReturnToOriginalPage?: () => void;
  onSaveBookmark: () => void;
  onSaveHighlight: () => void;
  onSelectTextPresentation?: (presentation: TextPresentation) => void;
  onSelectTheme: (theme: ReaderPreferences["theme"]) => void;
  onToggleFullscreen: () => Promise<void> | void;
  onToggleNaturalPauses: () => void;
  onToggleReduceMotion: () => void;
}

const compactStepButtonClass =
  "rounded-full border border-(--border-soft) bg-(--surface-chip) px-2.5 py-1.5 text-xs text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-strong)";
const settingsRowClass =
  "min-w-0 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5";
const mobileToolsSectionClass =
  "rounded-[1.05rem] border border-(--border-soft) bg-(--surface-strong) p-2.5 sm:p-3";
const sheetActionButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-[0.95rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)";
const sheetUtilityButtonClass =
  "inline-flex min-h-10 w-fit items-center justify-center gap-2 justify-self-start rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)";
const sheetHeaderButtonClass =
  "inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)";
const compactAdjustmentGroupClass = "grid shrink-0 grid-cols-2 gap-1.5";

export function ReaderCanvasMobileTools({
  availableTextPresentations = ["clean", "literal"],
  chunkSize,
  copy,
  isFullscreen,
  locale,
  pdfCompanion,
  preferences,
  textPresentation,
  onChangeFontScale,
  onChangeLineHeight,
  onChangeWordsPerMinute,
  onClose,
  onDecreaseChunkSize,
  onIncreaseChunkSize,
  onMoveBackwardFive,
  onMoveForwardFive,
  onRepeatChunk,
  onRestart,
  onRestartParagraph,
  onReturnToOriginalPage,
  onSaveBookmark,
  onSaveHighlight,
  onSelectTextPresentation,
  onSelectTheme,
  onToggleFullscreen,
  onToggleNaturalPauses,
  onToggleReduceMotion,
}: ReaderCanvasMobileToolsProps) {
  return (
    <div className="fixed inset-0 z-80 bg-slate-950/55 backdrop-blur-sm lg:hidden">
      <button
        type="button"
        aria-label={copy.closeTools}
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.readingTools}
        className="absolute inset-x-0 bottom-0 max-h-[82svh] overflow-y-auto rounded-t-[1.6rem] border border-(--border-strong) bg-(--surface-card) p-3.5 shadow-[0_-20px_80px_rgba(20,26,56,0.28)] sm:p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
              {copy.tools}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-(--text-strong)">
              {copy.readingTools}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={
                isFullscreen ? copy.exitFullscreen : copy.enterFullscreen
              }
              onClick={() => {
                void onToggleFullscreen();
                onClose();
              }}
              className={sheetHeaderButtonClass}
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
            <button
              type="button"
              aria-label={copy.closeTools}
              onClick={onClose}
              className={sheetHeaderButtonClass}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {onReturnToOriginalPage ? (
            <section className={mobileToolsSectionClass}>
              <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                {copy.pdfCompanion}
              </p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onReturnToOriginalPage();
                    onClose();
                  }}
                  className={sheetActionButtonClass}
                >
                  {copy.returnToOriginalPage}
                </button>
              </div>
            </section>
          ) : null}

          {pdfCompanion ? (
            <>
              <section className={mobileToolsSectionClass}>
                <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                  {copy.pdfPageControls}
                </p>
                <div className="mt-3 grid gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        pdfCompanion.onPageStep(-1);
                      }}
                      className={sheetActionButtonClass}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {copy.previousPage}
                    </button>
                    <div className="flex items-center justify-center rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-center text-sm text-(--text-strong)">
                      {copy.currentPageSummary({
                        currentPageLabel: pdfCompanion.currentPageLabel,
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        pdfCompanion.onPageStep(1);
                      }}
                      className={sheetActionButtonClass}
                    >
                      {copy.nextPage}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
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
                      className="min-w-0 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) placeholder:text-(--text-muted) focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={pdfCompanion.onPageJump}
                      className={sheetActionButtonClass}
                    >
                      {copy.goToPage}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong)">
                    <button
                      type="button"
                      onClick={() => {
                        pdfCompanion.onZoomStep(-1);
                      }}
                      aria-label={copy.zoomOut}
                      className={sheetHeaderButtonClass}
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
                      className={sheetHeaderButtonClass}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
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
                        }}
                        className={`rounded-[1rem] border px-3 py-3 text-sm transition ${
                          pdfCompanion.zoomLabel === option.label
                            ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                            : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(pdfViewModeLabels) as Array<
                      [PdfScrollMode, Record<"en" | "es" | "pt", string>]
                    >).map(([value, labels]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          pdfCompanion.onSelectScrollMode(value);
                        }}
                        className={`rounded-[1rem] border px-3 py-3 text-sm transition ${
                          pdfCompanion.scrollMode === value
                            ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                            : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                        }`}
                      >
                        {getLocalizedCopy(locale, labels)}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-center text-sm text-(--text-muted)">
                    {copy.pageCountSummary({
                      currentPageNumber: pdfCompanion.currentPageIndex + 1,
                      pageCount: pdfCompanion.pageCount,
                    })}
                  </div>
                  {pdfCompanion.pageJumpError ? (
                    <p className="text-sm text-(--accent-amber)">
                      {pdfCompanion.pageJumpError}
                    </p>
                  ) : null}
                </div>
              </section>

              <section className={mobileToolsSectionClass}>
                <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                  {copy.pdfSearchMenu}
                </p>
                <div className="mt-3 grid gap-2">
                  <div className="flex items-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-(--text-strong)">
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
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)">
                    <span className="text-(--text-muted)">
                      {pdfCompanion.searchStatusLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={pdfCompanion.onSearchPrevious}
                        aria-label={copy.previous}
                        className={sheetHeaderButtonClass}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={pdfCompanion.onSearchNext}
                        aria-label={copy.next}
                        className={sheetHeaderButtonClass}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          <section className={mobileToolsSectionClass}>
            <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
              {copy.saveMenu}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSaveBookmark();
                  onClose();
                }}
                className={sheetUtilityButtonClass}
              >
                <BookmarkPlus className="h-4 w-4" />
                {copy.saveBookmark}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveHighlight();
                  onClose();
                }}
                className={sheetActionButtonClass}
              >
                <BookmarkPlus className="h-4 w-4" />
                {copy.saveHighlight}
              </button>
            </div>
          </section>

          {onSelectTextPresentation && textPresentation ? (
            <section className={mobileToolsSectionClass}>
              <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                {copy.textView}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
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
                      }}
                      className={`rounded-[1rem] border px-3 py-3 text-left text-sm transition ${
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
            </section>
          ) : null}

          <section className={mobileToolsSectionClass}>
            <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
              {copy.appearance}
            </p>
            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className={settingsRowClass}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                        {copy.fontScale}
                      </p>
                      <p className="mt-1 text-sm text-(--text-strong)">
                        {preferences.fontScale.toFixed(1)}x
                      </p>
                    </div>
                    <div className={compactAdjustmentGroupClass}>
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
                <div className={settingsRowClass}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                        {copy.lineHeight}
                      </p>
                      <p className="mt-1 text-sm text-(--text-strong)">
                        {preferences.lineHeight.toFixed(1)}
                      </p>
                    </div>
                    <div className={compactAdjustmentGroupClass}>
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
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(themeLabels).map(([value, labels]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      onSelectTheme(value as ReaderPreferences["theme"]);
                    }}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-2 text-center text-[11px] leading-tight transition sm:text-xs ${
                      preferences.theme === value
                        ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                        : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-3 w-7 rounded-full border border-white/15 ${themePreviewSwatchClassNames[value as ReaderPreferences["theme"]]}`}
                    />
                    {getLocalizedCopy(locale, labels)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={mobileToolsSectionClass}>
            <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
              {copy.playback}
            </p>
            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className={settingsRowClass}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                        {copy.speed}
                      </p>
                      <p className="mt-1 text-sm text-(--text-strong)">
                        {preferences.wordsPerMinute} WPM
                      </p>
                    </div>
                    <div className={compactAdjustmentGroupClass}>
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                        {copy.chunkSize}
                      </p>
                      <p className="mt-1 text-sm text-(--text-strong)">
                        {chunkSize} {chunkSize === 1 ? copy.word : copy.words}
                      </p>
                    </div>
                    <div className={compactAdjustmentGroupClass}>
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
              </div>
              <div className="grid grid-cols-2 gap-2">
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
          </section>

          <section className={mobileToolsSectionClass}>
            <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
              {copy.moreActions}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onMoveBackwardFive();
                  onClose();
                }}
                className={sheetActionButtonClass}
              >
                <SkipBack className="h-4 w-4" />
                {copy.backFive}
              </button>
              <button
                type="button"
                onClick={() => {
                  onMoveForwardFive();
                  onClose();
                }}
                className={sheetActionButtonClass}
              >
                <SkipForward className="h-4 w-4" />
                {copy.forwardFive}
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestart();
                  onClose();
                }}
                className={sheetActionButtonClass}
              >
                <RotateCcw className="h-4 w-4" />
                {copy.restart}
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestartParagraph();
                  onClose();
                }}
                className={sheetActionButtonClass}
              >
                <Undo2 className="h-4 w-4" />
                {copy.restartParagraph}
              </button>
              <button
                type="button"
                onClick={() => {
                  onRepeatChunk();
                  onClose();
                }}
                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                <RotateCcw className="h-4 w-4" />
                {copy.repeatChunk}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
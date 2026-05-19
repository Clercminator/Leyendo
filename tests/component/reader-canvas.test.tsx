import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReaderCanvas } from "@/components/reader/reader-canvas";
import { defaultReaderPreferences } from "@/types/reader";

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

let mockViewportWidth = 1280;

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        (query === "(min-width: 1024px)" && mockViewportWidth >= 1024) ||
        (query === "(max-width: 1023px)" && mockViewportWidth <= 1023) ||
        false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderReaderCanvas(args?: {
  activeGoalLabel?: string;
  isPlaying?: boolean;
  modeView?: React.ReactNode;
  onReturnToOriginalPage?: () => void;
  pdfCompanion?: {
    currentPageIndex: number;
    currentPageLabel: string;
    pageCount: number;
    pageJumpError?: string;
    pageJumpValue: string;
    scrollMode: "continuous" | "single-page";
    searchQuery: string;
    searchStatusLabel: string;
    zoomLabel: string;
    onPageJump: () => void;
    onPageJumpValueChange: (value: string) => void;
    onPageStep: (delta: -1 | 1) => void;
    onSearchNext: () => void;
    onSearchPrevious: () => void;
    onSearchQueryChange: (value: string) => void;
    onSelectScrollMode: (scrollMode: "continuous" | "single-page") => void;
    onSelectZoomValue: (zoomValue: string) => void;
    onZoomStep: (steps: number) => void;
  };
  preferences?: typeof defaultReaderPreferences;
  remainingWords?: number;
}) {
  const activeGoalLabel =
    args && "activeGoalLabel" in args
      ? args.activeGoalLabel
      : "Practice focus";
  const handlers = {
    onChangeFontScale: vi.fn(),
    onChangeLineHeight: vi.fn(),
    onChangeWordsPerMinute: vi.fn(),
    onDecreaseChunkSize: vi.fn(),
    onIncreaseChunkSize: vi.fn(),
    onMoveBackward: vi.fn(),
    onMoveBackwardFive: vi.fn(),
    onMoveForward: vi.fn(),
    onMoveForwardFive: vi.fn(),
    onRepeatChunk: vi.fn(),
    onRestart: vi.fn(),
    onRestartParagraph: vi.fn(),
    onSaveBookmark: vi.fn(),
    onSaveHighlight: vi.fn(),
    onSelectMode: vi.fn(),
    onSelectPreset: vi.fn(),
    onSelectTheme: vi.fn(),
    onToggleNaturalPauses: vi.fn(),
    onTogglePlayback: vi.fn(),
    onToggleReduceMotion: vi.fn(),
  };

  return {
    ...handlers,
    ...render(
      <ReaderCanvas
        activeGoalLabel={activeGoalLabel}
        chunkSize={2}
        currentParagraphNumber={3}
        isPlaying={args?.isPlaying ?? false}
        modeLabel="Classic Reader"
        modeView={args?.modeView ?? <div>Mode view</div>}
        onReturnToOriginalPage={args?.onReturnToOriginalPage}
        pdfCompanion={args?.pdfCompanion}
        remainingWords={args?.remainingWords}
        remainingTimeLabel="2m 2s left"
        preferences={args?.preferences ?? defaultReaderPreferences}
        sentenceCount={8}
        onAnnounceRemainingTime={vi.fn()}
        onChangeFontScale={handlers.onChangeFontScale}
        onChangeLineHeight={handlers.onChangeLineHeight}
        onChangeWordsPerMinute={handlers.onChangeWordsPerMinute}
        onDecreaseChunkSize={handlers.onDecreaseChunkSize}
        onIncreaseChunkSize={handlers.onIncreaseChunkSize}
        onMoveBackward={handlers.onMoveBackward}
        onMoveBackwardFive={handlers.onMoveBackwardFive}
        onMoveForward={handlers.onMoveForward}
        onMoveForwardFive={handlers.onMoveForwardFive}
        onRepeatChunk={handlers.onRepeatChunk}
        onRestart={handlers.onRestart}
        onRestartParagraph={handlers.onRestartParagraph}
        onSaveBookmark={handlers.onSaveBookmark}
        onSaveHighlight={handlers.onSaveHighlight}
        onSelectMode={handlers.onSelectMode}
        onSelectPreset={handlers.onSelectPreset}
        onSelectTheme={handlers.onSelectTheme}
        onToggleNaturalPauses={handlers.onToggleNaturalPauses}
        onTogglePlayback={handlers.onTogglePlayback}
        onToggleReduceMotion={handlers.onToggleReduceMotion}
        progress={42}
      />,
    ),
  };
}

describe("ReaderCanvas", () => {
  beforeEach(() => {
    mockViewportWidth = 1280;
    installMatchMedia();
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
      writable: true,
    });

    document.exitFullscreen = vi.fn().mockImplementation(() => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        value: null,
        writable: true,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });

    HTMLElement.prototype.requestFullscreen = vi
      .fn()
      .mockImplementation(function (this: HTMLElement) {
        Object.defineProperty(document, "fullscreenElement", {
          configurable: true,
          value: this,
          writable: true,
        });
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      });
  });

  it("toggles fullscreen from the shared reader canvas", async () => {
    const user = userEvent.setup();

    renderReaderCanvas();

    const enterButton = screen.getByRole("button", {
      name: /enter fullscreen/i,
    });
    const infoButton = screen.getByRole("button", { name: /reader details/i });

    await user.click(enterButton);

    expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalledTimes(1);

    const exitButton = await screen.findByRole("button", {
      name: /exit fullscreen/i,
    });
    const detailsCluster = infoButton.parentElement?.parentElement as HTMLElement;

    expect(detailsCluster).toContainElement(exitButton);
    expect(detailsCluster).toContainElement(infoButton);
    expect(within(exitButton).getByText("Collapse")).toHaveClass("sr-only");

    await user.click(
      screen.getByRole("button", { name: /font scale settings/i }),
    );

    const fontScalePanel = screen
      .getByText("Current")
      .closest(".reader-dropdown-panel");

    expect(fontScalePanel).toHaveClass("bottom-full");
    expect(fontScalePanel).toHaveClass("top-auto");

    await user.click(exitButton);

    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("opens the mobile tools sheet and keeps save actions available", async () => {
    const user = userEvent.setup();
    mockViewportWidth = 390;
    installMatchMedia();
    const { onSaveBookmark, onSaveHighlight, onMoveForward } =
      renderReaderCanvas();

    expect(
      screen.queryByRole("button", { name: /change preset/i }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /controls/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /controls/i }));

    expect(screen.queryByText("42% complete")).not.toBeInTheDocument();
    expect(screen.queryByText("8 sentences")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /change theme/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /enter fullscreen/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reading tools/i }));

    const dialog = screen.getByRole("dialog", { name: /reading tools/i });

    expect(
      screen.getByRole("button", { name: /enter fullscreen/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /save bookmark/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /save highlight/i }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Presets")).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /save bookmark/i }),
    );

    expect(onSaveBookmark).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /reading tools/i }));

    const reopenedDialog = screen.getByRole("dialog", {
      name: /reading tools/i,
    });

    await user.click(
      within(reopenedDialog).getByRole("button", { name: /save highlight/i }),
    );

    expect(onSaveHighlight).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole("button", { name: /next/i })[0]);

    expect(onMoveForward).toHaveBeenCalledTimes(1);

    expect(
      screen.getByRole("button", { name: /controls/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: /reading tools/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps a compact PDF summary visible and exposes full PDF controls through the mobile tools sheet", async () => {
    const user = userEvent.setup();
    mockViewportWidth = 390;
    installMatchMedia();

    renderReaderCanvas({
      onReturnToOriginalPage: vi.fn(),
      pdfCompanion: {
        currentPageIndex: 0,
        currentPageLabel: "1",
        pageCount: 3,
        pageJumpValue: "1",
        scrollMode: "continuous",
        searchQuery: "Leyendo",
        searchStatusLabel: "1 of 1",
        zoomLabel: "Fit width",
        onPageJump: vi.fn(),
        onPageJumpValueChange: vi.fn(),
        onPageStep: vi.fn(),
        onSearchNext: vi.fn(),
        onSearchPrevious: vi.fn(),
        onSearchQueryChange: vi.fn(),
        onSelectScrollMode: vi.fn(),
        onSelectZoomValue: vi.fn(),
        onZoomStep: vi.fn(),
      },
    });

    expect(
      screen.getByRole("button", { name: /return to original page/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /search this pdf/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^view$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /controls/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /controls/i }));

    expect(
      screen.queryByRole("textbox", { name: /search this pdf/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reading tools/i }));

    const dialog = screen.getByRole("dialog", { name: /reading tools/i });

    expect(
      within(dialog).getByRole("textbox", { name: /search this pdf/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /fit width/i }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("1 of 3")).toBeInTheDocument();
  });

  it("merges desktop pdf navigation and keeps zoom and presets inside menus", async () => {
    const user = userEvent.setup();
    const onPageStep = vi.fn();
    const onZoomStep = vi.fn();
    const onSelectZoomValue = vi.fn();
    const { onSelectPreset } = renderReaderCanvas({
      pdfCompanion: {
        currentPageIndex: 0,
        currentPageLabel: "1",
        pageCount: 3,
        pageJumpValue: "1",
        scrollMode: "continuous",
        searchQuery: "",
        searchStatusLabel: "Search the document",
        zoomLabel: "100%",
        onPageJump: vi.fn(),
        onPageJumpValueChange: vi.fn(),
        onPageStep,
        onSearchNext: vi.fn(),
        onSearchPrevious: vi.fn(),
        onSearchQueryChange: vi.fn(),
        onSelectScrollMode: vi.fn(),
        onSelectZoomValue,
        onZoomStep,
      },
    });

    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(/^Page 1$/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next page/i }));

    expect(onPageStep).toHaveBeenCalledWith(1);

    const viewButton = screen.getByRole("button", { name: /view: 100%/i });

    expect(viewButton).toHaveTextContent("View");
    expect(viewButton).toHaveTextContent("100%");

    await user.click(viewButton);

    const viewPanel = screen
      .getByText("PDF view tools")
      .closest(".reader-dropdown-panel") as HTMLElement;

    await user.click(
      within(viewPanel).getByRole("button", { name: /zoom in/i }),
    );

    expect(onZoomStep).toHaveBeenCalledWith(1);

    await user.click(
      within(viewPanel).getByRole("button", { name: /fit page/i }),
    );

    expect(onSelectZoomValue).toHaveBeenCalledWith("page-fit");

    await user.click(screen.getByRole("button", { name: /more actions/i }));

    const morePanel = screen
      .getByText("More actions")
      .closest(".reader-dropdown-panel") as HTMLElement;

    expect(within(morePanel).getByText("Presets")).toBeInTheDocument();

    await user.click(
      within(morePanel).getByRole("button", { name: /beginner/i }),
    );

    expect(onSelectPreset).toHaveBeenCalledWith("beginner");
  });

  it("shows the sentence and words-left summary inside reader details on desktop", async () => {
    const user = userEvent.setup();

    renderReaderCanvas({ remainingWords: 120 });

    expect(
      screen.queryByText("8 sentences · 120 words left"),
    ).not.toBeInTheDocument();

    await user.hover(screen.getByRole("button", { name: /reader details/i }));

    expect(screen.getByText("8 sentences · 120 words left")).toBeInTheDocument();
    expect(screen.getAllByText("8 sentences · 120 words left")).toHaveLength(1);
  });

  it("keeps the sentence and words-left summary behind compact controls on mobile", async () => {
    const user = userEvent.setup();
    mockViewportWidth = 390;
    installMatchMedia();

    renderReaderCanvas({ remainingWords: 120 });

    expect(
      screen.queryByText("8 sentences · 120 words left"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /controls/i }));

    expect(
      screen.queryByText("8 sentences · 120 words left"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reader details/i }));

    expect(screen.getByText("8 sentences · 120 words left")).toBeInTheDocument();
    expect(screen.getAllByText("8 sentences · 120 words left")).toHaveLength(1);
  });

  it("shows the shared reader info details only while hovered on desktop", async () => {
    const user = userEvent.setup();

    renderReaderCanvas({ activeGoalLabel: undefined });

    const infoButton = screen.getByRole("button", { name: /reader details/i });

    expect(
      screen.queryByRole("button", { name: /time left: 2m 2s left/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("42% complete")).not.toBeInTheDocument();
    expect(screen.queryByText("8 sentences")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Time is an estimate. It can change with reading mode, pacing, and motion settings.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "This session is currently customized beyond a saved onboarding goal.",
      ),
    ).not.toBeInTheDocument();

    await user.hover(infoButton);

    expect(screen.getByText("42% complete")).toBeInTheDocument();
    expect(screen.getByText("8 sentences")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /time left: 2m 2s left/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Time is an estimate. It can change with reading mode, pacing, and motion settings.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This session is currently customized beyond a saved onboarding goal.",
      ),
    ).toBeInTheDocument();

    await user.unhover(infoButton);

    await waitFor(() => {
      expect(
        screen.queryByText(
          "Time is an estimate. It can change with reading mode, pacing, and motion settings.",
        ),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText(
        "This session is currently customized beyond a saved onboarding goal.",
      ),
    ).not.toBeInTheDocument();
  });

  it("toggles the shared reader info details from compact mobile controls", async () => {
    const user = userEvent.setup();
    mockViewportWidth = 390;
    installMatchMedia();

    renderReaderCanvas({ activeGoalLabel: undefined });

    await user.click(screen.getByRole("button", { name: /controls/i }));

    const infoButton = screen.getByRole("button", { name: /reader details/i });

    expect(
      screen.queryByText(
        "Time is an estimate. It can change with reading mode, pacing, and motion settings.",
      ),
    ).not.toBeInTheDocument();

    await user.click(infoButton);

    expect(
      screen.getByText(
        "Time is an estimate. It can change with reading mode, pacing, and motion settings.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This session is currently customized beyond a saved onboarding goal.",
      ),
    ).toBeInTheDocument();

    await user.click(infoButton);

    await waitFor(() => {
      expect(
        screen.queryByText(
          "Time is an estimate. It can change with reading mode, pacing, and motion settings.",
        ),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText(
        "This session is currently customized beyond a saved onboarding goal.",
      ),
    ).not.toBeInTheDocument();
  });

  it("toggles playback with Space from the reader surface", async () => {
    const { onTogglePlayback } = renderReaderCanvas();

    fireEvent.keyDown(document, { code: "Space", key: " " });

    expect(onTogglePlayback).toHaveBeenCalledTimes(1);
  });

  it("does not toggle playback with Space from interactive fields or token targets", async () => {
    const user = userEvent.setup();
    const { onTogglePlayback } = renderReaderCanvas({
      modeView: (
        <div>
          <textarea aria-label="Reader notes" />
          <div data-reader-token-index="1" tabIndex={0}>
            Token target
          </div>
        </div>
      ),
    });

    const textarea = screen.getByRole("textbox", { name: /reader notes/i });
    textarea.focus();

    await user.keyboard("{Space}");

    expect(onTogglePlayback).not.toHaveBeenCalled();

    const tokenTarget = screen.getByText("Token target");
    tokenTarget.focus();

    await user.keyboard("{Space}");

    expect(onTogglePlayback).not.toHaveBeenCalled();
  });

  it("does not toggle playback with Space while the mobile tools sheet is open", async () => {
    const user = userEvent.setup();
    mockViewportWidth = 390;
    installMatchMedia();

    const { onTogglePlayback } = renderReaderCanvas({
      pdfCompanion: {
        currentPageIndex: 0,
        currentPageLabel: "1",
        pageCount: 1,
        pageJumpValue: "1",
        scrollMode: "continuous",
        searchQuery: "",
        searchStatusLabel: "Search the document",
        zoomLabel: "Fit width",
        onPageJump: vi.fn(),
        onPageJumpValueChange: vi.fn(),
        onPageStep: vi.fn(),
        onSearchNext: vi.fn(),
        onSearchPrevious: vi.fn(),
        onSearchQueryChange: vi.fn(),
        onSelectScrollMode: vi.fn(),
        onSelectZoomValue: vi.fn(),
        onZoomStep: vi.fn(),
      },
    });

    await user.click(screen.getByRole("button", { name: /controls/i }));
    await user.click(screen.getByRole("button", { name: /reading tools/i }));

    await user.keyboard("{Space}");

    expect(onTogglePlayback).not.toHaveBeenCalled();
  });
});

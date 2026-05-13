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
    const themeButton = screen.getByRole("button", { name: /change theme/i });

    await user.click(enterButton);

    expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalledTimes(1);

    const exitButton = await screen.findByRole("button", {
      name: /exit fullscreen/i,
    });
    const topRow = exitButton.parentElement as HTMLElement;
    const themeControl = themeButton.parentElement as HTMLElement;
    const sentenceChip = within(topRow).getByText("8 sentences");

    await waitFor(() => {
      expect(exitButton).toHaveTextContent("Collapse");
    });

    expect(
      themeControl.compareDocumentPosition(sentenceChip) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      sentenceChip.compareDocumentPosition(exitButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    );

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
      screen.getByRole("button", { name: /controls/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /controls/i }));

    expect(screen.queryByText("42% complete")).not.toBeInTheDocument();
    expect(screen.getAllByText("8 sentences")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /change theme/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /enter fullscreen/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reading tools/i }));

    const dialog = screen.getByRole("dialog", { name: /reading tools/i });

    expect(
      within(dialog).getByRole("button", { name: /enter fullscreen/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /save bookmark/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /save highlight/i }),
    ).toBeInTheDocument();

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

  it("shows the sentence and words-left summary as a single chip on desktop", () => {
    renderReaderCanvas({ remainingWords: 120 });

    expect(screen.getByText("8 sentences · 120 words left")).toBeInTheDocument();
    expect(screen.getAllByText("8 sentences · 120 words left")).toHaveLength(1);
  });

  it("shows the sentence and words-left summary once on compact mobile", () => {
    mockViewportWidth = 390;
    installMatchMedia();

    renderReaderCanvas({ remainingWords: 120 });

    expect(screen.getByText("8 sentences · 120 words left")).toBeInTheDocument();
    expect(screen.getAllByText("8 sentences · 120 words left")).toHaveLength(1);
  });

  it("shows the shared reader info details only while hovered on desktop", async () => {
    const user = userEvent.setup();

    renderReaderCanvas({ activeGoalLabel: undefined });

    const timeLeftButton = screen.getByRole("button", {
      name: /time left: 2m 2s left/i,
    });
    const infoButton = screen.getByRole("button", { name: /reader details/i });

    expect(
      timeLeftButton.compareDocumentPosition(infoButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  it("does not toggle playback with Space in PDF mode", async () => {
    const user = userEvent.setup();
    const { onTogglePlayback } = renderReaderCanvas({
      preferences: {
        ...defaultReaderPreferences,
        mode: "pdf-page",
      },
    });

    await user.keyboard("{Space}");

    expect(onTogglePlayback).not.toHaveBeenCalled();
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
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

function renderReaderCanvas() {
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
        activeGoalLabel="Practice focus"
        chunkSize={2}
        currentParagraphNumber={3}
        isPlaying={false}
        modeLabel="Classic Reader"
        modeView={<div>Mode view</div>}
        remainingTimeLabel="2m 2s left"
        preferences={defaultReaderPreferences}
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

    await user.click(screen.getByRole("button", { name: /font scale settings/i }));

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
    const { onSaveBookmark, onSaveHighlight, onMoveForward } =
      renderReaderCanvas();

    expect(
      screen.getByText(/tap the text to show controls/i),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Mode view"));

    expect(
      screen.queryByText(/tap the text to show controls/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change theme/i })).toHaveClass(
      "hidden",
    );
    expect(
      screen.getByRole("button", { name: /enter fullscreen/i }),
    ).toHaveClass("hidden");

    await user.click(screen.getByRole("button", { name: /reading tools/i }));

    const dialog = screen.getByRole("dialog", { name: /reading tools/i });

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
  });
});

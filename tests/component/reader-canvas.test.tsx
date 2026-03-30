import { render, screen, waitFor } from "@testing-library/react";
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
  return render(
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
      onChangeFontScale={vi.fn()}
      onChangeLineHeight={vi.fn()}
      onChangeWordsPerMinute={vi.fn()}
      onDecreaseChunkSize={vi.fn()}
      onIncreaseChunkSize={vi.fn()}
      onMoveBackward={vi.fn()}
      onMoveBackwardFive={vi.fn()}
      onMoveForward={vi.fn()}
      onMoveForwardFive={vi.fn()}
      onRepeatChunk={vi.fn()}
      onRestart={vi.fn()}
      onRestartParagraph={vi.fn()}
      onSaveBookmark={vi.fn()}
      onSaveHighlight={vi.fn()}
      onSelectMode={vi.fn()}
      onSelectPreset={vi.fn()}
      onSelectTheme={vi.fn()}
      onToggleNaturalPauses={vi.fn()}
      onTogglePlayback={vi.fn()}
      onToggleReduceMotion={vi.fn()}
      progress={42}
    />,
  );
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

    HTMLElement.prototype.requestFullscreen = vi.fn().mockImplementation(function (this: HTMLElement) {
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

    await user.click(enterButton);

    expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /exit fullscreen/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /exit fullscreen/i }));

    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GuidedLineView } from "@/components/reader/guided-line-view";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
import { deriveRuntimeChunks } from "@/features/reader/engine/navigation";
import { defaultReaderPreferences } from "@/types/reader";

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

describe("GuidedLineView", () => {
  it("jumps to a clicked line or token", async () => {
    const user = userEvent.setup();
    const onJumpToToken = vi.fn();
    const documentModel = buildDocumentModel({
      title: "Guided sample",
      rawText:
        "This first sentence stays readable while the second sentence provides a second line for tapping.",
      sourceKind: "plain-text",
      chunkSize: 1,
    });
    const chunks = deriveRuntimeChunks(documentModel, {
      ...defaultReaderPreferences,
      chunkSize: 2,
      mode: "guided-line",
    });
    const activeChunk = chunks[0];

    const { container } = render(
      <GuidedLineView
        chunk={activeChunk!}
        chunks={chunks}
        document={documentModel}
        focusWindow={defaultReaderPreferences.focusWindow}
        onJumpToToken={onJumpToToken}
      />,
    );

    await user.click(
      container.querySelector('[data-reader-line-index="0"]') as HTMLElement,
    );
    expect(onJumpToToken).toHaveBeenCalledWith(activeChunk!.anchorTokenIndex);

    const tokenTarget = container.querySelector(
      '[data-reader-token-index="2"]',
    ) as HTMLElement;
    await user.click(tokenTarget);
    expect(onJumpToToken).toHaveBeenCalledWith(2);
  });
});

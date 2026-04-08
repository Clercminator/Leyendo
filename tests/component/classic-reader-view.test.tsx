import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClassicReaderView } from "@/components/reader/classic-reader-view";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
import { deriveRuntimeChunks } from "@/features/reader/engine/navigation";

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

describe("ClassicReaderView", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders contiguous active tokens as one highlighted chunk", () => {
    const documentModel = buildDocumentModel({
      title: "Classic sample",
      rawText: "Reading increases your knowledge and improves recall.",
      sourceKind: "plain-text",
      chunkSize: 1,
    });
    const chunk = deriveRuntimeChunks(documentModel, 3)[0];

    expect(chunk).toBeDefined();

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
      />,
    );

    const activeRuns = container.querySelectorAll(".reader-classic-active-run");

    expect(activeRuns).toHaveLength(1);
    expect(
      Array.from(activeRuns).map((run) => run.textContent?.trim()),
    ).toEqual(["Reading increases your"]);
    expect(
      container.querySelector('[data-reader-classic-active="true"]'),
    ).not.toHaveClass("reader-active-paragraph");
  });

  it("jumps to a clicked paragraph token", async () => {
    const user = userEvent.setup();
    const onJumpToToken = vi.fn();
    const documentModel = buildDocumentModel({
      title: "Classic sample",
      rawText: "Reading increases your knowledge and improves recall.",
      sourceKind: "plain-text",
      chunkSize: 1,
    });
    const chunk = deriveRuntimeChunks(documentModel, 3)[0];

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        onJumpToToken={onJumpToToken}
        reduceMotion
      />,
    );

    await user.click(
      container.querySelector('[data-reader-token-index="3"]') as HTMLElement,
    );
    expect(onJumpToToken).toHaveBeenCalledWith(3);

    await user.click(
      container.querySelector(
        '[data-reader-paragraph-index="0"]',
      ) as HTMLElement,
    );
    expect(onJumpToToken).toHaveBeenCalledWith(0);
  });
});

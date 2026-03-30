import { render } from "@testing-library/react";
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

  it("renders one active run span for a contiguous active phrase", () => {
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
    expect(activeRuns[0]?.textContent?.trim()).toBe("Reading increases your");
  });
});
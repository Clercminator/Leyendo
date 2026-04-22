import { render, screen, waitFor } from "@testing-library/react";
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
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (_id: string, chart: string) => ({
      svg: `<svg data-mermaid-diagram="true"><text>${chart}</text></svg>`,
      bindFunctions: undefined,
    })),
  },
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

  it("renders clean markdown in classic mode like a markdown preview", () => {
    const documentModel = buildDocumentModel({
      title: "Markdown sample",
      rawText:
        "# Optiland AI Agent - Comprehensive Documentation\n\n## Table of Contents\n\n- [Buyer Handoff Snapshot](#buyer-handoff-snapshot)\n- [Quick Start Guide](#quick-start-guide)\n  - [For Complete Beginners](#for-complete-beginners)\n\nParagraph with **bold** text.",
      sourceKind: "markdown",
      chunkSize: 1,
    });
    const chunk = deriveRuntimeChunks(documentModel, 3)[0];

    render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /optiland ai agent - comprehensive documentation/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: /table of contents/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /buyer handoff snapshot/i }),
    ).toHaveAttribute("href", "#buyer-handoff-snapshot");
    expect(screen.getByText(/for complete beginners/i)).toBeVisible();
    expect(screen.getByText(/paragraph with/i)).toBeVisible();
  });
  it("renders mermaid fences as in-app diagrams in classic markdown view", async () => {
    const documentModel = buildDocumentModel({
      title: "Markdown mermaid sample",
      rawText: "# Heading\n\n```mermaid\ngraph TD\nA-->B\n```",
      sourceKind: "markdown",
      chunkSize: 1,
    });
    const chunk = deriveRuntimeChunks(documentModel, 2)[0];

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("reader-mermaid-diagram")).toBeVisible();
      expect(
        container.querySelector('[data-mermaid-diagram="true"]'),
      ).toBeTruthy();
    });
  });
});

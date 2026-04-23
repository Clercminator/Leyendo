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

  it("jumps to GitHub-style TOC anchors in simplified markdown preview", async () => {
    const user = userEvent.setup();
    const onJumpToToken = vi.fn();
    const documentModel = buildDocumentModel({
      title: "Markdown TOC sample",
      rawText:
        "# Sample Document\n\n## Table of Contents\n\n1. [Overview & Purpose](#overview--purpose)\n2. [Wrap-up](#wrap-up)\n\n## Overview & Purpose\n\nThis section explains the overall shape.\n\n## Wrap-up\n\nThis section closes the sample.",
      sourceKind: "markdown",
      chunkSize: 1,
    });
    const overviewHeading = documentModel.blocks.find(
      (block) => block.kind === "heading" && block.text === "Overview & Purpose",
    );

    expect(overviewHeading?.tokenStart).toBeTypeOf("number");

    render(
      <ClassicReaderView
        document={documentModel}
        chunk={documentModel.chunks[0]!}
        onJumpToToken={onJumpToToken}
        reduceMotion
        simplifyMarkdownPreview
      />,
    );

    await user.click(screen.getByRole("link", { name: "Overview & Purpose" }));

    expect(onJumpToToken).toHaveBeenCalledWith(overviewHeading?.tokenStart);
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

  it("simplifies oversized markdown and renders only a bounded window", () => {
    const rawText = Array.from({ length: 80 }, (_, index) => {
      return `## Section ${index + 1}\n\nParagraph ${index + 1} with enough content to exercise the reader fast path.`;
    }).join("\n\n");
    const documentModel = buildDocumentModel({
      title: "Large markdown sample",
      rawText,
      sourceKind: "markdown",
      chunkSize: 1,
    });
    const targetBlock =
      documentModel.blocks.find(
        (block) => block.kind === "heading" && block.index >= 60,
      ) ?? documentModel.blocks.at(-1);
    const chunk = deriveRuntimeChunks(documentModel, 3).find(
      (candidate) => candidate.paragraphIndex === targetBlock?.index,
    );

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
        simplifyMarkdownPreview
      />,
    );

    expect(
      container.querySelector('[data-reader-window-sentinel="before"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-reader-window-sentinel="after"]'),
    ).toBeTruthy();
    expect(
      container.querySelectorAll("[data-reader-markdown-block-index]").length,
    ).toBeLessThan(documentModel.blocks.length);
    expect(
      container.querySelector("[data-reader-paragraph-index]"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(
        `[data-reader-markdown-block-index]#section-${
          targetBlock?.text.split(" ").at(-1) ?? ""
        }`,
      ),
    ).toBeTruthy();
  });
});

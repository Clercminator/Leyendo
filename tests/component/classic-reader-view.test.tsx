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

  it("renders structured inline strong spans in classic mode", () => {
    const documentModel = buildDocumentModel({
      rawText: "Important terms stay visible in the reader.",
      sourceBlocks: [
        {
          inlineSpans: [
            {
              kind: "strong",
              text: "Important terms",
            },
          ],
          kind: "paragraph",
          text: "Important terms stay visible in the reader.",
        },
      ],
      sourceKind: "pdf",
      chunkSize: 2,
    });
    const chunk = deriveRuntimeChunks(documentModel, 3)[0];

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
      />,
    );

    expect(
      container.querySelector("strong.reader-inline-strong"),
    ).toHaveTextContent("Important terms");
  });

  it("renders PDF page dividers, heading hierarchy, and legal indentation hints", () => {
    const documentModel = buildDocumentModel({
      rawText:
        "Agreement\n\nOpening paragraph.\n\nArticle 1\n\nDetailed clause.\n\nIndented paragraph.",
      sourceBlocks: [
        {
          headingLevel: 1,
          kind: "heading",
          sourcePageIndex: 0,
          text: "Agreement",
        },
        {
          kind: "paragraph",
          sourcePageIndex: 0,
          text: "Opening paragraph.",
        },
        {
          headingLevel: 2,
          kind: "heading",
          pageBreakBefore: true,
          sourcePageIndex: 1,
          text: "Article 1",
        },
        {
          indentLevel: 1,
          kind: "list-item",
          listDepth: 2,
          marker: "1.1.",
          sourcePageIndex: 1,
          text: "Detailed clause.",
        },
        {
          indentLevel: 1,
          kind: "paragraph",
          sourcePageIndex: 1,
          text: "Indented paragraph.",
        },
      ],
      sourceKind: "pdf",
      chunkSize: 2,
    });
    const chunk = deriveRuntimeChunks(documentModel, 2)[0];

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Agreement" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Article 1" }),
    ).toBeVisible();
    expect(screen.getByText("Page 2")).toBeVisible();
    expect(
      container.querySelector('[data-reader-page-divider="1"]'),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-reader-paragraph-index="3"][data-reader-list-depth="2"][data-reader-indent-level="1"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-reader-paragraph-index="4"][data-reader-indent-level="1"]',
      ),
    ).toBeTruthy();
  });

  it("renders active chunks with a paint-only surface and explicit run spacing", () => {
    const documentModel = buildDocumentModel({
      title: "Classic spacing sample",
      rawText: "Alpha beta gamma delta epsilon.",
      sourceKind: "plain-text",
      chunkSize: 2,
    });
    const chunk = deriveRuntimeChunks(documentModel, 2)[1];

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
      />,
    );

    const activeRun = container.querySelector(".reader-classic-active-run");
    const activeSurface = container.querySelector(
      ".reader-classic-active-run-surface",
    );

    expect(activeRun).toBeTruthy();
    expect(activeSurface).toBeTruthy();
    expect(activeRun).toHaveTextContent("gamma delta");
    expect(activeSurface).toHaveTextContent("gamma delta");
    expect(activeRun?.parentElement?.lastChild?.textContent).toBe(" ");
    expect(container.textContent).toContain("Alpha beta gamma delta epsilon.");
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

    const { container } = render(
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
    expect(
      Array.from(
        container.querySelectorAll<HTMLElement>("[data-reader-paragraph-index]"),
      ).find(
        (block) =>
          block.textContent?.replace(/\s+/g, " ").trim() ===
          "Paragraph with bold text.",
      ),
    ).toBeTruthy();
  });

  it("keeps simple markdown block layout stable while the active chunk moves", () => {
    const documentModel = buildDocumentModel({
      title: "Stable markdown sample",
      rawText:
        "### How Do We Run It?\n\n- **What is the minimum setup?** PostgreSQL, the Optiland AI agent, the Optiland portal, OPENROUTER_API_KEY, Cross System access, and at least one enabled intake channel.\n- **What channels can be enabled?** WhatsApp and email are supported.",
      sourceKind: "markdown",
      chunkSize: 1,
    });
    const chunks = deriveRuntimeChunks(documentModel, 3);
    const headingChunk = chunks.find((candidate) => candidate.paragraphIndex === 0);
    const listChunk = chunks.find((candidate) => candidate.paragraphIndex === 1);

    expect(headingChunk).toBeDefined();
    expect(listChunk).toBeDefined();

    const { container, rerender } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={headingChunk!}
        reduceMotion
      />,
    );

    const describeBlocks = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>("[data-reader-paragraph-index]"),
      ).map((block) => ({
        className: block.className,
        index: block.dataset.readerParagraphIndex,
        text: block.textContent?.replace(/\s+/g, " ").trim(),
      }));
    };

    const before = describeBlocks();

    rerender(
      <ClassicReaderView
        document={documentModel}
        chunk={listChunk!}
        reduceMotion
      />,
    );

    expect(describeBlocks()).toEqual(before);
  });

  it("highlights only the exact active chunk words in markdown preview blocks", () => {
    const documentModel = buildDocumentModel({
      title: "Markdown chunk sample",
      rawText: "Alpha beta gamma delta epsilon zeta.",
      sourceKind: "markdown",
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
    expect(activeRuns[0]).toHaveTextContent("Alpha beta gamma");
    expect(
      container.querySelector('[data-reader-classic-active="true"]'),
    ).not.toHaveClass("reader-active-paragraph");
    expect(container.textContent).toContain("Alpha beta gamma delta epsilon zeta.");
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

  it("keeps later visible markdown clickable after a raw HTML block in simplified preview", async () => {
    const user = userEvent.setup();
    const onJumpToToken = vi.fn();
    const documentModel = buildDocumentModel({
      title: "Markdown HTML sample",
      rawText:
        "# Intro\n\nThis opening section sets the context.\n\n<div class=\"note\">Injected HTML</div>\n\n## Later Section\n\nThis later paragraph should stay clickable.",
      sourceKind: "markdown",
      chunkSize: 1,
    });
    const laterParagraph = documentModel.blocks.find(
      (block) =>
        block.kind === "paragraph" &&
        block.text === "This later paragraph should stay clickable.",
    );
    const chunk = deriveRuntimeChunks(documentModel, 2)[0];

    expect(laterParagraph?.tokenStart).toBeTypeOf("number");

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        onJumpToToken={onJumpToToken}
        reduceMotion
        simplifyMarkdownPreview
      />,
    );

    const laterParagraphBlock = Array.from(
      container.querySelectorAll<HTMLElement>("[data-reader-paragraph-index]"),
    ).find(
      (block) =>
        block.textContent?.replace(/\s+/g, " ").trim() ===
        "This later paragraph should stay clickable.",
    );

    expect(laterParagraphBlock).toBeTruthy();

    await user.click(laterParagraphBlock as HTMLElement);

    expect(onJumpToToken).toHaveBeenCalledWith(laterParagraph?.tokenStart);
  });

  it("keeps plain-text paragraph block spacing identical for active and inactive blocks", () => {
    const documentModel = buildDocumentModel({
      title: "Stable paragraph spacing",
      rawText:
        "First paragraph keeps the active highlight without shifting the block.\n\nSecond paragraph should keep the same spacing when it is not active.",
      sourceKind: "plain-text",
      chunkSize: 1,
    });
    const chunk = deriveRuntimeChunks(documentModel, 3)[0];

    const { container } = render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
      />,
    );

    const activeBlock = container.querySelector<HTMLElement>(
      '[data-reader-paragraph-index="0"]',
    );
    const inactiveBlock = container.querySelector<HTMLElement>(
      '[data-reader-paragraph-index="1"]',
    );

    expect(activeBlock?.className).toBe(inactiveBlock?.className);
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

  it("renders GFM tables and task lists in classic markdown view", () => {
    const documentModel = buildDocumentModel({
      title: "Markdown GFM sample",
      rawText:
        "# Checklist\n\n- [x] Import the markdown file\n- [ ] Review the rendered output\n\n| Surface | Result |\n| --- | --- |\n| Table | Visible |\n| Task list | Visible |",
      sourceKind: "markdown",
      chunkSize: 1,
    });
    const chunk = deriveRuntimeChunks(documentModel, 2)[0];

    render(
      <ClassicReaderView
        document={documentModel}
        chunk={chunk!}
        reduceMotion
      />,
    );

    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Surface" })).toBeVisible();
    expect(screen.getAllByRole("cell", { name: "Visible" })).toHaveLength(2);

    const checkboxes = screen.getAllByRole("checkbox");

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
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
      container.querySelectorAll(".reader-classic-active-run"),
    ).toHaveLength(1);
    expect(
      container.querySelector(
        `[data-reader-markdown-block-index]#section-${
          targetBlock?.text.split(" ").at(-1) ?? ""
        }`,
      ),
    ).toBeTruthy();
  });

  it("jumps past unmapped hidden markdown blocks in simplified preview", async () => {
    const user = userEvent.setup();
    const onJumpToToken = vi.fn();
    const rawText = [
      ...Array.from({ length: 18 }, (_, index) => {
        return `## Section ${index + 1}\n\nParagraph ${index + 1} with enough content to exercise the reader fast path.`;
      }),
      "---",
      "## Section 19\n\nParagraph 19 should still be reachable.",
    ].join("\n\n");
    const documentModel = buildDocumentModel({
      title: "Large markdown HTML sample",
      rawText,
      sourceKind: "markdown",
      chunkSize: 1,
    });
    const firstChunk = deriveRuntimeChunks(documentModel, 2)[0];
    const targetHeading = documentModel.blocks.find(
      (block) => block.kind === "heading" && block.text === "Section 19",
    );

    expect(targetHeading?.tokenStart).toBeTypeOf("number");

    render(
      <ClassicReaderView
        document={documentModel}
        chunk={firstChunk!}
        onJumpToToken={onJumpToToken}
        reduceMotion
        simplifyMarkdownPreview
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /later sections hidden to keep large markdown responsive/i,
      }),
    );

    expect(onJumpToToken).toHaveBeenCalledWith(targetHeading?.tokenStart);
  });
});

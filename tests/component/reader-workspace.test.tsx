import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReaderWorkspace } from "@/components/reader/reader-workspace";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
import { defaultReaderPreferences } from "@/types/reader";

import { createLargeDocumentText } from "../fixtures/large-document";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

vi.mock("@/components/auth/supabase-provider", () => ({
  useSupabaseAuth: () => ({
    profile: undefined,
    syncReaderPreferences: vi.fn(),
    user: undefined,
  }),
}));

vi.mock("@/components/reader/pdf-reader-workspace", () => ({
  PdfReaderWorkspace: ({
    availableModes,
    hasExtractedText,
    onSaveBookmark,
  }: {
    availableModes: string[];
    hasExtractedText: boolean;
    onSaveBookmark: ({ pageIndex }: { pageIndex: number }) => void;
  }) => (
    <div>
      <div data-testid="pdf-workspace">
        {hasExtractedText ? "text-pdf" : "image-pdf"}|{availableModes.join(",")}
      </div>
      <button
        type="button"
        onClick={() => {
          onSaveBookmark({ pageIndex: 4 });
        }}
      >
        Save PDF bookmark
      </button>
    </div>
  ),
}));

const { ClassicReaderViewMock, GuidedLineViewMock } = vi.hoisted(() => ({
  ClassicReaderViewMock: vi.fn(() => <div data-testid="classic-reader-view" />),
  GuidedLineViewMock: vi.fn(() => <div data-testid="guided-line-view" />),
}));

vi.mock("@/components/reader/reader-canvas", () => ({
  ReaderCanvas: ({
    modeView,
    onSelectTextPresentation,
    textPresentation,
  }: {
    modeView: React.ReactNode;
    onSelectTextPresentation?: (presentation: "clean" | "literal") => void;
    textPresentation?: "clean" | "literal";
  }) => (
    <div data-testid="reader-canvas">
      {onSelectTextPresentation && textPresentation ? (
        <button
          type="button"
          onClick={() => {
            onSelectTextPresentation(
              textPresentation === "literal" ? "clean" : "literal",
            );
          }}
        >
          {textPresentation === "literal"
            ? "Switch to clean markdown"
            : "Switch to literal text"}
        </button>
      ) : null}
      {modeView}
    </div>
  ),
}));

vi.mock("@/components/reader/reader-sidebar", () => ({
  ReaderSidebar: () => <div data-testid="reader-sidebar" />,
}));

vi.mock("@/components/reader/classic-reader-view", () => ({
  ClassicReaderView: ClassicReaderViewMock,
}));

vi.mock("@/components/reader/focus-word-view", () => ({
  FocusWordView: () => <div />,
}));

vi.mock("@/components/reader/guided-line-view", () => ({
  GuidedLineView: GuidedLineViewMock,
}));

vi.mock("@/components/reader/phrase-chunk-view", () => ({
  PhraseChunkView: () => <div />,
}));

vi.mock("@/components/reader/use-reader-persistence", () => ({
  useReaderPersistence: vi.fn(),
}));

vi.mock("@/components/reader/use-reader-playback", () => ({
  useReaderPlayback: vi.fn(),
}));

const { useReaderDocument } = vi.hoisted(() => ({
  useReaderDocument: vi.fn(),
}));

vi.mock("@/components/reader/use-reader-document", () => ({
  useReaderDocument,
}));

const { getDocumentAsset, saveBookmark } = vi.hoisted(() => ({
  getDocumentAsset: vi.fn(),
  saveBookmark: vi.fn(),
}));

vi.mock("@/db/repositories", () => ({
  deleteBookmark: vi.fn(),
  deleteHighlight: vi.fn(),
  getDocumentAsset,
  saveBookmark,
  saveHighlight: vi.fn(),
}));

const { useReaderStore } = vi.hoisted(() => ({
  useReaderStore: vi.fn(),
}));

vi.mock("@/state/reader-store", () => ({
  useReaderStore,
}));

describe("ReaderWorkspace PDF gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    useReaderStore.mockReturnValue({
      currentChunkIndex: 0,
      isPlaying: false,
      preferences: defaultReaderPreferences,
      setActiveDocument: vi.fn(),
      setChunkIndex: vi.fn(),
      setMode: vi.fn(),
      setPlaying: vi.fn(),
      updatePreferences: vi.fn(),
    });

    useReaderDocument.mockReturnValue({
      bookmarks: [],
      document: {
        createdAt: "2026-03-30T10:00:00.000Z",
        excerpt: "",
        id: "pdf-scan",
        payload: {
          blocks: [],
          chunks: [],
          createdAt: "2026-03-30T10:00:00.000Z",
          excerpt: "",
          id: "pdf-scan",
          pages: [],
          sections: [],
          sentences: [],
          sourceKind: "pdf",
          text: "",
          title: "Scanned PDF",
          tokens: [],
          updatedAt: "2026-03-30T10:00:00.000Z",
        },
        sourceKind: "pdf",
        title: "Scanned PDF",
        totalChunks: 0,
        totalSections: 0,
        updatedAt: "2026-03-30T10:00:00.000Z",
      },
      error: undefined,
      highlights: [],
      isLoading: false,
      prependBookmark: vi.fn(),
      prependHighlight: vi.fn(),
      removeBookmark: vi.fn(),
      removeHighlight: vi.fn(),
      savedSession: undefined,
    });

    getDocumentAsset.mockResolvedValue({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      createdAt: "2026-03-30T10:00:00.000Z",
      documentId: "pdf-scan",
      fileName: "scan.pdf",
      size: 3,
      sourceKind: "pdf",
      updatedAt: "2026-03-30T10:00:00.000Z",
    });

    saveBookmark.mockImplementation(async (bookmark) => ({
      ...bookmark,
      id: "bookmark-1",
      createdAt: "2026-03-30T10:00:00.000Z",
    }));
  });

  it("forces scanned PDFs into Acrobat mode only", async () => {
    render(<ReaderWorkspace documentId="pdf-scan" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-workspace")).toHaveTextContent(
        "image-pdf|pdf-page",
      );
    });

    expect(screen.queryByText(/pace benchmark/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/session snapshot/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/check before changing pace/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("reader-canvas")).not.toBeInTheDocument();
  });

  it("saves page-only bookmarks for scanned PDFs without extracted text", async () => {
    render(<ReaderWorkspace documentId="pdf-scan" />);

    await waitFor(() => {
      expect(screen.getByTestId("pdf-workspace")).toHaveTextContent(
        "image-pdf|pdf-page",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /save pdf bookmark/i }));

    await waitFor(() => {
      expect(saveBookmark).toHaveBeenCalledWith(
        expect.objectContaining({
          chunkIndex: -1,
          documentId: "pdf-scan",
          paragraphIndex: -1,
          sectionIndex: -1,
          sourcePageIndex: 4,
          tokenIndex: -1,
        }),
      );
    });
  });

  it("keeps classic reader text jump targets on compact touch screens", async () => {
    const documentModel = buildDocumentModel({
      title: "Touch sample",
      rawText:
        "Compact touch readers should still let users jump by tapping a word.",
      sourceKind: "plain-text",
      chunkSize: 1,
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 900,
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(hover: none), (pointer: coarse)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    useReaderStore.mockReturnValue({
      currentChunkIndex: 0,
      isPlaying: false,
      preferences: {
        ...defaultReaderPreferences,
        mode: "classic-reader",
      },
      setActiveDocument: vi.fn(),
      setChunkIndex: vi.fn(),
      setMode: vi.fn(),
      setPlaying: vi.fn(),
      updatePreferences: vi.fn(),
    });

    useReaderDocument.mockReturnValue({
      bookmarks: [],
      document: {
        createdAt: "2026-03-30T10:00:00.000Z",
        excerpt: documentModel.text.slice(0, 40),
        id: "text-doc",
        payload: documentModel,
        sourceKind: "plain-text",
        title: documentModel.title,
        totalChunks: documentModel.chunks.length,
        totalSections: documentModel.sections.length,
        updatedAt: "2026-03-30T10:00:00.000Z",
      },
      error: undefined,
      highlights: [],
      isLoading: false,
      prependBookmark: vi.fn(),
      prependHighlight: vi.fn(),
      removeBookmark: vi.fn(),
      removeHighlight: vi.fn(),
      savedSession: undefined,
    });

    render(<ReaderWorkspace documentId="text-doc" />);

    await waitFor(() => {
      expect(screen.getByTestId("classic-reader-view")).toBeInTheDocument();
    });

    const classicReaderProps =
      ClassicReaderViewMock.mock.calls.at(-1)?.[0] ?? {};

    expect(classicReaderProps.onJumpToToken).toEqual(expect.any(Function));
  });

  it("lets saved markdown documents switch between clean and literal views", async () => {
    const documentModel = buildDocumentModel({
      title: "Markdown sample",
      rawText: "# Heading\n\n- Bullet item\n\nParagraph with **bold** text.",
      sourceKind: "markdown",
      chunkSize: 1,
    });

    useReaderStore.mockReturnValue({
      currentChunkIndex: 0,
      isPlaying: false,
      preferences: {
        ...defaultReaderPreferences,
        mode: "classic-reader",
      },
      setActiveDocument: vi.fn(),
      setChunkIndex: vi.fn(),
      setMode: vi.fn(),
      setPlaying: vi.fn(),
      updatePreferences: vi.fn(),
    });

    useReaderDocument.mockReturnValue({
      bookmarks: [],
      document: {
        createdAt: "2026-03-30T10:00:00.000Z",
        excerpt: documentModel.excerpt,
        id: "markdown-doc",
        payload: documentModel,
        sourceKind: "markdown",
        title: documentModel.title,
        totalChunks: documentModel.chunks.length,
        totalSections: documentModel.sections.length,
        updatedAt: "2026-03-30T10:00:00.000Z",
      },
      error: undefined,
      highlights: [],
      isLoading: false,
      prependBookmark: vi.fn(),
      prependHighlight: vi.fn(),
      removeBookmark: vi.fn(),
      removeHighlight: vi.fn(),
      savedSession: undefined,
    });

    render(<ReaderWorkspace documentId="markdown-doc" />);

    await waitFor(() => {
      expect(screen.getByTestId("classic-reader-view")).toBeInTheDocument();
    });

    expect(
      ClassicReaderViewMock.mock.calls.at(-1)?.[0]?.document.sourceKind,
    ).toBe("markdown");
    expect(
      ClassicReaderViewMock.mock.calls.at(-1)?.[0]?.document.text,
    ).not.toContain("# Heading");

    fireEvent.click(
      screen.getByRole("button", { name: /switch to literal text/i }),
    );

    await waitFor(() => {
      expect(
        ClassicReaderViewMock.mock.calls.at(-1)?.[0]?.document.sourceKind,
      ).toBe("plain-text");
    });

    expect(
      ClassicReaderViewMock.mock.calls.at(-1)?.[0]?.document.text,
    ).toContain("# Heading");

    fireEvent.click(
      screen.getByRole("button", { name: /switch to clean markdown/i }),
    );

    await waitFor(() => {
      expect(
        ClassicReaderViewMock.mock.calls.at(-1)?.[0]?.document.sourceKind,
      ).toBe("markdown");
    });
  });

  it("simplifies large markdown documents in classic reader mode", async () => {
    const documentModel = buildDocumentModel({
      title: "Large markdown sample",
      rawText: createLargeDocumentText(720, 32)
        .split("\n\n")
        .map((paragraph, index) => `## Section ${index + 1}\n\n${paragraph}`)
        .join("\n\n"),
      sourceKind: "markdown",
      chunkSize: 1,
    });

    useReaderStore.mockReturnValue({
      currentChunkIndex: 0,
      isPlaying: false,
      preferences: {
        ...defaultReaderPreferences,
        mode: "classic-reader",
      },
      setActiveDocument: vi.fn(),
      setChunkIndex: vi.fn(),
      setMode: vi.fn(),
      setPlaying: vi.fn(),
      updatePreferences: vi.fn(),
    });

    useReaderDocument.mockReturnValue({
      bookmarks: [],
      document: {
        createdAt: "2026-03-30T10:00:00.000Z",
        excerpt: documentModel.excerpt,
        id: "large-markdown-doc",
        payload: documentModel,
        sourceKind: "markdown",
        title: documentModel.title,
        totalChunks: documentModel.chunks.length,
        totalSections: documentModel.sections.length,
        updatedAt: "2026-03-30T10:00:00.000Z",
      },
      error: undefined,
      highlights: [],
      isLoading: false,
      prependBookmark: vi.fn(),
      prependHighlight: vi.fn(),
      removeBookmark: vi.fn(),
      removeHighlight: vi.fn(),
      savedSession: undefined,
    });

    render(<ReaderWorkspace documentId="large-markdown-doc" />);

    await waitFor(() => {
      expect(screen.getByTestId("classic-reader-view")).toBeInTheDocument();
    });

    expect(
      ClassicReaderViewMock.mock.calls.at(-1)?.[0]?.simplifyMarkdownPreview,
    ).toBe(true);
  });
});

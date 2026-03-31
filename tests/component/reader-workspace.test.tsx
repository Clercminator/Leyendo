import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReaderWorkspace } from "@/components/reader/reader-workspace";
import { defaultReaderPreferences } from "@/types/reader";

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

vi.mock("@/components/reader/reader-canvas", () => ({
  ReaderCanvas: () => <div data-testid="reader-canvas" />,
}));

vi.mock("@/components/reader/reader-sidebar", () => ({
  ReaderSidebar: () => <div data-testid="reader-sidebar" />,
}));

vi.mock("@/components/reader/classic-reader-view", () => ({
  ClassicReaderView: () => <div />,
}));

vi.mock("@/components/reader/focus-word-view", () => ({
  FocusWordView: () => <div />,
}));

vi.mock("@/components/reader/guided-line-view", () => ({
  GuidedLineView: () => <div />,
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
});

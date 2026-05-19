import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PdfReaderWorkspace } from "@/components/reader/pdf-workspace/pdf-reader-workspace";
import { defaultPdfViewerState } from "@/types/reader";

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => {
    const imageProps = { ...props } as React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      priority?: boolean;
      unoptimized?: boolean;
    };

    delete imageProps.fill;
    delete imageProps.priority;
    delete imageProps.unoptimized;

    return <img alt={alt} src={src} {...imageProps} />;
  },
}));

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

const eventHandlers = new Map<string, Array<(event: unknown) => void>>();

class MockEventBus {
  dispatch(eventName: string, data: Record<string, unknown>) {
    for (const listener of eventHandlers.get(eventName) ?? []) {
      listener(data);
    }
  }

  off<T>(eventName: string, listener: (event: T) => void) {
    const handlers = eventHandlers.get(eventName) ?? [];
    eventHandlers.set(
      eventName,
      handlers.filter((handler) => handler !== listener),
    );
  }

  on<T>(eventName: string, listener: (event: T) => void) {
    eventHandlers.set(eventName, [
      ...(eventHandlers.get(eventName) ?? []),
      listener,
    ]);
  }
}

class MockPDFLinkService {
  setDocument() {}

  setViewer() {}
}

class MockPDFFindController {
  setDocument() {}
}

class MockPDFViewer {
  cleanup() {}

  currentPageNumber = 1;

  currentScaleValue = "page-width";

  pagesRotation = 0;

  scrollMode = 0;

  setDocument() {}

  setPageLabels() {}

  updateScale() {}
}

class MockIntersectionObserver {
  constructor() {}

  disconnect() {}

  observe() {}

  takeRecords() {
    return [] as IntersectionObserverEntry[];
  }

  unobserve() {}
}

const { getDocumentAsset, getStoredPdfViewerState, savePdfViewerState } =
  vi.hoisted(() => ({
    getDocumentAsset: vi.fn(),
    getStoredPdfViewerState: vi.fn(),
    savePdfViewerState: vi.fn(),
  }));

vi.mock("@/db/repositories", () => ({
  getDocumentAsset,
  getStoredPdfViewerState,
  savePdfViewerState,
}));

const { loadPdfJs, loadPdfJsViewer, getPdfAssetUrl } = vi.hoisted(() => ({
  getPdfAssetUrl: vi.fn((path: string) => `http://localhost/pdfjs/${path}`),
  loadPdfJs: vi.fn(),
  loadPdfJsViewer: vi.fn(),
}));

vi.mock("@/lib/pdf/pdfjs", () => ({
  getPdfAssetUrl,
  loadPdfJs,
  loadPdfJsViewer,
}));

describe("PdfReaderWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    eventHandlers.clear();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
    HTMLCanvasElement.prototype.getContext = vi.fn(() => {
      return {
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    });
    HTMLCanvasElement.prototype.toDataURL = vi.fn(
      () => "data:image/png;base64,thumb",
    );

    getDocumentAsset.mockResolvedValue({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      createdAt: "2026-03-30T10:00:00.000Z",
      documentId: "pdf-scan",
      fileName: "scan.pdf",
      size: 3,
      sourceKind: "pdf",
      updatedAt: "2026-03-30T10:00:00.000Z",
    });
    getStoredPdfViewerState.mockResolvedValue(defaultPdfViewerState);
    savePdfViewerState.mockResolvedValue(defaultPdfViewerState);
    loadPdfJsViewer.mockResolvedValue({
      EventBus: MockEventBus,
      FindState: {
        NOT_FOUND: 1,
        PENDING: 2,
      },
      PDFFindController: MockPDFFindController,
      PDFLinkService: MockPDFLinkService,
      PDFViewer: MockPDFViewer,
      ScrollMode: {
        PAGE: 3,
        VERTICAL: 0,
      },
    });
    loadPdfJs.mockResolvedValue({
      getDocument: () => ({
        promise: Promise.resolve({
          destroy: vi.fn(),
          getDestination: vi.fn().mockResolvedValue(null),
          getOutline: vi.fn().mockResolvedValue([]),
          getPage: vi.fn().mockResolvedValue({
            cleanup: vi.fn(),
            getViewport: ({ scale }: { scale: number }) => ({
              height: 200 * scale,
              width: 100 * scale,
            }),
            render: vi.fn().mockReturnValue({
              cancel: vi.fn(),
              promise: Promise.resolve(),
            }),
          }),
          getPageIndex: vi.fn().mockResolvedValue(0),
          getPageLabels: vi.fn().mockResolvedValue(["1"]),
          numPages: 1,
        }),
      }),
    });
  });

  it("shows the OCR warning, keeps page bookmarks available, and hides highlight saves when extracted text is missing", async () => {
    const user = userEvent.setup();
    const onSaveBookmark = vi.fn();

    render(
      <PdfReaderWorkspace
        availableModes={[]}
        bookmarks={[]}
        document={{
          createdAt: "2026-03-30T10:00:00.000Z",
          excerpt: "",
          id: "pdf-scan",
          sourceKind: "pdf",
          title: "Scanned PDF",
          totalChunks: 0,
          totalSections: 0,
          updatedAt: "2026-03-30T10:00:00.000Z",
        }}
        hasExtractedText={false}
        highlightNote=""
        highlights={[]}
        onChangeHighlightNote={vi.fn()}
        onDeleteBookmark={vi.fn()}
        onDeleteHighlight={vi.fn()}
        onJumpToBookmark={vi.fn()}
        onJumpToHighlight={vi.fn()}
        onOpenBrowserPdf={vi.fn()}
        onPageChange={vi.fn()}
        onSaveBookmark={onSaveBookmark}
        onSaveHighlight={vi.fn()}
        onSelectMode={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/this pdf needs ocr for text-driven reader features/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/still save page bookmarks/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save bookmark/i }));

    expect(onSaveBookmark).toHaveBeenCalledWith({ pageIndex: 0 });
    expect(
      screen.queryByRole("button", { name: /save highlight/i }),
    ).not.toBeInTheDocument();
  });

  it("shows PDF tools, selected highlight guidance, and the mobile PDF sheet", async () => {
    const user = userEvent.setup();
    const onOpenBrowserPdf = vi.fn();
    const onReadCurrentPageInClassic = vi.fn();

    render(
      <PdfReaderWorkspace
        availableModes={["classic-reader"]}
        bookmarks={[]}
        document={{
          createdAt: "2026-03-30T10:00:00.000Z",
          excerpt: "",
          id: "pdf-text",
          sourceKind: "pdf",
          title: "Text PDF",
          totalChunks: 0,
          totalSections: 0,
          updatedAt: "2026-03-30T10:00:00.000Z",
        }}
        hasExtractedText
        highlightNote=""
        highlights={[]}
        onChangeHighlightNote={vi.fn()}
        onDeleteBookmark={vi.fn()}
        onDeleteHighlight={vi.fn()}
        onJumpToBookmark={vi.fn()}
        onJumpToHighlight={vi.fn()}
        onOpenBrowserPdf={onOpenBrowserPdf}
        onPageChange={vi.fn()}
        onReadCurrentPageInClassic={onReadCurrentPageInClassic}
        onSaveBookmark={vi.fn()}
        onSaveHighlight={vi.fn()}
        onSelectMode={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^browser pdf$/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /open browser pdf/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /read this page in classic/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole("textbox", { name: /jump to page/i })).toHaveValue(
      "1",
    );
    expect(
      screen.getByRole("button", { name: /show tools/i }),
    ).toBeInTheDocument();

    const viewerContainer = document.querySelector(".pdfViewer");

    expect(viewerContainer).not.toBeNull();

    vi.stubGlobal("getSelection", () => {
      return {
        anchorNode: viewerContainer,
        focusNode: viewerContainer,
        toString: () => "Clause on page two",
      } as unknown as Selection;
    });

    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText(/selected pdf text ready:/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /save selected highlight/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show tools/i }));

    expect(
      screen.getByRole("dialog", { name: /pages, outline, and notes/i }),
    ).toBeInTheDocument();
  });

  it("renders the Classic overlay on top of the PDF workspace without replacing the existing Classic action", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onMoveBackward = vi.fn();
    const onMoveForward = vi.fn();
    const onTogglePlayback = vi.fn();
    const onReadCurrentPageInClassic = vi.fn();

    render(
      <PdfReaderWorkspace
        availableModes={["classic-reader"]}
        bookmarks={[]}
        classicOverlay={{
          activeChunkText: "Clause on page one",
          activeTokenIndexes: [0, 1],
          canMoveBackward: true,
          canMoveForward: true,
          isActive: true,
          isPlaying: false,
          pageLabel: "Page 1",
          paragraphLabel: "Paragraph 1",
          paragraphTokens: [
            { index: 0, value: "Clause" },
            { index: 1, value: "on" },
            { index: 2, value: "page" },
            { index: 3, value: "one" },
          ],
          onActivate: vi.fn(),
          onClose,
          onMoveBackward,
          onMoveForward,
          onTogglePlayback,
        }}
        document={{
          createdAt: "2026-03-30T10:00:00.000Z",
          excerpt: "",
          id: "pdf-overlay",
          sourceKind: "pdf",
          title: "Overlay PDF",
          totalChunks: 0,
          totalSections: 0,
          updatedAt: "2026-03-30T10:00:00.000Z",
        }}
        hasExtractedText
        highlightNote=""
        highlights={[]}
        onChangeHighlightNote={vi.fn()}
        onDeleteBookmark={vi.fn()}
        onDeleteHighlight={vi.fn()}
        onJumpToBookmark={vi.fn()}
        onJumpToHighlight={vi.fn()}
        onOpenBrowserPdf={vi.fn()}
        onPageChange={vi.fn()}
        onReadCurrentPageInClassic={onReadCurrentPageInClassic}
        onSaveBookmark={vi.fn()}
        onSaveHighlight={vi.fn()}
        onSelectMode={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("pdf-classic-overlay")).toBeInTheDocument();
    });

    expect(screen.getByText(/clause on page one/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /read this page in classic/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^play$/i }));
    await user.click(screen.getByRole("button", { name: /^previous$/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.click(
      screen.getAllByRole("button", { name: /hide classic overlay/i })[0]!,
    );

    expect(onTogglePlayback).toHaveBeenCalledTimes(1);
    expect(onMoveBackward).toHaveBeenCalledTimes(1);
    expect(onMoveForward).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReadCurrentPageInClassic).not.toHaveBeenCalled();
  });

  it("renders only the requested thumbnail window instead of every page eagerly", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === "(min-width: 1024px)",
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );

    const getPage = vi.fn().mockResolvedValue({
      cleanup: vi.fn(),
      getViewport: ({ scale }: { scale: number }) => ({
        height: 200 * scale,
        width: 100 * scale,
      }),
      render: vi.fn().mockReturnValue({
        cancel: vi.fn(),
        promise: Promise.resolve(),
      }),
    });

    loadPdfJs.mockResolvedValue({
      getDocument: () => ({
        promise: Promise.resolve({
          destroy: vi.fn(),
          getDestination: vi.fn().mockResolvedValue(null),
          getOutline: vi.fn().mockResolvedValue([]),
          getPage,
          getPageIndex: vi.fn().mockResolvedValue(0),
          getPageLabels: vi
            .fn()
            .mockResolvedValue(
              Array.from({ length: 6 }, (_, index) => String(index + 1)),
            ),
          numPages: 6,
        }),
      }),
    });

    render(
      <PdfReaderWorkspace
        availableModes={[]}
        bookmarks={[]}
        document={{
          createdAt: "2026-03-30T10:00:00.000Z",
          excerpt: "",
          id: "pdf-multi",
          sourceKind: "pdf",
          title: "Scanned PDF",
          totalChunks: 0,
          totalSections: 0,
          updatedAt: "2026-03-30T10:00:00.000Z",
        }}
        hasExtractedText={false}
        highlightNote=""
        highlights={[]}
        onChangeHighlightNote={vi.fn()}
        onDeleteBookmark={vi.fn()}
        onDeleteHighlight={vi.fn()}
        onJumpToBookmark={vi.fn()}
        onJumpToHighlight={vi.fn()}
        onOpenBrowserPdf={vi.fn()}
        onPageChange={vi.fn()}
        onSaveBookmark={vi.fn()}
        onSaveHighlight={vi.fn()}
        onSelectMode={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(getPage).toHaveBeenCalled();
    });

    expect(getPage.mock.calls.length).toBeLessThan(6);
  });
});

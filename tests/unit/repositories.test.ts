import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  documentsBulkGet,
  documentsDelete,
  documentAssetsDelete,
  documentAssetsGet,
  documentAssetsPut,
  preferencesGet,
  preferencesPut,
  transaction,
  sessionsDeleteMany,
  sessionsEquals,
  sessionsToArray,
  bookmarksDeleteMany,
  bookmarksEquals,
  bookmarksToArray,
  highlightsDeleteMany,
  highlightsEquals,
  highlightsToArray,
} = vi.hoisted(() => ({
  documentsBulkGet: vi.fn(),
  documentsDelete: vi.fn(),
  documentAssetsDelete: vi.fn(),
  documentAssetsGet: vi.fn(),
  documentAssetsPut: vi.fn(),
  preferencesGet: vi.fn(),
  preferencesPut: vi.fn(),
  transaction: vi.fn(),
  sessionsDeleteMany: vi.fn(),
  sessionsEquals: vi.fn(() => ({
    delete: sessionsDeleteMany,
  })),
  sessionsToArray: vi.fn(),
  bookmarksDeleteMany: vi.fn(),
  bookmarksEquals: vi.fn(() => ({
    delete: bookmarksDeleteMany,
  })),
  bookmarksToArray: vi.fn(),
  highlightsDeleteMany: vi.fn(),
  highlightsEquals: vi.fn(() => ({
    delete: highlightsDeleteMany,
  })),
  highlightsToArray: vi.fn(),
}));

vi.mock("@/db/app-db", () => ({
  db: {
    documents: {
      bulkGet: documentsBulkGet,
      delete: documentsDelete,
    },
    documentAssets: {
      delete: documentAssetsDelete,
      get: documentAssetsGet,
      put: documentAssetsPut,
    },
    sessions: {
      orderBy: vi.fn(() => ({
        reverse: () => ({
          limit: () => ({
            toArray: sessionsToArray,
          }),
        }),
      })),
      where: vi.fn(() => ({
        equals: sessionsEquals,
      })),
    },
    bookmarks: {
      orderBy: vi.fn(() => ({
        reverse: () => ({
          limit: () => ({
            toArray: bookmarksToArray,
          }),
        }),
      })),
      where: vi.fn(() => ({
        equals: bookmarksEquals,
      })),
    },
    highlights: {
      orderBy: vi.fn(() => ({
        reverse: () => ({
          limit: () => ({
            toArray: highlightsToArray,
          }),
        }),
      })),
      where: vi.fn(() => ({
        equals: highlightsEquals,
      })),
    },
    preferences: {
      get: preferencesGet,
      put: preferencesPut,
    },
    transaction,
  },
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "generated-id"),
}));

import {
  clearSessionForDocument,
  deleteDocumentAndRelatedData,
  getDocumentAsset,
  getStoredPdfViewerState,
  getRecentBookmarks,
  getRecentHighlights,
  getRecentSessions,
  savePdfViewerState,
  saveDocumentAsset,
} from "@/db/repositories";
import { defaultPdfViewerState } from "@/types/reader";

describe("recent repository hydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(
      async (_mode: string, ...args: unknown[]) => {
        const callback = args.at(-1);
        return typeof callback === "function" ? callback() : undefined;
      },
    );
  });

  it("hydrates recent sessions with a single bulk document lookup", async () => {
    sessionsToArray.mockResolvedValue([
      {
        id: "session-1",
        documentId: "doc-1",
        currentChunkIndex: 4,
        currentTokenIndex: 4,
        currentParagraphIndex: 0,
        currentSectionIndex: 0,
        percentComplete: 12,
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "session-2",
        documentId: "missing-doc",
        currentChunkIndex: 9,
        currentTokenIndex: 9,
        currentParagraphIndex: 1,
        currentSectionIndex: 0,
        percentComplete: 42,
        updatedAt: "2025-01-01T00:01:00.000Z",
      },
    ]);
    documentsBulkGet.mockResolvedValue([
      {
        id: "doc-1",
        title: "Document One",
        sourceKind: "plain-text",
        excerpt: "Excerpt",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        totalChunks: 10,
        totalSections: 1,
      },
      undefined,
    ]);

    const records = await getRecentSessions(8);

    expect(documentsBulkGet).toHaveBeenCalledWith(["doc-1", "missing-doc"]);
    expect(records).toHaveLength(1);
    expect(records[0]?.document.id).toBe("doc-1");
    expect(records[0]?.session.id).toBe("session-1");
  });

  it("hydrates recent bookmarks with a single bulk document lookup", async () => {
    bookmarksToArray.mockResolvedValue([
      {
        id: "bookmark-1",
        documentId: "doc-2",
        label: "Bookmark 1",
        chunkIndex: 2,
        tokenIndex: 2,
        paragraphIndex: 0,
        sectionIndex: 0,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ]);
    documentsBulkGet.mockResolvedValue([
      {
        id: "doc-2",
        title: "Document Two",
        sourceKind: "plain-text",
        excerpt: "Excerpt",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        totalChunks: 10,
        totalSections: 1,
      },
    ]);

    const records = await getRecentBookmarks(8);

    expect(documentsBulkGet).toHaveBeenCalledWith(["doc-2"]);
    expect(records).toHaveLength(1);
    expect(records[0]?.bookmark.id).toBe("bookmark-1");
  });

  it("hydrates recent highlights with a single bulk document lookup", async () => {
    highlightsToArray.mockResolvedValue([
      {
        id: "highlight-1",
        documentId: "doc-3",
        label: "Highlight 1",
        quote: "Quoted text",
        chunkIndex: 3,
        tokenIndex: 3,
        paragraphIndex: 1,
        sectionIndex: 0,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ]);
    documentsBulkGet.mockResolvedValue([
      {
        id: "doc-3",
        title: "Document Three",
        sourceKind: "plain-text",
        excerpt: "Excerpt",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        totalChunks: 10,
        totalSections: 1,
      },
    ]);

    const records = await getRecentHighlights(8);

    expect(documentsBulkGet).toHaveBeenCalledWith(["doc-3"]);
    expect(records).toHaveLength(1);
    expect(records[0]?.highlight.id).toBe("highlight-1");
  });

  it("clears stored progress for a document", async () => {
    await clearSessionForDocument("doc-4");

    expect(sessionsEquals).toHaveBeenCalledWith("doc-4");
    expect(sessionsDeleteMany).toHaveBeenCalledTimes(1);
    expect(bookmarksDeleteMany).not.toHaveBeenCalled();
    expect(highlightsDeleteMany).not.toHaveBeenCalled();
  });

  it("saves and loads a local document asset", async () => {
    documentAssetsGet.mockResolvedValue(undefined);

    const asset = await saveDocumentAsset({
      blob: new Blob(["pdf-bytes"], { type: "application/pdf" }),
      documentId: "doc-pdf",
      fileName: "sample.pdf",
      size: 9,
      sourceKind: "pdf",
    });

    expect(documentAssetsPut).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "doc-pdf",
        fileName: "sample.pdf",
        size: 9,
        sourceKind: "pdf",
      }),
    );
    expect(asset.documentId).toBe("doc-pdf");

    documentAssetsGet.mockResolvedValue(asset);

    await expect(getDocumentAsset("doc-pdf")).resolves.toEqual(asset);
  });

  it("deletes a document and its related local data in one transaction", async () => {
    await deleteDocumentAndRelatedData("doc-5");

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(sessionsEquals).toHaveBeenCalledWith("doc-5");
    expect(bookmarksEquals).toHaveBeenCalledWith("doc-5");
    expect(highlightsEquals).toHaveBeenCalledWith("doc-5");
    expect(documentAssetsDelete).toHaveBeenCalledWith("doc-5");
    expect(sessionsDeleteMany).toHaveBeenCalledTimes(1);
    expect(bookmarksDeleteMany).toHaveBeenCalledTimes(1);
    expect(highlightsDeleteMany).toHaveBeenCalledTimes(1);
    expect(documentsDelete).toHaveBeenCalledWith("doc-5");
  });

  it("persists per-document PDF viewer state in preferences", async () => {
    const state = {
      pageIndex: 7,
      rotation: 90 as const,
      scrollMode: "single-page" as const,
      searchQuery: "chapter 2",
      zoomValue: "page-fit",
    };

    await savePdfViewerState("doc-pdf", state);

    expect(preferencesPut).toHaveBeenCalledWith({
      key: "pdf-viewer:doc-pdf",
      value: state,
    });

    preferencesGet.mockResolvedValue({
      key: "pdf-viewer:doc-pdf",
      value: state,
    });

    await expect(getStoredPdfViewerState("doc-pdf")).resolves.toEqual(state);
  });

  it("falls back to the default PDF viewer state when none is stored", async () => {
    preferencesGet.mockResolvedValue(undefined);

    await expect(getStoredPdfViewerState("missing-doc")).resolves.toEqual(
      defaultPdfViewerState,
    );
  });
});

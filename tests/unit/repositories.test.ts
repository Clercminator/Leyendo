import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  documentsBulkGet,
  documentsDelete,
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
      get: vi.fn(),
      put: vi.fn(),
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
  getRecentBookmarks,
  getRecentHighlights,
  getRecentSessions,
} from "@/db/repositories";

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

  it("deletes a document and its related local data in one transaction", async () => {
    await deleteDocumentAndRelatedData("doc-5");

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(sessionsEquals).toHaveBeenCalledWith("doc-5");
    expect(bookmarksEquals).toHaveBeenCalledWith("doc-5");
    expect(highlightsEquals).toHaveBeenCalledWith("doc-5");
    expect(sessionsDeleteMany).toHaveBeenCalledTimes(1);
    expect(bookmarksDeleteMany).toHaveBeenCalledTimes(1);
    expect(highlightsDeleteMany).toHaveBeenCalledTimes(1);
    expect(documentsDelete).toHaveBeenCalledWith("doc-5");
  });
});

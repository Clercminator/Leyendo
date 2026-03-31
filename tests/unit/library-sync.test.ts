import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  bookmarksBulkDelete,
  bookmarksBulkPut,
  bookmarksToArray,
  documentsDelete,
  documentsGet,
  documentsPut,
  highlightsBulkDelete,
  highlightsBulkPut,
  highlightsToArray,
  sessionsBulkDelete,
  sessionsPut,
  sessionsToArray,
  transaction,
} = vi.hoisted(() => ({
  bookmarksBulkDelete: vi.fn(),
  bookmarksBulkPut: vi.fn(),
  bookmarksToArray: vi.fn(),
  documentsDelete: vi.fn(),
  documentsGet: vi.fn(),
  documentsPut: vi.fn(),
  highlightsBulkDelete: vi.fn(),
  highlightsBulkPut: vi.fn(),
  highlightsToArray: vi.fn(),
  sessionsBulkDelete: vi.fn(),
  sessionsPut: vi.fn(),
  sessionsToArray: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/db/app-db", () => ({
  db: {
    documents: {
      delete: documentsDelete,
      get: documentsGet,
      put: documentsPut,
    },
    sessions: {
      bulkDelete: sessionsBulkDelete,
      put: sessionsPut,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: sessionsToArray,
        })),
      })),
    },
    bookmarks: {
      bulkDelete: bookmarksBulkDelete,
      bulkPut: bookmarksBulkPut,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: bookmarksToArray,
        })),
      })),
    },
    highlights: {
      bulkDelete: highlightsBulkDelete,
      bulkPut: highlightsBulkPut,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: highlightsToArray,
        })),
      })),
    },
    transaction,
  },
}));

import { hydrateRemoteDocumentToLocal } from "@/lib/supabase/library-sync";

function createQueryResult<T>(result: T) {
  const chain = {
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return chain;
}

describe("library sync hydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(
      async (_mode: string, ...args: unknown[]) => {
        const callback = args.at(-1);
        return typeof callback === "function" ? callback() : undefined;
      },
    );
  });

  it("replaces existing synced rows for a document before writing the remote snapshot", async () => {
    const remoteDocument = {
      created_at: "2026-03-30T10:00:00.000Z",
      document_id: "doc-1",
      excerpt: "Remote excerpt",
      payload: {
        blocks: [],
        chunks: [],
        createdAt: "2026-03-30T10:00:00.000Z",
        excerpt: "Remote excerpt",
        id: "doc-1",
        pages: [],
        sections: [],
        sentences: [],
        sourceKind: "plain-text",
        text: "Remote text",
        title: "Remote title",
        tokens: [],
        updatedAt: "2026-03-30T10:00:00.000Z",
      },
      source_kind: "plain-text",
      title: "Remote title",
      total_chunks: 0,
      total_sections: 0,
      updated_at: "2026-03-30T10:00:00.000Z",
      user_id: "user-1",
    };
    const remoteHighlights = [
      {
        chunk_index: 0,
        created_at: "2026-03-30T10:00:00.000Z",
        document_id: "doc-1",
        id: "highlight-remote",
        label: "Highlight 1",
        note: null,
        paragraph_index: 0,
        quote: "Remote quote",
        section_index: 0,
        token_index: 0,
        user_id: "user-1",
      },
    ];

    documentsGet.mockResolvedValue({
      id: "doc-1",
      ownerId: "user-1",
    });
    sessionsToArray.mockResolvedValue([
      { documentId: "doc-1", id: "session-1", ownerId: "user-1" },
      { documentId: "doc-1", id: "session-guest", ownerId: undefined },
    ]);
    bookmarksToArray.mockResolvedValue([
      { documentId: "doc-1", id: "bookmark-1", ownerId: "user-1" },
      { documentId: "doc-1", id: "bookmark-guest", ownerId: undefined },
    ]);
    highlightsToArray.mockResolvedValue([
      { documentId: "doc-1", id: "highlight-1", ownerId: "user-1" },
      { documentId: "doc-1", id: "highlight-guest", ownerId: undefined },
    ]);

    const supabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => {
          if (table === "user_documents") {
            return createQueryResult({ data: remoteDocument, error: null });
          }

          if (table === "user_sessions") {
            return createQueryResult({ data: null, error: null });
          }

          if (table === "user_bookmarks") {
            return createQueryResult({ data: [], error: null });
          }

          return createQueryResult({ data: remoteHighlights, error: null });
        }),
      })),
    };

    await expect(
      hydrateRemoteDocumentToLocal(supabase as never, "user-1", "doc-1"),
    ).resolves.toBe(true);

    expect(documentsDelete).toHaveBeenCalledWith("doc-1");
    expect(sessionsBulkDelete).toHaveBeenCalledWith(["session-1"]);
    expect(bookmarksBulkDelete).toHaveBeenCalledWith(["bookmark-1"]);
    expect(highlightsBulkDelete).toHaveBeenCalledWith(["highlight-1"]);

    expect(documentsPut).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "doc-1",
        ownerId: "user-1",
        syncState: "synced",
      }),
    );
    expect(sessionsPut).not.toHaveBeenCalled();
    expect(bookmarksBulkPut).not.toHaveBeenCalled();
    expect(highlightsBulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        documentId: "doc-1",
        id: "highlight-remote",
        ownerId: "user-1",
        syncState: "synced",
      }),
    ]);
  });
});
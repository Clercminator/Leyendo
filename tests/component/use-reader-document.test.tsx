import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useReaderDocument } from "@/components/reader/use-reader-document";
import { buildDocumentModel } from "@/features/ingest/build/document-model";

const {
  getBookmarkById,
  getBookmarksForDocument,
  getDocumentById,
  getHighlightById,
  getHighlightsForDocument,
  getSessionForDocument,
} = vi.hoisted(() => ({
  getBookmarkById: vi.fn(),
  getBookmarksForDocument: vi.fn(),
  getDocumentById: vi.fn(),
  getHighlightById: vi.fn(),
  getHighlightsForDocument: vi.fn(),
  getSessionForDocument: vi.fn(),
}));

vi.mock("@/db/repositories", () => ({
  buildInitialSession: vi.fn((document) => ({
    currentChunkIndex: 0,
    currentParagraphIndex: 0,
    currentSectionIndex: 0,
    currentTokenIndex: 0,
    documentId: document.id,
    id: `${document.id}:session`,
    percentComplete: 0,
    updatedAt: "2026-03-30T10:00:00.000Z",
  })),
  getBookmarkById,
  getBookmarksForDocument,
  getDocumentById,
  getHighlightById,
  getHighlightsForDocument,
  getSessionForDocument,
}));

const { getSupabaseBrowserClient } = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient,
}));

const { hydrateRemoteDocumentPayloadToLocal, hydrateRemoteDocumentToLocal } =
  vi.hoisted(() => ({
    hydrateRemoteDocumentPayloadToLocal: vi.fn(),
    hydrateRemoteDocumentToLocal: vi.fn(),
  }));

vi.mock("@/lib/supabase/library-sync", () => ({
  hydrateRemoteDocumentPayloadToLocal,
  hydrateRemoteDocumentToLocal,
}));

describe("useReaderDocument", () => {
  const documentModel = buildDocumentModel({
    title: "Cloud sample",
    rawText: "One sentence. Two sentence. Three sentence.",
    sourceKind: "plain-text",
    chunkSize: 1,
  });

  const record = {
    createdAt: documentModel.createdAt,
    excerpt: documentModel.excerpt,
    id: documentModel.id,
    payload: documentModel,
    sourceKind: documentModel.sourceKind,
    title: documentModel.title,
    totalChunks: documentModel.chunks.length,
    totalSections: documentModel.sections.length,
    updatedAt: documentModel.updatedAt,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getBookmarkById.mockResolvedValue(undefined);
    getBookmarksForDocument.mockResolvedValue([]);
    getHighlightById.mockResolvedValue(undefined);
    getHighlightsForDocument.mockResolvedValue([]);
    getSessionForDocument.mockResolvedValue(undefined);
  });

  it("hydrates a synced document from Supabase when the device cache is empty", async () => {
    const supabaseClient = { kind: "supabase" };
    const setActiveDocument = vi.fn();

    getDocumentById
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(record);
    getSupabaseBrowserClient.mockReturnValue(supabaseClient);
    hydrateRemoteDocumentToLocal.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useReaderDocument({
        documentId: record.id,
        setActiveDocument,
        userId: "user-1",
      }),
    );

    await waitFor(() => {
      expect(result.current.document?.id).toBe(record.id);
    });

    expect(hydrateRemoteDocumentToLocal).toHaveBeenCalledWith(
      supabaseClient,
      "user-1",
      record.id,
    );
    expect(setActiveDocument).toHaveBeenCalledWith(record.id);
    expect(result.current.error).toBeUndefined();
  });

  it("hydrates a missing payload directly from cloud storage when local metadata already exists", async () => {
    const supabaseClient = { kind: "supabase" };
    const setActiveDocument = vi.fn();
    const metadataOnlyRecord = {
      ...record,
      ownerId: "user-1",
      payload: undefined,
      syncState: "synced" as const,
    };

    getDocumentById
      .mockResolvedValueOnce(metadataOnlyRecord)
      .mockResolvedValueOnce(record);
    getSupabaseBrowserClient.mockReturnValue(supabaseClient);
    hydrateRemoteDocumentPayloadToLocal.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useReaderDocument({
        documentId: record.id,
        setActiveDocument,
        userId: "user-1",
      }),
    );

    await waitFor(() => {
      expect(result.current.document?.id).toBe(record.id);
    });

    expect(hydrateRemoteDocumentPayloadToLocal).toHaveBeenCalledWith(
      supabaseClient,
      "user-1",
      metadataOnlyRecord,
    );
    expect(hydrateRemoteDocumentToLocal).not.toHaveBeenCalled();
  });
});

import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCloudAnchorSync } from "@/components/reader/use-cloud-anchor-sync";
import type { Bookmark, Highlight } from "@/types/reader";

const { putBookmark, putHighlight, savePendingCloudDelete } = vi.hoisted(() => ({
  putBookmark: vi.fn(),
  putHighlight: vi.fn(),
  savePendingCloudDelete: vi.fn(),
}));

const { getSupabaseBrowserClient } = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
}));

const {
  flushPendingCloudDeletes,
  upsertCloudBookmarks,
  upsertCloudHighlights,
} = vi.hoisted(() => ({
  flushPendingCloudDeletes: vi.fn(),
  upsertCloudBookmarks: vi.fn(),
  upsertCloudHighlights: vi.fn(),
}));

vi.mock("@/db/repositories", () => ({
  putBookmark,
  putHighlight,
  savePendingCloudDelete,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient,
}));

vi.mock("@/lib/supabase/library-sync", () => ({
  flushPendingCloudDeletes,
  upsertCloudBookmarks,
  upsertCloudHighlights,
}));

describe("useCloudAnchorSync", () => {
  const bookmarkBase: Bookmark = {
    chunkIndex: 2,
    createdAt: "2026-04-08T10:00:00.000Z",
    documentId: "doc-1",
    id: "bookmark-1",
    label: "Bookmark 1",
    ownerId: "user-1",
    paragraphIndex: 1,
    sectionIndex: 0,
    sourcePageIndex: 0,
    syncState: "local-only",
    tokenIndex: 10,
  };
  const highlightBase: Highlight = {
    chunkIndex: 3,
    createdAt: "2026-04-08T10:00:00.000Z",
    documentId: "doc-1",
    id: "highlight-1",
    label: "Highlight 1",
    note: "note",
    ownerId: "user-1",
    paragraphIndex: 1,
    quote: "quoted text",
    sectionIndex: 0,
    syncState: "local-only",
    tokenIndex: 14,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getSupabaseBrowserClient.mockReturnValue({});
    flushPendingCloudDeletes.mockResolvedValue({
      deletedBookmarks: 0,
      deletedHighlights: 0,
    });
    upsertCloudBookmarks.mockResolvedValue(undefined);
    upsertCloudHighlights.mockResolvedValue(undefined);
    putBookmark.mockResolvedValue(undefined);
    putHighlight.mockResolvedValue(undefined);
    savePendingCloudDelete.mockResolvedValue(undefined);
  });

  it("batches anchor changes into a single delayed cloud flush", async () => {
    const { result } = renderHook(() =>
      useCloudAnchorSync({ userId: "user-1" }),
    );

    await act(async () => {
      result.current.queueBookmarkUpsert(bookmarkBase);
      result.current.queueBookmarkUpsert({
        ...bookmarkBase,
        id: "bookmark-2",
        label: "Bookmark 2",
      });
      result.current.queueHighlightUpsert(highlightBase);
      await result.current.queueBookmarkDelete("bookmark-3");
    });

    await act(async () => {
      vi.advanceTimersByTime(3_000);
      await Promise.resolve();
    });

    expect(upsertCloudBookmarks).toHaveBeenCalledTimes(1);
    expect(upsertCloudBookmarks).toHaveBeenCalledWith({}, "user-1", [
      expect.objectContaining({ id: "bookmark-1" }),
      expect.objectContaining({ id: "bookmark-2" }),
    ]);
    expect(upsertCloudHighlights).toHaveBeenCalledTimes(1);
    expect(upsertCloudHighlights).toHaveBeenCalledWith({}, "user-1", [
      expect.objectContaining({ id: "highlight-1" }),
    ]);
    expect(savePendingCloudDelete).toHaveBeenCalledWith({
      ownerId: "user-1",
      recordId: "bookmark-3",
      recordType: "bookmark",
    });
    expect(flushPendingCloudDeletes).toHaveBeenCalledWith({}, "user-1");
    expect(putBookmark).toHaveBeenCalledWith({
      ...bookmarkBase,
      syncState: "synced",
    });
    expect(putHighlight).toHaveBeenCalledWith({
      ...highlightBase,
      syncState: "synced",
    });
  });

  it("flushes pending anchor changes when the page becomes hidden", async () => {
    const { result } = renderHook(() =>
      useCloudAnchorSync({ userId: "user-1" }),
    );

    act(() => {
      result.current.queueHighlightUpsert(highlightBase);
    });

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(upsertCloudHighlights).toHaveBeenCalledTimes(1);
    expect(upsertCloudHighlights).toHaveBeenCalledWith({}, "user-1", [
      expect.objectContaining({ id: "highlight-1" }),
    ]);
  });

  it("persists delete retries before removing anchors locally", async () => {
    const { result } = renderHook(() =>
      useCloudAnchorSync({ userId: "user-1" }),
    );

    await act(async () => {
      await result.current.queueHighlightDelete("highlight-9");
      await result.current.flushPendingCloudAnchors();
    });

    expect(savePendingCloudDelete).toHaveBeenCalledWith({
      ownerId: "user-1",
      recordId: "highlight-9",
      recordType: "highlight",
    });
    expect(flushPendingCloudDeletes).toHaveBeenCalledWith({}, "user-1");
  });

  it("retries pending local-only anchors and marks them synced only after a successful cloud flush", async () => {
    upsertCloudBookmarks.mockRejectedValueOnce(new Error("offline"));
    upsertCloudHighlights.mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() =>
      useCloudAnchorSync({ userId: "user-1" }),
    );

    act(() => {
      result.current.queueBookmarkUpsert(bookmarkBase);
      result.current.queueHighlightUpsert(highlightBase);
    });

    await act(async () => {
      await result.current.flushPendingCloudAnchors();
    });

    expect(upsertCloudBookmarks).toHaveBeenCalledWith({}, "user-1", [
      bookmarkBase,
    ]);
    expect(upsertCloudHighlights).toHaveBeenCalledWith({}, "user-1", [
      highlightBase,
    ]);
    expect(putBookmark).not.toHaveBeenCalled();
    expect(putHighlight).not.toHaveBeenCalled();
    expect(flushPendingCloudDeletes).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flushPendingCloudAnchors();
    });

    expect(upsertCloudBookmarks).toHaveBeenCalledTimes(2);
    expect(upsertCloudHighlights).toHaveBeenCalledTimes(2);
    expect(putBookmark).toHaveBeenCalledWith({
      ...bookmarkBase,
      syncState: "synced",
    });
    expect(putHighlight).toHaveBeenCalledWith({
      ...highlightBase,
      syncState: "synced",
    });
    expect(flushPendingCloudDeletes).toHaveBeenCalledWith({}, "user-1");
  });
});

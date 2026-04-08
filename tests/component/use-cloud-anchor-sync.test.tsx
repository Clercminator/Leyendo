import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCloudAnchorSync } from "@/components/reader/use-cloud-anchor-sync";
import type { Bookmark, Highlight } from "@/types/reader";

const { getSupabaseBrowserClient } = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
}));

const {
  deleteCloudBookmarks,
  deleteCloudHighlights,
  upsertCloudBookmarks,
  upsertCloudHighlights,
} = vi.hoisted(() => ({
  deleteCloudBookmarks: vi.fn(),
  deleteCloudHighlights: vi.fn(),
  upsertCloudBookmarks: vi.fn(),
  upsertCloudHighlights: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient,
}));

vi.mock("@/lib/supabase/library-sync", () => ({
  deleteCloudBookmarks,
  deleteCloudHighlights,
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
    syncState: "synced",
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
    syncState: "synced",
    tokenIndex: 14,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getSupabaseBrowserClient.mockReturnValue({});
    deleteCloudBookmarks.mockResolvedValue(undefined);
    deleteCloudHighlights.mockResolvedValue(undefined);
    upsertCloudBookmarks.mockResolvedValue(undefined);
    upsertCloudHighlights.mockResolvedValue(undefined);
  });

  it("batches anchor changes into a single delayed cloud flush", async () => {
    const { result } = renderHook(() =>
      useCloudAnchorSync({ userId: "user-1" }),
    );

    act(() => {
      result.current.queueBookmarkUpsert(bookmarkBase);
      result.current.queueBookmarkUpsert({
        ...bookmarkBase,
        id: "bookmark-2",
        label: "Bookmark 2",
      });
      result.current.queueHighlightUpsert(highlightBase);
      result.current.queueBookmarkDelete("bookmark-3");
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
    expect(deleteCloudBookmarks).toHaveBeenCalledTimes(1);
    expect(deleteCloudBookmarks).toHaveBeenCalledWith({}, "user-1", [
      "bookmark-3",
    ]);
    expect(deleteCloudHighlights).toHaveBeenCalledTimes(1);
    expect(deleteCloudHighlights).toHaveBeenCalledWith({}, "user-1", []);
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
});

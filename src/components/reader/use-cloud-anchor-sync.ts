"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  putBookmark,
  putHighlight,
  savePendingCloudDelete,
} from "@/db/repositories";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  flushPendingCloudDeletes,
  upsertCloudBookmarks,
  upsertCloudHighlights,
} from "@/lib/supabase/library-sync";
import type { Bookmark, Highlight } from "@/types/reader";

const CLOUD_ANCHOR_SYNC_DELAY_MS = 3_000;

interface UseCloudAnchorSyncOptions {
  userId?: string;
}

export function useCloudAnchorSync({ userId }: UseCloudAnchorSyncOptions) {
  const pendingBookmarkUpsertsRef = useRef<Map<string, Bookmark>>(new Map());
  const pendingHighlightUpsertsRef = useRef<Map<string, Highlight>>(new Map());
  const flushTimeoutRef = useRef<number | undefined>(undefined);
  const isFlushingRef = useRef(false);

  const scheduleFlush = useCallback(() => {
    if (!userId) {
      return;
    }

    if (flushTimeoutRef.current !== undefined) {
      window.clearTimeout(flushTimeoutRef.current);
    }

    flushTimeoutRef.current = window.setTimeout(() => {
      flushTimeoutRef.current = undefined;
      void flushPendingCloudAnchors();
    }, CLOUD_ANCHOR_SYNC_DELAY_MS);
  }, [userId]);

  const flushPendingCloudAnchors = useCallback(async () => {
    if (!userId || isFlushingRef.current) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const bookmarkUpserts = Array.from(
      pendingBookmarkUpsertsRef.current.values(),
    );
    const highlightUpserts = Array.from(
      pendingHighlightUpsertsRef.current.values(),
    );

    if (bookmarkUpserts.length === 0 && highlightUpserts.length === 0) {
      isFlushingRef.current = true;
      let shouldRetryDeletes = false;

      try {
        await flushPendingCloudDeletes(supabase, userId);
      } catch (error) {
        shouldRetryDeletes = true;
        console.warn("cloud anchor sync failed", error);
      } finally {
        isFlushingRef.current = false;

        if (shouldRetryDeletes) {
          scheduleFlush();
        }
      }

      return;
    }

    pendingBookmarkUpsertsRef.current.clear();
    pendingHighlightUpsertsRef.current.clear();
    isFlushingRef.current = true;
    let shouldRetry = false;

    try {
      await Promise.all([
        upsertCloudBookmarks(supabase, userId, bookmarkUpserts),
        upsertCloudHighlights(supabase, userId, highlightUpserts),
      ]);

      await Promise.all([
        ...bookmarkUpserts.map((bookmark) =>
          putBookmark({
            ...bookmark,
            ownerId: bookmark.ownerId ?? userId,
            syncState: "synced",
          }),
        ),
        ...highlightUpserts.map((highlight) =>
          putHighlight({
            ...highlight,
            ownerId: highlight.ownerId ?? userId,
            syncState: "synced",
          }),
        ),
      ]);

      await flushPendingCloudDeletes(supabase, userId);
    } catch (error) {
      shouldRetry = true;
      console.warn("cloud anchor sync failed", error);

      bookmarkUpserts.forEach((bookmark) => {
        pendingBookmarkUpsertsRef.current.set(bookmark.id, bookmark);
      });
      highlightUpserts.forEach((highlight) => {
        pendingHighlightUpsertsRef.current.set(highlight.id, highlight);
      });
    } finally {
      isFlushingRef.current = false;

      if (
        pendingBookmarkUpsertsRef.current.size > 0 ||
        pendingHighlightUpsertsRef.current.size > 0 ||
        shouldRetry
      ) {
        scheduleFlush();
      }
    }
  }, [scheduleFlush, userId]);

  const queueBookmarkUpsert = useCallback(
    (bookmark: Bookmark) => {
      if (!userId) {
        return;
      }

      pendingBookmarkUpsertsRef.current.set(bookmark.id, bookmark);
      scheduleFlush();
    },
    [scheduleFlush, userId],
  );

  const queueHighlightUpsert = useCallback(
    (highlight: Highlight) => {
      if (!userId) {
        return;
      }

      pendingHighlightUpsertsRef.current.set(highlight.id, highlight);
      scheduleFlush();
    },
    [scheduleFlush, userId],
  );

  const queueBookmarkDelete = useCallback(
    async (bookmarkId: string) => {
      if (!userId) {
        return;
      }

      pendingBookmarkUpsertsRef.current.delete(bookmarkId);
      await savePendingCloudDelete({
        ownerId: userId,
        recordId: bookmarkId,
        recordType: "bookmark",
      });
      scheduleFlush();
    },
    [scheduleFlush, userId],
  );

  const queueHighlightDelete = useCallback(
    async (highlightId: string) => {
      if (!userId) {
        return;
      }

      pendingHighlightUpsertsRef.current.delete(highlightId);
      await savePendingCloudDelete({
        ownerId: userId,
        recordId: highlightId,
        recordType: "highlight",
      });
      scheduleFlush();
    },
    [scheduleFlush, userId],
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (globalThis.document.visibilityState === "hidden") {
        void flushPendingCloudAnchors();
      }
    };

    const handlePageHide = () => {
      void flushPendingCloudAnchors();
    };

    window.addEventListener("pagehide", handlePageHide);
    globalThis.document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      if (flushTimeoutRef.current !== undefined) {
        window.clearTimeout(flushTimeoutRef.current);
      }

      window.removeEventListener("pagehide", handlePageHide);
      globalThis.document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      void flushPendingCloudAnchors();
    };
  }, [flushPendingCloudAnchors]);

  return {
    flushPendingCloudAnchors,
    queueBookmarkDelete,
    queueBookmarkUpsert,
    queueHighlightDelete,
    queueHighlightUpsert,
  };
}

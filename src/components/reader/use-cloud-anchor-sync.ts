"use client";

import { useCallback, useEffect, useRef } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteCloudBookmarks,
  deleteCloudHighlights,
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
  const pendingBookmarkDeletesRef = useRef<Set<string>>(new Set());
  const pendingHighlightDeletesRef = useRef<Set<string>>(new Set());
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
    const bookmarkDeletes = Array.from(pendingBookmarkDeletesRef.current);
    const highlightDeletes = Array.from(pendingHighlightDeletesRef.current);

    if (
      bookmarkUpserts.length === 0 &&
      highlightUpserts.length === 0 &&
      bookmarkDeletes.length === 0 &&
      highlightDeletes.length === 0
    ) {
      return;
    }

    pendingBookmarkUpsertsRef.current.clear();
    pendingHighlightUpsertsRef.current.clear();
    pendingBookmarkDeletesRef.current.clear();
    pendingHighlightDeletesRef.current.clear();
    isFlushingRef.current = true;

    try {
      await Promise.all([
        upsertCloudBookmarks(supabase, userId, bookmarkUpserts),
        upsertCloudHighlights(supabase, userId, highlightUpserts),
        deleteCloudBookmarks(supabase, userId, bookmarkDeletes),
        deleteCloudHighlights(supabase, userId, highlightDeletes),
      ]);
    } catch (error) {
      console.warn("cloud anchor sync failed", error);

      bookmarkUpserts.forEach((bookmark) => {
        pendingBookmarkUpsertsRef.current.set(bookmark.id, bookmark);
      });
      highlightUpserts.forEach((highlight) => {
        pendingHighlightUpsertsRef.current.set(highlight.id, highlight);
      });
      bookmarkDeletes.forEach((bookmarkId) => {
        pendingBookmarkDeletesRef.current.add(bookmarkId);
      });
      highlightDeletes.forEach((highlightId) => {
        pendingHighlightDeletesRef.current.add(highlightId);
      });
    } finally {
      isFlushingRef.current = false;

      if (
        pendingBookmarkUpsertsRef.current.size > 0 ||
        pendingHighlightUpsertsRef.current.size > 0 ||
        pendingBookmarkDeletesRef.current.size > 0 ||
        pendingHighlightDeletesRef.current.size > 0
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

      pendingBookmarkDeletesRef.current.delete(bookmark.id);
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

      pendingHighlightDeletesRef.current.delete(highlight.id);
      pendingHighlightUpsertsRef.current.set(highlight.id, highlight);
      scheduleFlush();
    },
    [scheduleFlush, userId],
  );

  const queueBookmarkDelete = useCallback(
    (bookmarkId: string) => {
      if (!userId) {
        return;
      }

      pendingBookmarkUpsertsRef.current.delete(bookmarkId);
      pendingBookmarkDeletesRef.current.add(bookmarkId);
      scheduleFlush();
    },
    [scheduleFlush, userId],
  );

  const queueHighlightDelete = useCallback(
    (highlightId: string) => {
      if (!userId) {
        return;
      }

      pendingHighlightUpsertsRef.current.delete(highlightId);
      pendingHighlightDeletesRef.current.add(highlightId);
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

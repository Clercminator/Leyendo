"use client";

import { useEffect, useState } from "react";

import {
  buildInitialSession,
  getBookmarkById,
  getBookmarksForDocument,
  getDocumentById,
  getHighlightById,
  getHighlightsForDocument,
  getSessionForDocument,
} from "@/db/repositories";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hydrateRemoteDocumentToLocal } from "@/lib/supabase/library-sync";
import type { DocumentRecord } from "@/types/document";
import type { Bookmark, Highlight, ReadingSession } from "@/types/reader";

interface UseReaderDocumentOptions {
  documentId?: string;
  bookmarkId?: string;
  highlightId?: string;
  setActiveDocument: (documentId?: string) => void;
  userId?: string;
}

export function useReaderDocument({
  documentId,
  bookmarkId,
  highlightId,
  setActiveDocument,
  userId,
}: UseReaderDocumentOptions) {
  const [document, setDocument] = useState<DocumentRecord>();
  const [savedSession, setSavedSession] = useState<ReadingSession>();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    if (!documentId) {
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        setDocument(undefined);
        setSavedSession(undefined);
        setBookmarks([]);
        setHighlights([]);
        setError(undefined);
        setIsLoading(false);
      });
      setActiveDocument(undefined);
      return;
    }

    void (async () => {
      setIsLoading(true);
      setError(undefined);

      let [record, session, targetBookmark, targetHighlight] =
        await Promise.all([
          getDocumentById(documentId),
          getSessionForDocument(documentId),
          bookmarkId ? getBookmarkById(bookmarkId) : Promise.resolve(undefined),
          highlightId
            ? getHighlightById(highlightId)
            : Promise.resolve(undefined),
        ]);

      if (!record?.payload && userId) {
        const supabase = getSupabaseBrowserClient();

        if (supabase) {
          try {
            const hydrated = await hydrateRemoteDocumentToLocal(
              supabase,
              userId,
              documentId,
            );

            if (hydrated) {
              [record, session, targetBookmark, targetHighlight] =
                await Promise.all([
                  getDocumentById(documentId),
                  getSessionForDocument(documentId),
                  bookmarkId
                    ? getBookmarkById(bookmarkId)
                    : Promise.resolve(undefined),
                  highlightId
                    ? getHighlightById(highlightId)
                    : Promise.resolve(undefined),
                ]);
            }
          } catch (error) {
            console.warn("remote document hydration failed", error);
          }
        }
      }

      if (cancelled) {
        return;
      }

      if (!record?.payload) {
        setDocument(undefined);
        setSavedSession(undefined);
        setBookmarks([]);
        setHighlights([]);
        setError("We couldn't find that saved document on this device.");
        setIsLoading(false);
        setActiveDocument(undefined);
        return;
      }

      const targetAnchor =
        targetHighlight && targetHighlight.documentId === record.id
          ? targetHighlight
          : targetBookmark && targetBookmark.documentId === record.id
            ? targetBookmark
            : undefined;

      const [storedBookmarks, storedHighlights] = await Promise.all([
        getBookmarksForDocument(record.id),
        getHighlightsForDocument(record.id),
      ]);

      if (cancelled) {
        return;
      }

      setDocument(record);
      setSavedSession(
        targetAnchor
          ? {
              ...buildInitialSession(record.payload),
              currentChunkIndex: targetAnchor.chunkIndex,
              currentTokenIndex: targetAnchor.tokenIndex,
              currentParagraphIndex: targetAnchor.paragraphIndex,
              currentSectionIndex: targetAnchor.sectionIndex,
            }
          : (session ?? buildInitialSession(record.payload)),
      );
      setBookmarks(storedBookmarks);
      setHighlights(storedHighlights);
      setActiveDocument(record.id);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [bookmarkId, documentId, highlightId, setActiveDocument, userId]);

  return {
    document,
    savedSession,
    bookmarks,
    highlights,
    isLoading,
    error,
    prependBookmark: (bookmark: Bookmark) => {
      setBookmarks((currentBookmarks) => [bookmark, ...currentBookmarks]);
    },
    removeBookmark: (bookmarkIdToDelete: string) => {
      setBookmarks((currentBookmarks) =>
        currentBookmarks.filter(
          (bookmark) => bookmark.id !== bookmarkIdToDelete,
        ),
      );
    },
    prependHighlight: (highlight: Highlight) => {
      setHighlights((currentHighlights) => [highlight, ...currentHighlights]);
    },
    removeHighlight: (highlightIdToDelete: string) => {
      setHighlights((currentHighlights) =>
        currentHighlights.filter(
          (highlight) => highlight.id !== highlightIdToDelete,
        ),
      );
    },
  };
}

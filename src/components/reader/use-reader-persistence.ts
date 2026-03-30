"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  buildInitialSession,
  getStoredReaderPreferences,
  saveReaderPreferences,
  saveSession,
} from "@/db/repositories";
import { deriveReaderProgress } from "@/features/reader/engine/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { upsertCloudSessions } from "@/lib/supabase/library-sync";
import type { Chunk, DocumentRecord } from "@/types/document";
import type { ReaderPreferences } from "@/types/reader";

interface UseReaderPersistenceOptions {
  document?: DocumentRecord;
  activeChunk?: Chunk;
  currentChunkIndex: number;
  isPlaying: boolean;
  preferences: ReaderPreferences;
  runtimeChunks: Chunk[];
  userId?: string;
  updatePreferences: (changes: Partial<ReaderPreferences>) => void;
}

const SESSION_PROGRESS_BUCKET_SIZE = 5;

function getSessionProgressBucket(percentComplete: number) {
  return Math.floor(percentComplete / SESSION_PROGRESS_BUCKET_SIZE);
}

export function useReaderPersistence({
  document,
  activeChunk,
  currentChunkIndex,
  isPlaying,
  preferences,
  runtimeChunks,
  userId,
  updatePreferences,
}: UseReaderPersistenceOptions) {
  const hasHydratedPreferencesRef = useRef(false);
  const pendingSessionRef = useRef<
    ReturnType<typeof buildInitialSession> | undefined
  >(undefined);
  const lastSavedSignatureRef = useRef<string | undefined>(undefined);
  const lastPlaybackBoundaryRef = useRef<string | undefined>(undefined);
  const lastPlaybackStateRef = useRef(isPlaying);

  const flushPendingSession = useCallback(() => {
    const pendingSession = pendingSessionRef.current;

    if (!pendingSession) {
      return;
    }

    const signature = [
      pendingSession.documentId,
      pendingSession.currentChunkIndex,
      pendingSession.currentParagraphIndex,
      pendingSession.currentTokenIndex,
      pendingSession.percentComplete,
    ].join(":");

    if (signature === lastSavedSignatureRef.current) {
      return;
    }

    lastSavedSignatureRef.current = signature;
    void saveSession(pendingSession).then(() => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase || !userId) {
        return;
      }

      void upsertCloudSessions(supabase, userId, [pendingSession]).catch(
        (error) => {
          console.warn("session sync failed", error);
        },
      );
    });
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const storedPreferences = await getStoredReaderPreferences();
      if (cancelled || !storedPreferences) {
        return;
      }

      updatePreferences(storedPreferences);
      hasHydratedPreferencesRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [updatePreferences]);

  useEffect(() => {
    if (!hasHydratedPreferencesRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveReaderPreferences(preferences);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [preferences]);

  useEffect(() => {
    if (!document?.payload) {
      pendingSessionRef.current = undefined;
      lastPlaybackBoundaryRef.current = undefined;
      return;
    }

    const session = {
      ...buildInitialSession(document.payload),
      currentChunkIndex,
      currentTokenIndex: activeChunk?.anchorTokenIndex ?? 0,
      currentParagraphIndex: activeChunk?.paragraphIndex ?? 0,
      currentSectionIndex: activeChunk?.sectionIndex ?? 0,
      percentComplete: deriveReaderProgress(
        { chunks: runtimeChunks },
        currentChunkIndex,
      ),
      updatedAt: new Date().toISOString(),
    };

    pendingSessionRef.current = session;

    const nextBoundarySignature = [
      session.documentId,
      session.currentParagraphIndex,
      getSessionProgressBucket(session.percentComplete),
    ].join(":");
    const shouldFlushDuringPlayback =
      lastPlaybackBoundaryRef.current !== nextBoundarySignature;

    if (shouldFlushDuringPlayback) {
      lastPlaybackBoundaryRef.current = nextBoundarySignature;
    }

    if (isPlaying && !shouldFlushDuringPlayback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      flushPendingSession();
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeChunk,
    currentChunkIndex,
    document,
    flushPendingSession,
    isPlaying,
    runtimeChunks,
  ]);

  useEffect(() => {
    if (lastPlaybackStateRef.current && !isPlaying) {
      flushPendingSession();
    }

    lastPlaybackStateRef.current = isPlaying;
  }, [flushPendingSession, isPlaying]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (globalThis.document.visibilityState === "hidden") {
        flushPendingSession();
      }
    };

    const handlePageHide = () => {
      flushPendingSession();
    };

    window.addEventListener("pagehide", handlePageHide);
    globalThis.document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      globalThis.document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      flushPendingSession();
    };
  }, [flushPendingSession]);
}

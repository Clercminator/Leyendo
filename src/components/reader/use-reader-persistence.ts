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
import type { Chunk, DocumentRecord, TextPresentation } from "@/types/document";
import type { ReaderPreferences } from "@/types/reader";

interface UseReaderPersistenceOptions {
  anchorText?: string;
  document?: DocumentRecord;
  activeChunk?: Chunk;
  currentChunkIndex: number;
  isPlaying: boolean;
  preferences: ReaderPreferences;
  profileReaderPreferences?: ReaderPreferences;
  runtimeChunks: Chunk[];
  syncReaderPreferences?: (preferences: ReaderPreferences) => Promise<void>;
  textPresentation?: TextPresentation;
  userId?: string;
  updatePreferences: (changes: Partial<ReaderPreferences>) => void;
}

const SESSION_PROGRESS_BUCKET_SIZE = 5;
const CLOUD_SESSION_SYNC_DELAY_MS = 15_000;

function getSessionProgressBucket(percentComplete: number) {
  return Math.floor(percentComplete / SESSION_PROGRESS_BUCKET_SIZE);
}

export function useReaderPersistence({
  anchorText,
  document,
  activeChunk,
  currentChunkIndex,
  isPlaying,
  preferences,
  profileReaderPreferences,
  runtimeChunks,
  syncReaderPreferences,
  textPresentation,
  userId,
  updatePreferences,
}: UseReaderPersistenceOptions) {
  const hasHydratedPreferencesRef = useRef(false);
  const pendingSessionRef = useRef<
    ReturnType<typeof buildInitialSession> | undefined
  >(undefined);
  const pendingCloudSessionRef = useRef<
    ReturnType<typeof buildInitialSession> | undefined
  >(undefined);
  const cloudSyncTimeoutRef = useRef<number | undefined>(undefined);
  const lastSavedSignatureRef = useRef<string | undefined>(undefined);
  const lastCloudSignatureRef = useRef<string | undefined>(undefined);
  const lastSyncedPreferenceSignatureRef = useRef<string | undefined>(
    undefined,
  );
  const lastPlaybackBoundaryRef = useRef<string | undefined>(undefined);
  const lastPlaybackStateRef = useRef(isPlaying);

  const flushCloudSession = useCallback(() => {
    const pendingSession = pendingCloudSessionRef.current;

    if (!pendingSession) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase || !userId) {
      return;
    }

    const signature = [
      pendingSession.documentId,
      pendingSession.currentChunkIndex,
      pendingSession.currentParagraphIndex,
      pendingSession.currentTokenIndex,
      pendingSession.textPresentation ?? "default",
      pendingSession.percentComplete,
    ].join(":");

    if (signature === lastCloudSignatureRef.current) {
      return;
    }

    lastCloudSignatureRef.current = signature;
    cloudSyncTimeoutRef.current = undefined;
    void upsertCloudSessions(supabase, userId, [pendingSession]).catch(
      (error) => {
        console.warn("session sync failed", error);
      },
    );
  }, [userId]);

  const flushPendingSession = useCallback(
    (options?: { forceCloud?: boolean }) => {
      const pendingSession = pendingSessionRef.current;

      if (!pendingSession) {
        return;
      }

      const signature = [
        pendingSession.documentId,
        pendingSession.currentChunkIndex,
        pendingSession.currentParagraphIndex,
        pendingSession.currentTokenIndex,
        pendingSession.textPresentation ?? "default",
        pendingSession.percentComplete,
      ].join(":");

      if (signature === lastSavedSignatureRef.current) {
        if (options?.forceCloud) {
          pendingCloudSessionRef.current = pendingSession;

          if (cloudSyncTimeoutRef.current !== undefined) {
            window.clearTimeout(cloudSyncTimeoutRef.current);
          }

          flushCloudSession();
        }

        return;
      }

      lastSavedSignatureRef.current = signature;
      void saveSession(pendingSession).then(() => {
        pendingCloudSessionRef.current = pendingSession;

        if (!userId) {
          return;
        }

        if (cloudSyncTimeoutRef.current !== undefined) {
          window.clearTimeout(cloudSyncTimeoutRef.current);
        }

        if (options?.forceCloud) {
          flushCloudSession();
          return;
        }

        cloudSyncTimeoutRef.current = window.setTimeout(() => {
          flushCloudSession();
        }, CLOUD_SESSION_SYNC_DELAY_MS);
      });
    },
    [flushCloudSession, userId],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (userId && profileReaderPreferences) {
        const signature = JSON.stringify(profileReaderPreferences);
        lastSyncedPreferenceSignatureRef.current = signature;
        updatePreferences(profileReaderPreferences);
        await saveReaderPreferences(profileReaderPreferences);
        hasHydratedPreferencesRef.current = true;
        return;
      }

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
  }, [profileReaderPreferences, updatePreferences, userId]);

  useEffect(() => {
    if (!hasHydratedPreferencesRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveReaderPreferences(preferences);

      if (!userId || !syncReaderPreferences) {
        return;
      }

      const signature = JSON.stringify(preferences);
      if (signature === lastSyncedPreferenceSignatureRef.current) {
        return;
      }

      lastSyncedPreferenceSignatureRef.current = signature;
      void syncReaderPreferences(preferences);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [preferences, syncReaderPreferences, userId]);

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
      anchorText: anchorText ?? activeChunk?.text,
      ownerId: document.ownerId,
      percentComplete: deriveReaderProgress(
        { chunks: runtimeChunks },
        currentChunkIndex,
      ),
      syncState: document.syncState,
      textPresentation,
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
    anchorText,
    activeChunk,
    currentChunkIndex,
    document,
    flushPendingSession,
    isPlaying,
    runtimeChunks,
    textPresentation,
  ]);

  useEffect(() => {
    if (lastPlaybackStateRef.current && !isPlaying) {
      flushPendingSession({ forceCloud: true });
    }

    lastPlaybackStateRef.current = isPlaying;
  }, [flushPendingSession, isPlaying]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (globalThis.document.visibilityState === "hidden") {
        flushPendingSession({ forceCloud: true });
      }
    };

    const handlePageHide = () => {
      flushPendingSession({ forceCloud: true });
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
      if (cloudSyncTimeoutRef.current !== undefined) {
        window.clearTimeout(cloudSyncTimeoutRef.current);
      }
      flushPendingSession({ forceCloud: true });
    };
  }, [flushPendingSession]);
}

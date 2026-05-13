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
const PREFERENCE_SAVE_DELAY_MS = 450;
const PREFERENCE_SYNC_DELAY_MS = 1_200;

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
  const lastAppliedProfilePreferenceSignatureRef = useRef<string | undefined>(
    undefined,
  );
  const lastHydratedPreferenceUserIdRef = useRef<string | undefined>(
    undefined,
  );
  const lastPlaybackBoundaryRef = useRef<string | undefined>(undefined);
  const lastPlaybackStateRef = useRef(isPlaying);
  const pendingPreferencesRef = useRef<ReaderPreferences | undefined>(
    undefined,
  );
  const preferenceSaveTimeoutRef = useRef<number | undefined>(undefined);
  const preferenceSyncTimeoutRef = useRef<number | undefined>(undefined);
  const latestPreferenceSignatureRef = useRef(JSON.stringify(preferences));

  useEffect(() => {
    latestPreferenceSignatureRef.current = JSON.stringify(preferences);
  }, [preferences]);

  const flushPreferenceSave = useCallback(() => {
    const pendingPreferences = pendingPreferencesRef.current;

    if (!pendingPreferences) {
      return;
    }

    void saveReaderPreferences(pendingPreferences);
  }, []);

  const flushPreferenceSync = useCallback(() => {
    const pendingPreferences = pendingPreferencesRef.current;

    if (!pendingPreferences || !userId || !syncReaderPreferences) {
      return;
    }

    const signature = JSON.stringify(pendingPreferences);

    if (signature === lastSyncedPreferenceSignatureRef.current) {
      return;
    }

    lastSyncedPreferenceSignatureRef.current = signature;
    void syncReaderPreferences(pendingPreferences);
  }, [syncReaderPreferences, userId]);

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

    cloudSyncTimeoutRef.current = undefined;
    void upsertCloudSessions(supabase, userId, [pendingSession])
      .then(async () => {
        lastCloudSignatureRef.current = signature;
        await saveSession({
          ...pendingSession,
          ownerId: pendingSession.ownerId ?? userId,
          syncState: "synced",
        });
      })
      .catch((error) => {
        lastCloudSignatureRef.current = undefined;
        console.warn("session sync failed", error);
      });
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

    if (lastHydratedPreferenceUserIdRef.current !== userId) {
      lastHydratedPreferenceUserIdRef.current = userId;
      lastAppliedProfilePreferenceSignatureRef.current = undefined;
      hasHydratedPreferencesRef.current = false;
    }

    void (async () => {
      if (userId && profileReaderPreferences) {
        const signature = JSON.stringify(profileReaderPreferences);
        const localSignature = latestPreferenceSignatureRef.current;
        const lastAppliedProfileSignature =
          lastAppliedProfilePreferenceSignatureRef.current;
        const isFirstProfileHydration = lastAppliedProfileSignature === undefined;
        const shouldHydrateFromProfile =
          isFirstProfileHydration ||
          localSignature === signature ||
          localSignature === lastAppliedProfileSignature;

        if (!shouldHydrateFromProfile) {
          return;
        }

        lastSyncedPreferenceSignatureRef.current = signature;
        lastAppliedProfilePreferenceSignatureRef.current = signature;

        if (isFirstProfileHydration || localSignature !== signature) {
          updatePreferences(profileReaderPreferences);
        }

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

    pendingPreferencesRef.current = preferences;

    if (preferenceSaveTimeoutRef.current !== undefined) {
      window.clearTimeout(preferenceSaveTimeoutRef.current);
    }

    if (preferenceSyncTimeoutRef.current !== undefined) {
      window.clearTimeout(preferenceSyncTimeoutRef.current);
    }

    preferenceSaveTimeoutRef.current = window.setTimeout(() => {
      flushPreferenceSave();
      preferenceSaveTimeoutRef.current = undefined;
    }, PREFERENCE_SAVE_DELAY_MS);

    preferenceSyncTimeoutRef.current = window.setTimeout(() => {
      flushPreferenceSync();
      preferenceSyncTimeoutRef.current = undefined;
    }, PREFERENCE_SYNC_DELAY_MS);

    return () => {
      if (preferenceSaveTimeoutRef.current !== undefined) {
        window.clearTimeout(preferenceSaveTimeoutRef.current);
      }

      if (preferenceSyncTimeoutRef.current !== undefined) {
        window.clearTimeout(preferenceSyncTimeoutRef.current);
      }
    };
  }, [flushPreferenceSave, flushPreferenceSync, preferences]);

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
      syncState: userId ? ("local-only" as const) : document.syncState,
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
    userId,
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
        flushPreferenceSave();
        flushPreferenceSync();
        flushPendingSession({ forceCloud: true });
      }
    };

    const handlePageHide = () => {
      flushPreferenceSave();
      flushPreferenceSync();
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
      if (preferenceSaveTimeoutRef.current !== undefined) {
        window.clearTimeout(preferenceSaveTimeoutRef.current);
      }
      if (preferenceSyncTimeoutRef.current !== undefined) {
        window.clearTimeout(preferenceSyncTimeoutRef.current);
      }
      flushPreferenceSave();
      flushPreferenceSync();
      flushPendingSession({ forceCloud: true });
    };
  }, [flushPendingSession, flushPreferenceSave, flushPreferenceSync]);
}

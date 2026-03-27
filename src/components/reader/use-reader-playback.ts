"use client";

import { startTransition, useEffect } from "react";

import { recordPerfMetric } from "@/lib/perf/instrumentation";
import {
  deriveChunkDurationMs,
  derivePlaybackDriftMs,
} from "@/features/reader/engine/timing";
import type { Chunk } from "@/types/document";
import type { ReaderPreferences } from "@/types/reader";

interface UseReaderPlaybackOptions {
  activeChunk?: Chunk;
  currentChunkIndex: number;
  isPlaying: boolean;
  preferences: ReaderPreferences;
  runtimeChunkCount: number;
  setChunkIndex: (index: number) => void;
  setPlaying: (isPlaying: boolean) => void;
}

export function useReaderPlayback({
  activeChunk,
  currentChunkIndex,
  isPlaying,
  preferences,
  runtimeChunkCount,
  setChunkIndex,
  setPlaying,
}: UseReaderPlaybackOptions) {
  useEffect(() => {
    if (!activeChunk || !isPlaying) {
      return;
    }

    if (currentChunkIndex >= runtimeChunkCount - 1) {
      setPlaying(false);
      return;
    }

    const expectedDurationMs = deriveChunkDurationMs(activeChunk, preferences);
    const startedAt = performance.now();

    const timeoutId = window.setTimeout(() => {
      const actualDurationMs = performance.now() - startedAt;
      recordPerfMetric({
        name: "reader.playback-drift",
        durationMs: Math.round(actualDurationMs),
        timestamp: Date.now(),
        detail: {
          expectedDurationMs,
          actualDurationMs: Math.round(actualDurationMs),
          driftMs: derivePlaybackDriftMs(expectedDurationMs, actualDurationMs),
          chunkIndex: currentChunkIndex,
        },
      });

      startTransition(() => {
        setChunkIndex(currentChunkIndex + 1);
      });
    }, expectedDurationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeChunk,
    currentChunkIndex,
    isPlaying,
    preferences,
    runtimeChunkCount,
    setChunkIndex,
    setPlaying,
  ]);
}

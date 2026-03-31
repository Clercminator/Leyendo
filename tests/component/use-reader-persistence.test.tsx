import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useReaderPersistence } from "@/components/reader/use-reader-persistence";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
import { deriveRuntimeChunks } from "@/features/reader/engine/navigation";
import { defaultReaderPreferences } from "@/types/reader";

const { getStoredReaderPreferences, saveReaderPreferences, saveSession } =
  vi.hoisted(() => ({
    getStoredReaderPreferences: vi.fn(),
    saveReaderPreferences: vi.fn(),
    saveSession: vi.fn(),
  }));

vi.mock("@/db/repositories", async () => {
  const actual =
    await vi.importActual<typeof import("@/db/repositories")>(
      "@/db/repositories",
    );

  return {
    ...actual,
    getStoredReaderPreferences,
    saveReaderPreferences,
    saveSession,
  };
});

describe("useReaderPersistence", () => {
  const documentModel = buildDocumentModel({
    title: "Persistence sample",
    rawText: Array.from({ length: 40 }, (_, index) => `word${index + 1}`).join(
      " ",
    ),
    sourceKind: "plain-text",
    chunkSize: 1,
  });
  const runtimeChunks = deriveRuntimeChunks(documentModel, 1);
  const record = {
    id: documentModel.id,
    title: documentModel.title,
    sourceKind: documentModel.sourceKind,
    excerpt: documentModel.excerpt,
    createdAt: documentModel.createdAt,
    updatedAt: documentModel.updatedAt,
    totalChunks: documentModel.chunks.length,
    totalSections: documentModel.sections.length,
    payload: documentModel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getStoredReaderPreferences.mockResolvedValue(defaultReaderPreferences);
    saveReaderPreferences.mockResolvedValue(defaultReaderPreferences);
    saveSession.mockResolvedValue(undefined);
  });

  it("avoids saving on every playback chunk inside the same boundary", async () => {
    const updatePreferences = vi.fn();
    const { rerender } = renderHook(
      ({ currentChunkIndex, isPlaying }) =>
        useReaderPersistence({
          document: record,
          activeChunk: runtimeChunks[currentChunkIndex],
          currentChunkIndex,
          isPlaying,
          preferences: defaultReaderPreferences,
          runtimeChunks,
          updatePreferences,
        }),
      {
        initialProps: {
          currentChunkIndex: 0,
          isPlaying: true,
        },
      },
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(saveSession).toHaveBeenCalledTimes(1);

    rerender({ currentChunkIndex: 1, isPlaying: true });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(saveSession).toHaveBeenCalledTimes(1);
  });

  it("flushes the latest session when playback stops", async () => {
    const updatePreferences = vi.fn();
    const { rerender } = renderHook(
      ({ currentChunkIndex, isPlaying }) =>
        useReaderPersistence({
          document: record,
          activeChunk: runtimeChunks[currentChunkIndex],
          currentChunkIndex,
          isPlaying,
          preferences: defaultReaderPreferences,
          runtimeChunks,
          updatePreferences,
        }),
      {
        initialProps: {
          currentChunkIndex: 0,
          isPlaying: true,
        },
      },
    );

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(250);
    });

    rerender({ currentChunkIndex: 1, isPlaying: true });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(saveSession).toHaveBeenCalledTimes(1);

    rerender({ currentChunkIndex: 1, isPlaying: false });

    await act(async () => {
      await Promise.resolve();
    });

    expect(saveSession).toHaveBeenCalledTimes(2);
    expect(saveSession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentChunkIndex: 1,
        currentTokenIndex: runtimeChunks[1]?.tokenIndexes[0],
      }),
    );
  });

  it("flushes the latest pending session when the page hides", async () => {
    const updatePreferences = vi.fn();
    const { rerender } = renderHook(
      ({ currentChunkIndex, isPlaying }) =>
        useReaderPersistence({
          document: record,
          activeChunk: runtimeChunks[currentChunkIndex],
          currentChunkIndex,
          isPlaying,
          preferences: defaultReaderPreferences,
          runtimeChunks,
          updatePreferences,
        }),
      {
        initialProps: {
          currentChunkIndex: 0,
          isPlaying: true,
        },
      },
    );

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(250);
    });

    rerender({ currentChunkIndex: 1, isPlaying: true });

    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(saveSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(saveSession).toHaveBeenCalledTimes(2);
    expect(saveSession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentChunkIndex: 1,
      }),
    );
  });

  it("preserves ownership metadata when persisting a synced session locally", async () => {
    const updatePreferences = vi.fn();
    const syncedRecord = {
      ...record,
      ownerId: "user-1",
      syncState: "synced" as const,
    };

    renderHook(() =>
      useReaderPersistence({
        document: syncedRecord,
        activeChunk: runtimeChunks[0],
        currentChunkIndex: 0,
        isPlaying: false,
        preferences: defaultReaderPreferences,
        runtimeChunks,
        updatePreferences,
      }),
    );

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(250);
    });

    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: syncedRecord.id,
        ownerId: "user-1",
        syncState: "synced",
      }),
    );
  });

  it("hydrates reader preferences from the signed-in profile and syncs later changes back to cloud", async () => {
    const updatePreferences = vi.fn();
    const syncReaderPreferences = vi.fn().mockResolvedValue(undefined);
    const cloudPreferences = {
      ...defaultReaderPreferences,
      chunkSize: 1,
      theme: "ember" as const,
      wordsPerMinute: 420,
    };
    const { rerender } = renderHook(
      ({ preferences }) =>
        useReaderPersistence({
          document: record,
          activeChunk: runtimeChunks[0],
          currentChunkIndex: 0,
          isPlaying: false,
          preferences,
          profileReaderPreferences: cloudPreferences,
          runtimeChunks,
          syncReaderPreferences,
          updatePreferences,
          userId: "user-1",
        }),
      {
        initialProps: {
          preferences: cloudPreferences,
        },
      },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(updatePreferences).toHaveBeenCalledWith(cloudPreferences);
    expect(saveReaderPreferences).toHaveBeenCalledWith(cloudPreferences);
    expect(syncReaderPreferences).not.toHaveBeenCalled();

    const nextPreferences = {
      ...cloudPreferences,
      wordsPerMinute: 440,
    };

    rerender({ preferences: nextPreferences });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(saveReaderPreferences).toHaveBeenCalledWith(nextPreferences);
    expect(syncReaderPreferences).toHaveBeenCalledWith(nextPreferences);
  });
});

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
  const actual = await vi.importActual<typeof import("@/db/repositories")>(
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
});
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReaderAdBreaks } from "@/components/reader/use-reader-ad-breaks";
import { getReaderAdsStorageKey } from "@/lib/reader-ads";

const { preloadImaSdk } = vi.hoisted(() => ({
  preloadImaSdk: vi.fn(),
}));

const { trackReaderAdMetric } = vi.hoisted(() => ({
  trackReaderAdMetric: vi.fn(),
}));

vi.mock("@/components/reader/ima-ad-player", () => ({
  preloadImaSdk,
}));

vi.mock("@/lib/reader-ad-analytics", () => ({
  trackReaderAdMetric,
}));

describe("useReaderAdBreaks", () => {
  const originalEnv = {
    NEXT_PUBLIC_READER_ADS_BREAK_INTERVAL_MINUTES:
      process.env.NEXT_PUBLIC_READER_ADS_BREAK_INTERVAL_MINUTES,
    NEXT_PUBLIC_READER_ADS_DEMAND_MODE:
      process.env.NEXT_PUBLIC_READER_ADS_DEMAND_MODE,
    NEXT_PUBLIC_READER_ADS_ENABLED: process.env.NEXT_PUBLIC_READER_ADS_ENABLED,
    NEXT_PUBLIC_READER_ADS_MAX_BREAKS_PER_DAY:
      process.env.NEXT_PUBLIC_READER_ADS_MAX_BREAKS_PER_DAY,
  };
  const originalDateTimeFormat = Intl.DateTimeFormat;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T12:00:00.000Z"));
    window.localStorage.clear();
    preloadImaSdk.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_READER_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_READER_ADS_BREAK_INTERVAL_MINUTES = "1";
    process.env.NEXT_PUBLIC_READER_ADS_MAX_BREAKS_PER_DAY = "3";
    process.env.NEXT_PUBLIC_READER_ADS_DEMAND_MODE = "test";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_READER_ADS_BREAK_INTERVAL_MINUTES =
      originalEnv.NEXT_PUBLIC_READER_ADS_BREAK_INTERVAL_MINUTES;
    process.env.NEXT_PUBLIC_READER_ADS_DEMAND_MODE =
      originalEnv.NEXT_PUBLIC_READER_ADS_DEMAND_MODE;
    process.env.NEXT_PUBLIC_READER_ADS_ENABLED =
      originalEnv.NEXT_PUBLIC_READER_ADS_ENABLED;
    process.env.NEXT_PUBLIC_READER_ADS_MAX_BREAKS_PER_DAY =
      originalEnv.NEXT_PUBLIC_READER_ADS_MAX_BREAKS_PER_DAY;
    Intl.DateTimeFormat = originalDateTimeFormat;
    vi.useRealTimers();
  });

  it("opens a sponsor prompt after the active reading interval", async () => {
    const setPlaying = vi.fn();
    const { result } = renderHook(() =>
      useReaderAdBreaks({
        documentId: "doc-1",
        isPlaying: true,
        ownerKey: "guest",
        planTier: "basic",
        readerMode: "classic-reader",
        readerReady: true,
        setPlaying,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.phase).toBe("prompt");
    expect(setPlaying).toHaveBeenCalledWith(false);
    expect(trackReaderAdMetric).toHaveBeenCalledWith(
      "reader_ad_break_shown",
      expect.objectContaining({
        planTier: "basic",
        provider: "ima",
      }),
    );
  });

  it("respects the local daily frequency cap before another break is shown", async () => {
    const now = Date.now();
    window.localStorage.setItem(
      getReaderAdsStorageKey("guest"),
      JSON.stringify({
        breakTimestamps: [now - 5 * 60 * 1000],
      }),
    );
    process.env.NEXT_PUBLIC_READER_ADS_MAX_BREAKS_PER_DAY = "1";

    const { result } = renderHook(() =>
      useReaderAdBreaks({
        documentId: "doc-1",
        isPlaying: true,
        ownerKey: "guest",
        planTier: "basic",
        readerMode: "classic-reader",
        readerReady: true,
        setPlaying: vi.fn(),
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.phase).toBe("idle");
    expect(trackReaderAdMetric).not.toHaveBeenCalledWith(
      "reader_ad_break_shown",
      expect.anything(),
    );
  });

  it("moves into the consent step for live demand in UK and EU regions", async () => {
    process.env.NEXT_PUBLIC_READER_ADS_DEMAND_MODE = "live";
    Intl.DateTimeFormat = vi.fn(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: "Europe/London" }),
        }) as Intl.DateTimeFormat,
    ) as unknown as typeof Intl.DateTimeFormat;

    const { result } = renderHook(() =>
      useReaderAdBreaks({
        documentId: "doc-1",
        isPlaying: true,
        ownerKey: "guest",
        planTier: "basic",
        readerMode: "classic-reader",
        readerReady: true,
        setPlaying: vi.fn(),
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    act(() => {
      result.current.beginAdBreak();
    });

    expect(result.current.phase).toBe("consent");
    expect(result.current.consentRegion).toBe("uk");
  });
});

import { describe, expect, it } from "vitest";

import {
  canScheduleReaderAdBreak,
  getRemainingReaderAdBreaks,
  pruneBreakTimestamps,
  requiresReaderAdConsent,
  resolveReaderAdConsentRegion,
  shouldEnableReaderAdsForPlan,
} from "@/lib/reader-ads";

describe("reader ad helpers", () => {
  it("prunes break timestamps older than 24 hours", () => {
    const now = Date.UTC(2026, 3, 9, 12, 0, 0);

    expect(
      pruneBreakTimestamps(
        [
          now - 26 * 60 * 60 * 1000,
          now - 2 * 60 * 60 * 1000,
          now - 15 * 60 * 1000,
        ],
        now,
      ),
    ).toEqual([now - 2 * 60 * 60 * 1000, now - 15 * 60 * 1000]);
  });

  it("blocks new breaks after the configured daily cap", () => {
    const now = Date.UTC(2026, 3, 9, 12, 0, 0);
    const breakTimestamps = [
      now - 30 * 60 * 1000,
      now - 60 * 60 * 1000,
      now - 2 * 60 * 60 * 1000,
    ];

    expect(
      canScheduleReaderAdBreak({
        breakTimestamps,
        maxBreaksPer24Hours: 3,
        now,
      }),
    ).toBe(false);
    expect(
      getRemainingReaderAdBreaks({
        breakTimestamps,
        maxBreaksPer24Hours: 3,
        now,
      }),
    ).toBe(0);
  });

  it("requires consent only for live demand in UK and EU time zones", () => {
    expect(resolveReaderAdConsentRegion("Europe/London")).toBe("uk");
    expect(resolveReaderAdConsentRegion("Europe/Madrid")).toBe("eu");
    expect(resolveReaderAdConsentRegion("America/Bogota")).toBe("other");

    expect(
      requiresReaderAdConsent({
        demandMode: "live",
        region: "uk",
        requireEuropeanConsentForLiveDemand: true,
      }),
    ).toBe(true);
    expect(
      requiresReaderAdConsent({
        demandMode: "test",
        region: "uk",
        requireEuropeanConsentForLiveDemand: true,
      }),
    ).toBe(false);
  });

  it("keeps ads off paid plans", () => {
    expect(shouldEnableReaderAdsForPlan("basic")).toBe(true);
    expect(shouldEnableReaderAdsForPlan("focus")).toBe(false);
    expect(shouldEnableReaderAdsForPlan("max")).toBe(false);
  });
});

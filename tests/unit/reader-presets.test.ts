import { describe, expect, it } from "vitest";

import {
  getRecommendedMode,
  getRecommendedPreferences,
} from "@/features/reader/engine/presets";

describe("reader goal recommendations", () => {
  it("returns the expected mode for each reading goal", () => {
    expect(getRecommendedMode("study-carefully")).toBe("classic-reader");
    expect(getRecommendedMode("read-faster")).toBe("phrase-chunk");
    expect(getRecommendedMode("skim-overview")).toBe("guided-line");
    expect(getRecommendedMode("practice-focus")).toBe("focus-word");
  });

  it("returns usable pacing preferences for each reading goal", () => {
    expect(getRecommendedPreferences("study-carefully")).toMatchObject({
      mode: "classic-reader",
      wordsPerMinute: 220,
      chunkSize: 1,
    });

    expect(getRecommendedPreferences("skim-overview")).toMatchObject({
      mode: "guided-line",
      wordsPerMinute: 320,
      chunkSize: 4,
    });
  });
});
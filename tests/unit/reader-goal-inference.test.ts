import { describe, expect, it } from "vitest";

import {
  getMatchingReadingGoal,
  getRecommendedPreferences,
  getReadingGoalLabel,
} from "@/features/reader/engine/presets";

describe("reader goal inference", () => {
  it("infers a goal when preferences exactly match a recommendation", () => {
    expect(getMatchingReadingGoal(getRecommendedPreferences("read-faster"))).toBe(
      "read-faster",
    );
    expect(
      getMatchingReadingGoal(getRecommendedPreferences("practice-focus")),
    ).toBe("practice-focus");
  });

  it("returns undefined when preferences are customized away from a goal", () => {
    expect(
      getMatchingReadingGoal({
        ...getRecommendedPreferences("practice-focus"),
        wordsPerMinute: 280,
      }),
    ).toBeUndefined();
  });

  it("returns readable labels for reading goals", () => {
    expect(getReadingGoalLabel("study-carefully")).toBe("Study carefully");
    expect(getReadingGoalLabel("skim-overview")).toBe("Skim for overview");
  });
});
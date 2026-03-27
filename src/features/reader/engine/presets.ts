import type {
  ReadingGoal,
  ReaderMode,
  ReaderPreferences,
} from "@/types/reader";

const goalLabels: Record<ReadingGoal, string> = {
  "study-carefully": "Study carefully",
  "read-faster": "Read faster",
  "skim-overview": "Skim for overview",
  "practice-focus": "Practice focus",
};

const recommendations: Record<ReadingGoal, ReaderMode> = {
  "study-carefully": "classic-reader",
  "read-faster": "phrase-chunk",
  "skim-overview": "guided-line",
  "practice-focus": "focus-word",
};

export function getRecommendedMode(goal: ReadingGoal): ReaderMode {
  return recommendations[goal];
}

const preferenceRecommendations: Record<
  ReadingGoal,
  Pick<
    ReaderPreferences,
    | "mode"
    | "wordsPerMinute"
    | "chunkSize"
    | "focusWindow"
    | "naturalPauses"
    | "smartPacing"
    | "reduceMotion"
  >
> = {
  "study-carefully": {
    mode: "classic-reader",
    wordsPerMinute: 220,
    chunkSize: 1,
    focusWindow: 3,
    naturalPauses: true,
    smartPacing: true,
    reduceMotion: true,
  },
  "read-faster": {
    mode: "phrase-chunk",
    wordsPerMinute: 360,
    chunkSize: 3,
    focusWindow: 2,
    naturalPauses: true,
    smartPacing: true,
    reduceMotion: false,
  },
  "skim-overview": {
    mode: "guided-line",
    wordsPerMinute: 320,
    chunkSize: 4,
    focusWindow: 4,
    naturalPauses: false,
    smartPacing: true,
    reduceMotion: false,
  },
  "practice-focus": {
    mode: "focus-word",
    wordsPerMinute: 260,
    chunkSize: 1,
    focusWindow: 1,
    naturalPauses: true,
    smartPacing: true,
    reduceMotion: true,
  },
};

export function getRecommendedPreferences(goal: ReadingGoal) {
  return preferenceRecommendations[goal];
}

export function getReadingGoalLabel(goal: ReadingGoal) {
  return goalLabels[goal];
}

export function getMatchingReadingGoal(
  preferences: Pick<
    ReaderPreferences,
    | "mode"
    | "wordsPerMinute"
    | "chunkSize"
    | "focusWindow"
    | "naturalPauses"
    | "smartPacing"
    | "reduceMotion"
  >,
): ReadingGoal | undefined {
  return (Object.keys(preferenceRecommendations) as ReadingGoal[]).find(
    (goal) => {
      const recommendation = preferenceRecommendations[goal];

      return (
        recommendation.mode === preferences.mode &&
        recommendation.wordsPerMinute === preferences.wordsPerMinute &&
        recommendation.chunkSize === preferences.chunkSize &&
        recommendation.focusWindow === preferences.focusWindow &&
        recommendation.naturalPauses === preferences.naturalPauses &&
        recommendation.smartPacing === preferences.smartPacing &&
        recommendation.reduceMotion === preferences.reduceMotion
      );
    },
  );
}

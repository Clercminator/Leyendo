export const readerModes = [
  "focus-word",
  "phrase-chunk",
  "guided-line",
  "classic-reader",
] as const;

export type ReaderMode = (typeof readerModes)[number];

export type ReadingGoal =
  | "study-carefully"
  | "read-faster"
  | "skim-overview"
  | "practice-focus";

export type ReaderTheme = "midnight" | "ember" | "indigo" | "high-contrast";

export interface ReaderPreferences {
  readingGoal?: ReadingGoal;
  mode: ReaderMode;
  theme: ReaderTheme;
  wordsPerMinute: number;
  chunkSize: number;
  focusWindow: 1 | 2 | 3 | 4;
  fontScale: number;
  lineHeight: number;
  naturalPauses: boolean;
  smartPacing: boolean;
  reduceMotion: boolean;
}

export interface ReadingSession {
  id: string;
  documentId: string;
  currentChunkIndex: number;
  currentTokenIndex: number;
  currentParagraphIndex: number;
  currentSectionIndex: number;
  percentComplete: number;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  documentId: string;
  label: string;
  note?: string;
  chunkIndex: number;
  tokenIndex: number;
  paragraphIndex: number;
  sectionIndex: number;
  createdAt: string;
}

export interface Highlight {
  id: string;
  documentId: string;
  label: string;
  quote: string;
  note?: string;
  chunkIndex: number;
  tokenIndex: number;
  paragraphIndex: number;
  sectionIndex: number;
  createdAt: string;
}

export interface ReaderPreset {
  id: "beginner" | "comfortable" | "push-me" | "challenge";
  label: string;
  summary: string;
  mode: ReaderMode;
  wordsPerMinute: number;
  chunkSize: number;
  focusWindow: 1 | 2 | 3 | 4;
  naturalPauses: boolean;
  smartPacing: boolean;
  reduceMotion: boolean;
}

export const defaultReaderPreferences: ReaderPreferences = {
  readingGoal: undefined,
  mode: "focus-word",
  theme: "midnight",
  wordsPerMinute: 280,
  chunkSize: 2,
  focusWindow: 2,
  fontScale: 1,
  lineHeight: 1.6,
  naturalPauses: true,
  smartPacing: true,
  reduceMotion: false,
};

export const readerPresets: ReaderPreset[] = [
  {
    id: "beginner",
    label: "Beginner",
    summary: "Calm pacing with extra breathing room for comprehension.",
    mode: "classic-reader",
    wordsPerMinute: 220,
    chunkSize: 1,
    focusWindow: 3,
    naturalPauses: true,
    smartPacing: true,
    reduceMotion: true,
  },
  {
    id: "comfortable",
    label: "Comfortable",
    summary: "A balanced default for everyday reading practice.",
    mode: "phrase-chunk",
    wordsPerMinute: 280,
    chunkSize: 2,
    focusWindow: 2,
    naturalPauses: true,
    smartPacing: true,
    reduceMotion: false,
  },
  {
    id: "push-me",
    label: "Push Me",
    summary: "Faster pacing with small phrase groups and light assist.",
    mode: "phrase-chunk",
    wordsPerMinute: 360,
    chunkSize: 3,
    focusWindow: 2,
    naturalPauses: true,
    smartPacing: true,
    reduceMotion: false,
  },
  {
    id: "challenge",
    label: "Challenge",
    summary: "A sharper training preset for strong focus sessions.",
    mode: "focus-word",
    wordsPerMinute: 420,
    chunkSize: 1,
    focusWindow: 1,
    naturalPauses: false,
    smartPacing: true,
    reduceMotion: false,
  },
];

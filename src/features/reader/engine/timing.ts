import type { Chunk } from "@/types/document";
import type { ReaderPreferences } from "@/types/reader";

function hasTerminalPause(text: string) {
  return /[.!?]["')\]]?$/.test(text.trim());
}

function hasSoftPause(text: string) {
  return /[,;:]["')\]]?$/.test(text.trim());
}

export function deriveChunkDurationMs(
  chunk: Chunk,
  preferences: ReaderPreferences,
) {
  const tokenCount = Math.max(1, chunk.tokenIndexes.length);
  const baseDuration =
    (tokenCount / Math.max(80, preferences.wordsPerMinute)) * 60000;

  let duration = baseDuration;

  if (preferences.smartPacing) {
    duration += Math.max(0, tokenCount - 1) * 35;
  }

  if (preferences.naturalPauses) {
    if (hasTerminalPause(chunk.text)) {
      duration *= 1.35;
    } else if (hasSoftPause(chunk.text)) {
      duration *= 1.18;
    }
  }

  if (preferences.reduceMotion) {
    duration *= 1.08;
  }

  return Math.max(180, Math.round(duration));
}

export function derivePlaybackDriftMs(
  expectedDurationMs: number,
  actualDurationMs: number,
) {
  return Math.max(0, Math.round(actualDurationMs - expectedDurationMs));
}

export function deriveRemainingPlaybackMs(
  chunks: Chunk[],
  currentChunkIndex: number,
  preferences: ReaderPreferences,
) {
  if (chunks.length === 0) {
    return 0;
  }

  const boundedIndex = Math.max(
    0,
    Math.min(currentChunkIndex, chunks.length - 1),
  );

  return chunks.slice(boundedIndex).reduce((totalDuration, chunk) => {
    return totalDuration + deriveChunkDurationMs(chunk, preferences);
  }, 0);
}

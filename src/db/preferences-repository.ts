import { db } from "@/db/app-db";
import {
  defaultPdfViewerState,
  defaultReaderPreferences,
  normalizeReaderMode,
  type PdfViewerState,
  type ReaderPreferences,
} from "@/types/reader";

function getPdfViewerStateKey(documentId: string) {
  return `pdf-viewer:${documentId}`;
}

export async function saveReaderPreferences(preferences: ReaderPreferences) {
  const normalizedPreferences = {
    ...preferences,
    mode: normalizeReaderMode(preferences.mode),
  } satisfies ReaderPreferences;

  await db.preferences.put({
    key: "reader-preferences",
    value: normalizedPreferences,
  });

  return normalizedPreferences;
}

export async function getStoredReaderPreferences() {
  const record = await db.preferences.get("reader-preferences");
  const storedPreferences = record?.value as Partial<ReaderPreferences> | undefined;

  if (!storedPreferences) {
    return defaultReaderPreferences;
  }

  return {
    ...defaultReaderPreferences,
    ...storedPreferences,
    mode: normalizeReaderMode(storedPreferences.mode),
  } satisfies ReaderPreferences;
}

export async function savePdfViewerState(
  documentId: string,
  state: PdfViewerState,
) {
  await db.preferences.put({
    key: getPdfViewerStateKey(documentId),
    value: state,
  });

  return state;
}

export async function getStoredPdfViewerState(documentId: string) {
  const record = await db.preferences.get(getPdfViewerStateKey(documentId));
  return (record?.value as PdfViewerState | undefined) ?? defaultPdfViewerState;
}
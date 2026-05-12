import { db } from "@/db/app-db";
import {
  defaultPdfViewerState,
  defaultReaderPreferences,
  type PdfViewerState,
  type ReaderPreferences,
} from "@/types/reader";

function getPdfViewerStateKey(documentId: string) {
  return `pdf-viewer:${documentId}`;
}

export async function saveReaderPreferences(preferences: ReaderPreferences) {
  await db.preferences.put({
    key: "reader-preferences",
    value: preferences,
  });

  return preferences;
}

export async function getStoredReaderPreferences() {
  const record = await db.preferences.get("reader-preferences");
  return (
    (record?.value as ReaderPreferences | undefined) ?? defaultReaderPreferences
  );
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
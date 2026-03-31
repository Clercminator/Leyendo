import { nanoid } from "nanoid";
import { db } from "@/db/app-db";
import type {
  DocumentAssetRecord,
  DocumentModel,
  DocumentRecord,
} from "@/types/document";
import {
  defaultPdfViewerState,
  type Bookmark,
  defaultReaderPreferences,
  type Highlight,
  type PdfViewerState,
  type ReaderPreferences,
  type ReadingSession,
} from "@/types/reader";

function getPdfViewerStateKey(documentId: string) {
  return `pdf-viewer:${documentId}`;
}

export async function saveDocument(record: DocumentRecord) {
  await db.documents.put(record);
  return record;
}

export async function getDocumentById(documentId: string) {
  return db.documents.get(documentId);
}

export async function saveDocumentAsset(
  asset: Omit<DocumentAssetRecord, "createdAt" | "updatedAt">,
) {
  const existingAsset = await db.documentAssets.get(asset.documentId);
  const timestamp = new Date().toISOString();
  const record: DocumentAssetRecord = {
    ...asset,
    createdAt: existingAsset?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await db.documentAssets.put(record);
  return record;
}

export async function getDocumentAsset(documentId: string) {
  return db.documentAssets.get(documentId);
}

export async function getRecentDocuments(limit = 8) {
  return db.documents.orderBy("updatedAt").reverse().limit(limit).toArray();
}

export async function saveSession(session: ReadingSession) {
  await db.sessions.put(session);
  return session;
}

export async function getSessionForDocument(documentId: string) {
  return db.sessions.where("documentId").equals(documentId).last();
}

export async function clearSessionForDocument(documentId: string) {
  await db.sessions.where("documentId").equals(documentId).delete();
}

async function getRelatedDocuments(documentIds: string[]) {
  if (documentIds.length === 0) {
    return [];
  }

  return db.documents.bulkGet(documentIds);
}

export interface RecentSessionRecord {
  session: ReadingSession;
  document: DocumentRecord;
}

export async function getRecentSessions(
  limit = 8,
): Promise<RecentSessionRecord[]> {
  const sessions = await db.sessions
    .orderBy("updatedAt")
    .reverse()
    .limit(limit)
    .toArray();
  const documents = await getRelatedDocuments(
    sessions.map((session) => session.documentId),
  );

  return sessions
    .map((session, index) => {
      const document = documents[index];
      return document ? { session, document } : null;
    })
    .filter((entry): entry is RecentSessionRecord => entry !== null);
}

export async function saveBookmark(
  bookmark: Omit<Bookmark, "id" | "createdAt">,
) {
  const record: Bookmark = {
    ...bookmark,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };

  await db.bookmarks.put(record);
  return record;
}

export async function getBookmarksForDocument(documentId: string) {
  return db.bookmarks
    .where("documentId")
    .equals(documentId)
    .reverse()
    .sortBy("createdAt");
}

export async function getBookmarkById(bookmarkId: string) {
  return db.bookmarks.get(bookmarkId);
}

export interface RecentBookmarkRecord {
  bookmark: Bookmark;
  document: DocumentRecord;
}

export async function getRecentBookmarks(
  limit = 8,
): Promise<RecentBookmarkRecord[]> {
  const bookmarks = await db.bookmarks
    .orderBy("createdAt")
    .reverse()
    .limit(limit)
    .toArray();
  const documents = await getRelatedDocuments(
    bookmarks.map((bookmark) => bookmark.documentId),
  );

  return bookmarks
    .map((bookmark, index) => {
      const document = documents[index];
      return document ? { bookmark, document } : null;
    })
    .filter((entry): entry is RecentBookmarkRecord => entry !== null);
}

export async function deleteBookmark(bookmarkId: string) {
  await db.bookmarks.delete(bookmarkId);
}

export async function saveHighlight(
  highlight: Omit<Highlight, "id" | "createdAt">,
) {
  const record: Highlight = {
    ...highlight,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };

  await db.highlights.put(record);
  return record;
}

export async function getHighlightsForDocument(documentId: string) {
  return db.highlights
    .where("documentId")
    .equals(documentId)
    .reverse()
    .sortBy("createdAt");
}

export async function getHighlightById(highlightId: string) {
  return db.highlights.get(highlightId);
}

export interface RecentHighlightRecord {
  highlight: Highlight;
  document: DocumentRecord;
}

export async function getRecentHighlights(
  limit = 8,
): Promise<RecentHighlightRecord[]> {
  const highlights = await db.highlights
    .orderBy("createdAt")
    .reverse()
    .limit(limit)
    .toArray();
  const documents = await getRelatedDocuments(
    highlights.map((highlight) => highlight.documentId),
  );

  return highlights
    .map((highlight, index) => {
      const document = documents[index];
      return document ? { highlight, document } : null;
    })
    .filter((entry): entry is RecentHighlightRecord => entry !== null);
}

export async function deleteHighlight(highlightId: string) {
  await db.highlights.delete(highlightId);
}

export async function deleteDocumentAndRelatedData(documentId: string) {
  await db.documentAssets.delete(documentId);

  await db.transaction(
    "rw",
    db.documents,
    db.sessions,
    db.bookmarks,
    db.highlights,
    async () => {
      await db.sessions.where("documentId").equals(documentId).delete();
      await db.bookmarks.where("documentId").equals(documentId).delete();
      await db.highlights.where("documentId").equals(documentId).delete();
      await db.documents.delete(documentId);
    },
  );
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

export function buildInitialSession(document: DocumentModel): ReadingSession {
  return {
    id: `${document.id}:session`,
    documentId: document.id,
    currentChunkIndex: 0,
    currentTokenIndex: 0,
    currentParagraphIndex: 0,
    currentSectionIndex: 0,
    percentComplete: 0,
    updatedAt: new Date().toISOString(),
  };
}

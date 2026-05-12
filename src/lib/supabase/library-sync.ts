import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/db/app-db";
import {
  deletePendingCloudDeletes,
  getPendingCloudDeletesForOwner,
} from "@/db/repositories";
import {
  buildDocumentPayloadPath,
  deleteCloudBookmarks,
  deleteCloudHighlights,
  upsertCloudBookmarks,
  upsertCloudDocuments,
  upsertCloudHighlights,
  upsertCloudSessions,
} from "@/lib/supabase/library-cloud-mutations";
import type {
  DocumentModel,
  DocumentRecord,
  DocumentSourceKind,
} from "@/types/document";
import {
  type Bookmark,
  type Highlight,
  type ReadingSession,
} from "@/types/reader";
import type { PendingCloudDeleteRecord } from "@/types/sync";

export * from "@/lib/supabase/feedback";
export * from "@/lib/supabase/library-cloud-mutations";
export * from "@/lib/supabase/profile";

const DOCUMENTS_TABLE = "user_documents";
const SESSIONS_TABLE = "user_sessions";
const BOOKMARKS_TABLE = "user_bookmarks";
const HIGHLIGHTS_TABLE = "user_highlights";
const DOCUMENT_PAYLOAD_BUCKET = "document-payloads";
const DOCUMENT_METADATA_SELECT =
  "created_at,document_id,excerpt,source_kind,title,total_chunks,total_sections,updated_at,user_id";
const DOCUMENT_ID_SELECT = "document_id";
const SYNC_CURSOR_PREFERENCE_KEY_PREFIX = "cloud-sync-cursors:";

interface CloudSyncCursors {
  bookmarksCreatedAt?: string;
  documentsUpdatedAt?: string;
  highlightsCreatedAt?: string;
  sessionsUpdatedAt?: string;
}

interface RemoteDocumentRow {
  created_at: string;
  document_id: string;
  excerpt: string;
  payload?: DocumentModel | null;
  source_kind: DocumentSourceKind;
  title: string;
  total_chunks: number;
  total_sections: number;
  updated_at: string;
  user_id: string;
}

interface RemoteSessionRow {
  current_chunk_index: number;
  current_paragraph_index: number;
  current_section_index: number;
  current_token_index: number;
  document_id: string;
  percent_complete: number;
  updated_at: string;
  user_id: string;
}

interface RemoteBookmarkRow {
  chunk_index: number;
  created_at: string;
  document_id: string;
  id: string;
  label: string;
  note: string | null;
  paragraph_index: number;
  section_index: number;
  source_page_index: number | null;
  token_index: number;
  user_id: string;
}

interface RemoteHighlightRow {
  chunk_index: number;
  created_at: string;
  document_id: string;
  id: string;
  label: string;
  note: string | null;
  paragraph_index: number;
  quote: string;
  section_index: number;
  token_index: number;
  user_id: string;
}

export interface LocalLibrarySummary {
  bookmarks: number;
  documents: number;
  highlights: number;
  sessions: number;
}

function isPendingCloudRecord<RecordType extends { ownerId?: string; syncState?: string }>(
  record: RecordType,
  userId?: string,
) {
  if (record.syncState === "local-only") {
    return !record.ownerId || !userId || record.ownerId === userId;
  }

  return !record.ownerId;
}

function getCloudSyncCursorPreferenceKey(userId: string) {
  return `${SYNC_CURSOR_PREFERENCE_KEY_PREFIX}${userId}`;
}

async function getCloudSyncCursors(userId: string) {
  const record = await db.preferences.get(
    getCloudSyncCursorPreferenceKey(userId),
  );
  return (record?.value as CloudSyncCursors | undefined) ?? {};
}

async function saveCloudSyncCursors(userId: string, cursors: CloudSyncCursors) {
  await db.preferences.put({
    key: getCloudSyncCursorPreferenceKey(userId),
    value: cursors,
  });
}

async function clearCloudSyncCursors(userId: string) {
  await db.preferences.delete(getCloudSyncCursorPreferenceKey(userId));
}

export async function isRemoteLibraryEmpty(
  supabase: SupabaseClient,
  userId: string,
) {
  const { count, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select("document_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (count ?? 0) === 0;
}

export async function getLocalOnlyLibrarySummary(
  userId?: string,
): Promise<LocalLibrarySummary> {
  const [documents, sessions, bookmarks, highlights, pendingDeletes] =
    await Promise.all([
    db.documents.toArray(),
    db.sessions.toArray(),
    db.bookmarks.toArray(),
    db.highlights.toArray(),
      userId
        ? getPendingCloudDeletesForOwner(userId)
        : Promise.resolve<PendingCloudDeleteRecord[]>([]),
    ]);

  const pendingBookmarkDeletes = pendingDeletes.filter(
    (record) => record.recordType === "bookmark",
  ).length;
  const pendingHighlightDeletes = pendingDeletes.filter(
    (record) => record.recordType === "highlight",
  ).length;

  return {
    bookmarks:
      bookmarks.filter((bookmark) => !bookmark.ownerId).length +
      pendingBookmarkDeletes,
    documents: documents.filter((document) => !document.ownerId).length,
    highlights:
      highlights.filter((highlight) => !highlight.ownerId).length +
      pendingHighlightDeletes,
    sessions: sessions.filter((session) => !session.ownerId).length,
  };
}

async function getOwnedRows<RecordType extends { ownerId?: string }>(
  table: {
    where?: (key: string) => {
      equals: (value: string) => {
        toArray?: () => Promise<RecordType[]>;
      };
    };
  },
  userId: string,
) {
  const matches = table.where?.("ownerId")?.equals(userId);

  if (typeof matches?.toArray === "function") {
    return matches.toArray();
  }

  return [];
}

export async function getSyncedLibrarySummary(
  userId: string,
): Promise<LocalLibrarySummary> {
  const [documents, sessions, bookmarks, highlights] = await Promise.all([
    getOwnedRows<DocumentRecord>(db.documents, userId),
    getOwnedRows<ReadingSession>(db.sessions, userId),
    getOwnedRows<Bookmark>(db.bookmarks, userId),
    getOwnedRows<Highlight>(db.highlights, userId),
  ]);

  return {
    bookmarks: bookmarks.length,
    documents: documents.length,
    highlights: highlights.length,
    sessions: sessions.length,
  };
}

export async function clearSyncedLibraryForUser(userId: string) {
  await db.transaction(
    "rw",
    db.documents,
    db.sessions,
    db.bookmarks,
    db.highlights,
    async () => {
      await db.sessions.where("ownerId").equals(userId).delete();
      await db.bookmarks.where("ownerId").equals(userId).delete();
      await db.highlights.where("ownerId").equals(userId).delete();
      await db.documents.where("ownerId").equals(userId).delete();
    },
  );

  await clearCloudSyncCursors(userId);
}

async function clearSyncedDocumentBundleForUser(
  userId: string,
  documentId: string,
) {
  const [document, sessions, bookmarks, highlights] = await Promise.all([
    db.documents.get(documentId),
    db.sessions.where("documentId").equals(documentId).toArray(),
    db.bookmarks.where("documentId").equals(documentId).toArray(),
    db.highlights.where("documentId").equals(documentId).toArray(),
  ]);

  if (document?.ownerId === userId) {
    await db.documents.delete(documentId);
  }

  const sessionIds = sessions
    .filter((session) => session.ownerId === userId)
    .map((session) => session.id);
  const bookmarkIds = bookmarks
    .filter((bookmark) => bookmark.ownerId === userId)
    .map((bookmark) => bookmark.id);
  const highlightIds = highlights
    .filter((highlight) => highlight.ownerId === userId)
    .map((highlight) => highlight.id);

  if (sessionIds.length > 0) {
    await db.sessions.bulkDelete(sessionIds);
  }
  if (bookmarkIds.length > 0) {
    await db.bookmarks.bulkDelete(bookmarkIds);
  }
  if (highlightIds.length > 0) {
    await db.highlights.bulkDelete(highlightIds);
  }
}

export async function flushPendingCloudDeletes(
  supabase: SupabaseClient,
  userId: string,
) {
  const pendingDeletes = await getPendingCloudDeletesForOwner(userId);

  if (pendingDeletes.length === 0) {
    return {
      deletedBookmarks: 0,
      deletedHighlights: 0,
    };
  }

  const bookmarkIds = pendingDeletes
    .filter((record) => record.recordType === "bookmark")
    .map((record) => record.recordId);
  const highlightIds = pendingDeletes
    .filter((record) => record.recordType === "highlight")
    .map((record) => record.recordId);

  if (bookmarkIds.length > 0) {
    await deleteCloudBookmarks(supabase, userId, bookmarkIds);
  }
  if (highlightIds.length > 0) {
    await deleteCloudHighlights(supabase, userId, highlightIds);
  }

  await deletePendingCloudDeletes(pendingDeletes.map((record) => record.id));

  return {
    deletedBookmarks: bookmarkIds.length,
    deletedHighlights: highlightIds.length,
  };
}

function maxIsoTimestamp(left: string | undefined, right: string | undefined) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
}

function buildCloudSyncCursors(args: {
  bookmarks: RemoteBookmarkRow[];
  documents: RemoteDocumentRow[];
  existing?: CloudSyncCursors;
  highlights: RemoteHighlightRow[];
  sessions: RemoteSessionRow[];
}) {
  const { bookmarks, documents, existing, highlights, sessions } = args;

  return {
    bookmarksCreatedAt: bookmarks.reduce<string | undefined>(
      (latest, bookmark) => maxIsoTimestamp(latest, bookmark.created_at),
      existing?.bookmarksCreatedAt,
    ),
    documentsUpdatedAt: documents.reduce<string | undefined>(
      (latest, document) => maxIsoTimestamp(latest, document.updated_at),
      existing?.documentsUpdatedAt,
    ),
    highlightsCreatedAt: highlights.reduce<string | undefined>(
      (latest, highlight) => maxIsoTimestamp(latest, highlight.created_at),
      existing?.highlightsCreatedAt,
    ),
    sessionsUpdatedAt: sessions.reduce<string | undefined>(
      (latest, session) => maxIsoTimestamp(latest, session.updated_at),
      existing?.sessionsUpdatedAt,
    ),
  } satisfies CloudSyncCursors;
}

function applyIsoCursor<
  QueryType extends { gte: (column: string, value: string) => QueryType },
>(query: QueryType, column: string, value: string | undefined) {
  if (!value) {
    return query;
  }

  return query.gte(column, value);
}

function mapRemoteDocumentsWithExistingPayload(args: {
  existingDocumentById: Map<string, DocumentRecord>;
  rows: RemoteDocumentRow[];
}) {
  const { existingDocumentById, rows } = args;

  return rows.map((row) => {
    const record = toSyncedDocumentRecord(row);
    const existingDocument = existingDocumentById.get(record.id);

    return existingDocument?.payload && !record.payload
      ? {
          ...record,
          payload: existingDocument.payload,
        }
      : record;
  });
}

async function reconcileDeletedSyncedRows(args: {
  localBookmarks: Bookmark[];
  localDocuments: DocumentRecord[];
  localHighlights: Highlight[];
  localSessions: ReadingSession[];
  remoteBookmarkIds: string[];
  remoteDocumentIds: string[];
  remoteHighlightIds: string[];
  remoteSessionDocumentIds: string[];
  userId: string;
}) {
  const {
    localBookmarks,
    localDocuments,
    localHighlights,
    localSessions,
    remoteBookmarkIds,
    remoteDocumentIds,
    remoteHighlightIds,
    remoteSessionDocumentIds,
    userId,
  } = args;

  const remoteDocumentIdSet = new Set(remoteDocumentIds);
  const remoteSessionDocumentIdSet = new Set(remoteSessionDocumentIds);
  const remoteBookmarkIdSet = new Set(remoteBookmarkIds);
  const remoteHighlightIdSet = new Set(remoteHighlightIds);
  const missingDocumentIds = localDocuments
    .filter((document) => !remoteDocumentIdSet.has(document.id))
    .map((document) => document.id);
  const missingSessionIds = localSessions
    .filter((session) => !remoteSessionDocumentIdSet.has(session.documentId))
    .map((session) => session.id);
  const missingBookmarkIds = localBookmarks
    .filter((bookmark) => !remoteBookmarkIdSet.has(bookmark.id))
    .map((bookmark) => bookmark.id);
  const missingHighlightIds = localHighlights
    .filter((highlight) => !remoteHighlightIdSet.has(highlight.id))
    .map((highlight) => highlight.id);

  if (
    missingDocumentIds.length === 0 &&
    missingSessionIds.length === 0 &&
    missingBookmarkIds.length === 0 &&
    missingHighlightIds.length === 0
  ) {
    return;
  }

  await db.transaction(
    "rw",
    db.documents,
    db.sessions,
    db.bookmarks,
    db.highlights,
    async () => {
      for (const documentId of missingDocumentIds) {
        await clearSyncedDocumentBundleForUser(userId, documentId);
      }

      if (missingSessionIds.length > 0) {
        await db.sessions.bulkDelete(missingSessionIds);
      }
      if (missingBookmarkIds.length > 0) {
        await db.bookmarks.bulkDelete(missingBookmarkIds);
      }
      if (missingHighlightIds.length > 0) {
        await db.highlights.bulkDelete(missingHighlightIds);
      }
    },
  );
}

async function uploadDocumentPayload(
  supabase: SupabaseClient,
  userId: string,
  record: DocumentRecord,
) {
  if (!record.payload) {
    throw new Error("Cannot sync a document without its payload.");
  }

  const { error } = await supabase.storage.from(DOCUMENT_PAYLOAD_BUCKET).upload(
    buildDocumentPayloadPath(userId, record.id),
    new Blob([JSON.stringify(record.payload)], {
      type: "application/json",
    }),
    {
      cacheControl: "3600",
      contentType: "application/json",
      upsert: true,
    },
  );

  if (error) {
    throw error;
  }
}

async function downloadDocumentPayload(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
) {
  const { data, error } = await supabase.storage
    .from(DOCUMENT_PAYLOAD_BUCKET)
    .download(buildDocumentPayloadPath(userId, documentId));

  if (error || !data) {
    return undefined;
  }

  return JSON.parse(await data.text()) as DocumentModel;
}

async function resolveRemoteDocumentPayload(
  supabase: SupabaseClient,
  row: RemoteDocumentRow,
) {
  if (row.payload) {
    return row.payload;
  }

  return downloadDocumentPayload(supabase, row.user_id, row.document_id);
}

function toSyncedDocumentRecord(row: RemoteDocumentRow): DocumentRecord {
  return {
    createdAt: row.created_at,
    excerpt: row.excerpt,
    id: row.document_id,
    ownerId: row.user_id,
    payload: row.payload ?? undefined,
    sourceKind: row.source_kind,
    syncState: "synced",
    title: row.title,
    totalChunks: row.total_chunks,
    totalSections: row.total_sections,
    updatedAt: row.updated_at,
  };
}

function toSyncedSessionRecord(row: RemoteSessionRow): ReadingSession {
  return {
    currentChunkIndex: row.current_chunk_index,
    currentParagraphIndex: row.current_paragraph_index,
    currentSectionIndex: row.current_section_index,
    currentTokenIndex: row.current_token_index,
    documentId: row.document_id,
    id: `${row.document_id}:session`,
    ownerId: row.user_id,
    percentComplete: row.percent_complete,
    syncState: "synced",
    updatedAt: row.updated_at,
  };
}

function toSyncedBookmarkRecord(row: RemoteBookmarkRow): Bookmark {
  return {
    chunkIndex: row.chunk_index,
    createdAt: row.created_at,
    documentId: row.document_id,
    id: row.id,
    label: row.label,
    note: row.note ?? undefined,
    ownerId: row.user_id,
    paragraphIndex: row.paragraph_index,
    sectionIndex: row.section_index,
    sourcePageIndex: row.source_page_index ?? undefined,
    syncState: "synced",
    tokenIndex: row.token_index,
  };
}

function toSyncedHighlightRecord(row: RemoteHighlightRow): Highlight {
  return {
    chunkIndex: row.chunk_index,
    createdAt: row.created_at,
    documentId: row.document_id,
    id: row.id,
    label: row.label,
    note: row.note ?? undefined,
    ownerId: row.user_id,
    paragraphIndex: row.paragraph_index,
    quote: row.quote,
    sectionIndex: row.section_index,
    syncState: "synced",
    tokenIndex: row.token_index,
  };
}

export async function backUpLocalLibraryToCloud(
  supabase: SupabaseClient,
  userId: string,
) {
  const [documents, sessions, bookmarks, highlights] = await Promise.all([
    db.documents.toArray(),
    db.sessions.toArray(),
    db.bookmarks.toArray(),
    db.highlights.toArray(),
  ]);

  const localDocuments = documents.filter((document) =>
    isPendingCloudRecord(document, userId),
  );

  const localDocumentIds = new Set(
    localDocuments.map((document) => document.id),
  );
  const localSessions = sessions.filter(
    (session) =>
      localDocumentIds.has(session.documentId) ||
      isPendingCloudRecord(session, userId),
  );
  const localBookmarks = bookmarks.filter(
    (bookmark) =>
      localDocumentIds.has(bookmark.documentId) ||
      isPendingCloudRecord(bookmark, userId),
  );
  const localHighlights = highlights.filter(
    (highlight) =>
      localDocumentIds.has(highlight.documentId) ||
      isPendingCloudRecord(highlight, userId),
  );

  if (
    localDocuments.length === 0 &&
    localSessions.length === 0 &&
    localBookmarks.length === 0 &&
    localHighlights.length === 0
  ) {
    await flushPendingCloudDeletes(supabase, userId);
    return { backedUpDocuments: 0 };
  }

  await upsertCloudDocuments(
    supabase,
    userId,
    localDocuments.map((document) => ({
      ...document,
      ownerId: userId,
      syncState: "synced",
    })),
  );
  await upsertCloudSessions(
    supabase,
    userId,
    localSessions.map((session) => ({
      ...session,
      ownerId: userId,
      syncState: "synced",
    })),
  );
  await upsertCloudBookmarks(
    supabase,
    userId,
    localBookmarks.map((bookmark) => ({
      ...bookmark,
      ownerId: userId,
      syncState: "synced",
    })),
  );
  await upsertCloudHighlights(
    supabase,
    userId,
    localHighlights.map((highlight) => ({
      ...highlight,
      ownerId: userId,
      syncState: "synced",
    })),
  );

  await db.transaction(
    "rw",
    db.documents,
    db.sessions,
    db.bookmarks,
    db.highlights,
    async () => {
      await db.documents.bulkPut(
        localDocuments.map((document) => ({
          ...document,
          ownerId: userId,
          syncState: "synced" as const,
        })),
      );
      await db.sessions.bulkPut(
        localSessions.map((session) => ({
          ...session,
          ownerId: userId,
          syncState: "synced" as const,
        })),
      );
      await db.bookmarks.bulkPut(
        localBookmarks.map((bookmark) => ({
          ...bookmark,
          ownerId: userId,
          syncState: "synced" as const,
        })),
      );
      await db.highlights.bulkPut(
        localHighlights.map((highlight) => ({
          ...highlight,
          ownerId: userId,
          syncState: "synced" as const,
        })),
      );
    },
  );

  await flushPendingCloudDeletes(supabase, userId);

  return { backedUpDocuments: localDocuments.length };
}

export async function hydrateCloudLibraryToLocal(
  supabase: SupabaseClient,
  userId: string,
) {
  const existingSyncedDocuments = await getOwnedRows<DocumentRecord>(
    db.documents,
    userId,
  );
  const existingDocumentById = new Map(
    existingSyncedDocuments.map((document) => [document.id, document]),
  );
  const [documentsResult, sessionsResult, bookmarksResult, highlightsResult] =
    await Promise.all([
      supabase
        .from(DOCUMENTS_TABLE)
        .select(DOCUMENT_METADATA_SELECT)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from(SESSIONS_TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from(BOOKMARKS_TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from(HIGHLIGHTS_TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  if (documentsResult.error) {
    throw documentsResult.error;
  }
  if (sessionsResult.error) {
    throw sessionsResult.error;
  }
  if (bookmarksResult.error) {
    throw bookmarksResult.error;
  }
  if (highlightsResult.error) {
    throw highlightsResult.error;
  }

  const remoteDocuments = (documentsResult.data ?? []) as RemoteDocumentRow[];
  const remoteSessions = (sessionsResult.data ?? []) as RemoteSessionRow[];
  const remoteBookmarks = (bookmarksResult.data ?? []) as RemoteBookmarkRow[];
  const remoteHighlights = (highlightsResult.data ??
    []) as RemoteHighlightRow[];
  const syncedDocuments = mapRemoteDocumentsWithExistingPayload({
    existingDocumentById,
    rows: remoteDocuments,
  });
  const syncedSessions = remoteSessions.map(toSyncedSessionRecord);
  const syncedBookmarks = remoteBookmarks.map(toSyncedBookmarkRecord);
  const syncedHighlights = remoteHighlights.map(toSyncedHighlightRecord);

  await db.transaction(
    "rw",
    db.documents,
    db.sessions,
    db.bookmarks,
    db.highlights,
    async () => {
      await db.sessions.where("ownerId").equals(userId).delete();
      await db.bookmarks.where("ownerId").equals(userId).delete();
      await db.highlights.where("ownerId").equals(userId).delete();
      await db.documents.where("ownerId").equals(userId).delete();

      if (syncedDocuments.length > 0) {
        await db.documents.bulkPut(syncedDocuments);
      }
      if (syncedSessions.length > 0) {
        await db.sessions.bulkPut(syncedSessions);
      }
      if (syncedBookmarks.length > 0) {
        await db.bookmarks.bulkPut(syncedBookmarks);
      }
      if (syncedHighlights.length > 0) {
        await db.highlights.bulkPut(syncedHighlights);
      }
    },
  );

  await saveCloudSyncCursors(
    userId,
    buildCloudSyncCursors({
      bookmarks: remoteBookmarks,
      documents: remoteDocuments,
      highlights: remoteHighlights,
      sessions: remoteSessions,
    }),
  );

  return {
    bookmarks: syncedBookmarks.length,
    documents: syncedDocuments.length,
    highlights: syncedHighlights.length,
    sessions: syncedSessions.length,
  };
}

export async function syncCloudLibraryToLocalIncremental(
  supabase: SupabaseClient,
  userId: string,
) {
  const [
    existingCursors,
    existingSyncedDocuments,
    localDocuments,
    localSessions,
    localBookmarks,
    localHighlights,
  ] = await Promise.all([
    getCloudSyncCursors(userId),
    getOwnedRows<DocumentRecord>(db.documents, userId),
    getOwnedRows<DocumentRecord>(db.documents, userId),
    getOwnedRows<ReadingSession>(db.sessions, userId),
    getOwnedRows<Bookmark>(db.bookmarks, userId),
    getOwnedRows<Highlight>(db.highlights, userId),
  ]);
  const existingDocumentById = new Map(
    existingSyncedDocuments.map((document) => [document.id, document]),
  );
  const [
    documentsResult,
    sessionsResult,
    bookmarksResult,
    highlightsResult,
    documentIdsResult,
    sessionIdsResult,
    bookmarkIdsResult,
    highlightIdsResult,
  ] = await Promise.all([
    applyIsoCursor(
      supabase
        .from(DOCUMENTS_TABLE)
        .select(DOCUMENT_METADATA_SELECT)
        .eq("user_id", userId),
      "updated_at",
      existingCursors.documentsUpdatedAt,
    ).order("updated_at", { ascending: true }),
    applyIsoCursor(
      supabase.from(SESSIONS_TABLE).select("*").eq("user_id", userId),
      "updated_at",
      existingCursors.sessionsUpdatedAt,
    ).order("updated_at", { ascending: true }),
    applyIsoCursor(
      supabase.from(BOOKMARKS_TABLE).select("*").eq("user_id", userId),
      "created_at",
      existingCursors.bookmarksCreatedAt,
    ).order("created_at", { ascending: true }),
    applyIsoCursor(
      supabase.from(HIGHLIGHTS_TABLE).select("*").eq("user_id", userId),
      "created_at",
      existingCursors.highlightsCreatedAt,
    ).order("created_at", { ascending: true }),
    supabase
      .from(DOCUMENTS_TABLE)
      .select(DOCUMENT_ID_SELECT)
      .eq("user_id", userId),
    supabase
      .from(SESSIONS_TABLE)
      .select(DOCUMENT_ID_SELECT)
      .eq("user_id", userId),
    supabase.from(BOOKMARKS_TABLE).select("id").eq("user_id", userId),
    supabase.from(HIGHLIGHTS_TABLE).select("id").eq("user_id", userId),
  ]);

  if (documentsResult.error) {
    throw documentsResult.error;
  }
  if (sessionsResult.error) {
    throw sessionsResult.error;
  }
  if (bookmarksResult.error) {
    throw bookmarksResult.error;
  }
  if (highlightsResult.error) {
    throw highlightsResult.error;
  }
  if (documentIdsResult.error) {
    throw documentIdsResult.error;
  }
  if (sessionIdsResult.error) {
    throw sessionIdsResult.error;
  }
  if (bookmarkIdsResult.error) {
    throw bookmarkIdsResult.error;
  }
  if (highlightIdsResult.error) {
    throw highlightIdsResult.error;
  }

  const remoteDocuments = (documentsResult.data ?? []) as RemoteDocumentRow[];
  const remoteSessions = (sessionsResult.data ?? []) as RemoteSessionRow[];
  const remoteBookmarks = (bookmarksResult.data ?? []) as RemoteBookmarkRow[];
  const remoteHighlights = (highlightsResult.data ??
    []) as RemoteHighlightRow[];
  const syncedDocuments = mapRemoteDocumentsWithExistingPayload({
    existingDocumentById,
    rows: remoteDocuments,
  });
  const syncedSessions = remoteSessions.map(toSyncedSessionRecord);
  const syncedBookmarks = remoteBookmarks.map(toSyncedBookmarkRecord);
  const syncedHighlights = remoteHighlights.map(toSyncedHighlightRecord);

  await reconcileDeletedSyncedRows({
    localBookmarks,
    localDocuments,
    localHighlights,
    localSessions,
    remoteBookmarkIds: (bookmarkIdsResult.data ?? []).map(({ id }) => id),
    remoteDocumentIds: (documentIdsResult.data ?? []).map(
      ({ document_id }) => document_id,
    ),
    remoteHighlightIds: (highlightIdsResult.data ?? []).map(({ id }) => id),
    remoteSessionDocumentIds: (sessionIdsResult.data ?? []).map(
      ({ document_id }) => document_id,
    ),
    userId,
  });

  await db.transaction(
    "rw",
    db.documents,
    db.sessions,
    db.bookmarks,
    db.highlights,
    async () => {
      if (syncedDocuments.length > 0) {
        await db.documents.bulkPut(syncedDocuments);
      }
      if (syncedSessions.length > 0) {
        await db.sessions.bulkPut(syncedSessions);
      }
      if (syncedBookmarks.length > 0) {
        await db.bookmarks.bulkPut(syncedBookmarks);
      }
      if (syncedHighlights.length > 0) {
        await db.highlights.bulkPut(syncedHighlights);
      }
    },
  );

  await saveCloudSyncCursors(
    userId,
    buildCloudSyncCursors({
      bookmarks: remoteBookmarks,
      documents: remoteDocuments,
      existing: existingCursors,
      highlights: remoteHighlights,
      sessions: remoteSessions,
    }),
  );

  return getSyncedLibrarySummary(userId);
}

export async function hydrateRemoteDocumentToLocal(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
) {
  const [documentResult, sessionResult, bookmarksResult, highlightsResult] =
    await Promise.all([
      supabase
        .from(DOCUMENTS_TABLE)
        .select("*")
        .eq("user_id", userId)
        .eq("document_id", documentId)
        .maybeSingle(),
      supabase
        .from(SESSIONS_TABLE)
        .select("*")
        .eq("user_id", userId)
        .eq("document_id", documentId)
        .maybeSingle(),
      supabase
        .from(BOOKMARKS_TABLE)
        .select("*")
        .eq("user_id", userId)
        .eq("document_id", documentId),
      supabase
        .from(HIGHLIGHTS_TABLE)
        .select("*")
        .eq("user_id", userId)
        .eq("document_id", documentId),
    ]);

  if (documentResult.error) {
    throw documentResult.error;
  }
  if (sessionResult.error) {
    throw sessionResult.error;
  }
  if (bookmarksResult.error) {
    throw bookmarksResult.error;
  }
  if (highlightsResult.error) {
    throw highlightsResult.error;
  }

  if (!documentResult.data) {
    return false;
  }

  const remoteDocument = documentResult.data as RemoteDocumentRow;
  const payload = await resolveRemoteDocumentPayload(supabase, remoteDocument);

  if (!payload) {
    return false;
  }

  const document = {
    ...toSyncedDocumentRecord(remoteDocument),
    payload,
  };
  const session = sessionResult.data
    ? toSyncedSessionRecord(sessionResult.data)
    : undefined;
  const bookmarks = (bookmarksResult.data ?? []).map(toSyncedBookmarkRecord);
  const highlights = (highlightsResult.data ?? []).map(toSyncedHighlightRecord);

  await db.transaction(
    "rw",
    db.documents,
    db.sessions,
    db.bookmarks,
    db.highlights,
    async () => {
      await clearSyncedDocumentBundleForUser(userId, documentId);

      await db.documents.put(document);
      if (session) {
        await db.sessions.put(session);
      }
      if (bookmarks.length > 0) {
        await db.bookmarks.bulkPut(bookmarks);
      }
      if (highlights.length > 0) {
        await db.highlights.bulkPut(highlights);
      }
    },
  );

  return true;
}

export async function hydrateRemoteDocumentPayloadToLocal(
  supabase: SupabaseClient,
  userId: string,
  document: DocumentRecord,
) {
  if (document.payload) {
    return true;
  }

  const payload = await downloadDocumentPayload(supabase, userId, document.id);

  if (!payload) {
    return hydrateRemoteDocumentToLocal(supabase, userId, document.id);
  }

  await db.documents.put({
    ...document,
    ownerId: userId,
    payload,
    syncState: "synced",
  });

  return true;
}


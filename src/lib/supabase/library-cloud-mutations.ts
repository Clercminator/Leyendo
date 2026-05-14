import type { SupabaseClient } from "@supabase/supabase-js";

import type { DocumentRecord } from "@/types/document";
import type { Bookmark, Highlight, ReadingSession } from "@/types/reader";

const DOCUMENTS_TABLE = "user_documents";
const SESSIONS_TABLE = "user_sessions";
const BOOKMARKS_TABLE = "user_bookmarks";
const HIGHLIGHTS_TABLE = "user_highlights";
const DOCUMENT_PAYLOAD_BUCKET = "document-payloads";

interface RemoteDocumentRow {
  created_at: string;
  document_id: string;
  excerpt: string;
  payload?: null;
  source_kind: DocumentRecord["sourceKind"];
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
  source_page_index: number | null;
  token_index: number;
  user_id: string;
}

function toRemoteDocumentRow(
  userId: string,
  record: DocumentRecord,
): RemoteDocumentRow {
  return {
    created_at: record.createdAt,
    document_id: record.id,
    excerpt: record.excerpt,
    payload: null,
    source_kind: record.sourceKind,
    title: record.title,
    total_chunks: record.totalChunks,
    total_sections: record.totalSections,
    updated_at: record.updatedAt,
    user_id: userId,
  };
}

function toRemoteSessionRow(
  userId: string,
  session: ReadingSession,
): RemoteSessionRow {
  return {
    current_chunk_index: session.currentChunkIndex,
    current_paragraph_index: session.currentParagraphIndex,
    current_section_index: session.currentSectionIndex,
    current_token_index: session.currentTokenIndex,
    document_id: session.documentId,
    percent_complete: session.percentComplete,
    updated_at: session.updatedAt,
    user_id: userId,
  };
}

function toRemoteBookmarkRow(
  userId: string,
  bookmark: Bookmark,
): RemoteBookmarkRow {
  return {
    chunk_index: bookmark.chunkIndex,
    created_at: bookmark.createdAt,
    document_id: bookmark.documentId,
    id: bookmark.id,
    label: bookmark.label,
    note: bookmark.note ?? null,
    paragraph_index: bookmark.paragraphIndex,
    section_index: bookmark.sectionIndex,
    source_page_index: bookmark.sourcePageIndex ?? null,
    token_index: bookmark.tokenIndex,
    user_id: userId,
  };
}

function toRemoteHighlightRow(
  userId: string,
  highlight: Highlight,
): RemoteHighlightRow {
  return {
    chunk_index: highlight.chunkIndex,
    created_at: highlight.createdAt,
    document_id: highlight.documentId,
    id: highlight.id,
    label: highlight.label,
    note: highlight.note ?? null,
    paragraph_index: highlight.paragraphIndex,
    quote: highlight.quote,
    section_index: highlight.sectionIndex,
    source_page_index: highlight.sourcePageIndex ?? null,
    token_index: highlight.tokenIndex,
    user_id: userId,
  };
}

export function buildDocumentPayloadPath(userId: string, documentId: string) {
  return `${userId}/${encodeURIComponent(documentId)}.json`;
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

export async function upsertCloudDocuments(
  supabase: SupabaseClient,
  userId: string,
  documents: DocumentRecord[],
) {
  if (documents.length === 0) {
    return;
  }

  await Promise.all(
    documents.map((document) => uploadDocumentPayload(supabase, userId, document)),
  );
  const rows = documents.map((document) =>
    toRemoteDocumentRow(userId, document),
  );
  const { error } = await supabase.from(DOCUMENTS_TABLE).upsert(rows, {
    onConflict: "user_id,document_id",
  });

  if (error) {
    throw error;
  }
}

export async function upsertCloudSessions(
  supabase: SupabaseClient,
  userId: string,
  sessions: ReadingSession[],
) {
  if (sessions.length === 0) {
    return;
  }

  const rows = sessions.map((session) => toRemoteSessionRow(userId, session));
  const { error } = await supabase.from(SESSIONS_TABLE).upsert(rows, {
    onConflict: "user_id,document_id",
  });

  if (error) {
    throw error;
  }
}

export async function upsertCloudBookmarks(
  supabase: SupabaseClient,
  userId: string,
  bookmarks: Bookmark[],
) {
  if (bookmarks.length === 0) {
    return;
  }

  const rows = bookmarks.map((bookmark) =>
    toRemoteBookmarkRow(userId, bookmark),
  );
  const { error } = await supabase.from(BOOKMARKS_TABLE).upsert(rows, {
    onConflict: "user_id,id",
  });

  if (error) {
    throw error;
  }
}

export async function upsertCloudHighlights(
  supabase: SupabaseClient,
  userId: string,
  highlights: Highlight[],
) {
  if (highlights.length === 0) {
    return;
  }

  const rows = highlights.map((highlight) =>
    toRemoteHighlightRow(userId, highlight),
  );
  const { error } = await supabase.from(HIGHLIGHTS_TABLE).upsert(rows, {
    onConflict: "user_id,id",
  });

  if (error) {
    throw error;
  }
}

export async function deleteCloudSession(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
) {
  const { error } = await supabase
    .from(SESSIONS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) {
    throw error;
  }
}

export async function deleteCloudBookmark(
  supabase: SupabaseClient,
  userId: string,
  bookmarkId: string,
) {
  await deleteCloudBookmarks(supabase, userId, [bookmarkId]);
}

export async function deleteCloudBookmarks(
  supabase: SupabaseClient,
  userId: string,
  bookmarkIds: string[],
) {
  if (bookmarkIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from(BOOKMARKS_TABLE)
    .delete()
    .eq("user_id", userId)
    .in("id", bookmarkIds);

  if (error) {
    throw error;
  }
}

export async function deleteCloudHighlight(
  supabase: SupabaseClient,
  userId: string,
  highlightId: string,
) {
  await deleteCloudHighlights(supabase, userId, [highlightId]);
}

export async function deleteCloudHighlights(
  supabase: SupabaseClient,
  userId: string,
  highlightIds: string[],
) {
  if (highlightIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from(HIGHLIGHTS_TABLE)
    .delete()
    .eq("user_id", userId)
    .in("id", highlightIds);

  if (error) {
    throw error;
  }
}

export async function deleteCloudDocumentBundle(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
) {
  const [
    sessionResult,
    bookmarksResult,
    highlightsResult,
    documentResult,
    payloadResult,
  ] = await Promise.all([
    supabase
      .from(SESSIONS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("document_id", documentId),
    supabase
      .from(BOOKMARKS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("document_id", documentId),
    supabase
      .from(HIGHLIGHTS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("document_id", documentId),
    supabase
      .from(DOCUMENTS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("document_id", documentId),
    supabase.storage
      .from(DOCUMENT_PAYLOAD_BUCKET)
      .remove([buildDocumentPayloadPath(userId, documentId)]),
  ]);

  if (sessionResult.error) {
    throw sessionResult.error;
  }
  if (bookmarksResult.error) {
    throw bookmarksResult.error;
  }
  if (highlightsResult.error) {
    throw highlightsResult.error;
  }
  if (documentResult.error) {
    throw documentResult.error;
  }
  if (payloadResult.error) {
    throw payloadResult.error;
  }
}
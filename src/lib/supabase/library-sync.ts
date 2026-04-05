import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/db/app-db";
import type {
  DocumentModel,
  DocumentRecord,
  DocumentSourceKind,
} from "@/types/document";
import {
  defaultReaderPreferences,
  readingGoals,
  readerModes,
  readerThemes,
  type Bookmark,
  type Highlight,
  type ReaderPreferences,
  type ReadingSession,
} from "@/types/reader";

const DOCUMENTS_TABLE = "user_documents";
const SESSIONS_TABLE = "user_sessions";
const BOOKMARKS_TABLE = "user_bookmarks";
const HIGHLIGHTS_TABLE = "user_highlights";
const FEEDBACK_TABLE = "feedback";
const PROFILES_TABLE = "profiles";
const PROFILE_AVATAR_BUCKET = "profile-avatars";

const supportedImageExtensions = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "ico",
  "jfif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "tif",
  "tiff",
  "webp",
]);

interface RemoteDocumentRow {
  created_at: string;
  document_id: string;
  excerpt: string;
  payload: DocumentModel;
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

interface RemoteProfileRow {
  avatar_path: string | null;
  created_at: string;
  display_name: string | null;
  marketing_consent: boolean | null;
  personal_info: unknown | null;
  reader_preferences: unknown | null;
  updated_at: string;
  user_id: string;
}

export interface UserPersonalInfo {
  birthYear?: number;
  city?: string;
  country?: string;
  industry?: string;
  interests?: string[];
  occupation?: string;
  useCase?: string;
}

export interface UserProfile {
  avatarPath?: string;
  avatarUrl?: string;
  createdAt: string;
  displayName?: string;
  marketingConsent: boolean;
  personalInfo?: UserPersonalInfo;
  readerPreferences?: ReaderPreferences;
  updatedAt: string;
  userId: string;
}

export interface LocalLibrarySummary {
  bookmarks: number;
  documents: number;
  highlights: number;
  sessions: number;
}

function toRemoteDocumentRow(
  userId: string,
  record: DocumentRecord,
): RemoteDocumentRow {
  if (!record.payload) {
    throw new Error("Cannot sync a document without its payload.");
  }

  return {
    created_at: record.createdAt,
    document_id: record.id,
    excerpt: record.excerpt,
    payload: record.payload,
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
    token_index: highlight.tokenIndex,
    user_id: userId,
  };
}

function toSyncedDocumentRecord(row: RemoteDocumentRow): DocumentRecord {
  return {
    createdAt: row.created_at,
    excerpt: row.excerpt,
    id: row.document_id,
    ownerId: row.user_id,
    payload: row.payload,
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

function normalizeReaderPreferences(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const candidate = input as Partial<Record<keyof ReaderPreferences, unknown>>;
  const mode =
    typeof candidate.mode === "string" &&
    readerModes.includes(candidate.mode as (typeof readerModes)[number])
      ? (candidate.mode as ReaderPreferences["mode"])
      : defaultReaderPreferences.mode;
  const theme =
    typeof candidate.theme === "string" &&
    readerThemes.includes(candidate.theme as (typeof readerThemes)[number])
      ? (candidate.theme as ReaderPreferences["theme"])
      : defaultReaderPreferences.theme;
  const readingGoal =
    typeof candidate.readingGoal === "string" &&
    readingGoals.includes(
      candidate.readingGoal as (typeof readingGoals)[number],
    )
      ? (candidate.readingGoal as ReaderPreferences["readingGoal"])
      : undefined;
  const focusWindowRaw = Number(candidate.focusWindow);
  const focusWindow =
    focusWindowRaw === 1 ||
    focusWindowRaw === 2 ||
    focusWindowRaw === 3 ||
    focusWindowRaw === 4
      ? focusWindowRaw
      : defaultReaderPreferences.focusWindow;

  return {
    chunkSize:
      typeof candidate.chunkSize === "number" &&
      Number.isFinite(candidate.chunkSize)
        ? Math.max(1, Math.min(6, Math.round(candidate.chunkSize)))
        : defaultReaderPreferences.chunkSize,
    focusWindow,
    fontScale:
      typeof candidate.fontScale === "number" &&
      Number.isFinite(candidate.fontScale)
        ? Math.max(0.8, Math.min(1.8, Number(candidate.fontScale.toFixed(1))))
        : defaultReaderPreferences.fontScale,
    lineHeight:
      typeof candidate.lineHeight === "number" &&
      Number.isFinite(candidate.lineHeight)
        ? Math.max(1.2, Math.min(2.2, Number(candidate.lineHeight.toFixed(1))))
        : defaultReaderPreferences.lineHeight,
    mode,
    naturalPauses:
      typeof candidate.naturalPauses === "boolean"
        ? candidate.naturalPauses
        : defaultReaderPreferences.naturalPauses,
    readingGoal,
    reduceMotion:
      typeof candidate.reduceMotion === "boolean"
        ? candidate.reduceMotion
        : defaultReaderPreferences.reduceMotion,
    smartPacing:
      typeof candidate.smartPacing === "boolean"
        ? candidate.smartPacing
        : defaultReaderPreferences.smartPacing,
    theme,
    wordsPerMinute:
      typeof candidate.wordsPerMinute === "number" &&
      Number.isFinite(candidate.wordsPerMinute)
        ? Math.max(120, Math.min(700, Math.round(candidate.wordsPerMinute)))
        : defaultReaderPreferences.wordsPerMinute,
  } satisfies ReaderPreferences;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeBirthYear(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const currentYear = new Date().getFullYear();
  const normalized = Math.round(value);
  if (normalized < 1900 || normalized > currentYear) {
    return undefined;
  }

  return normalized;
}

function normalizeInterestList(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const uniqueItems = Array.from(
    new Set(
      value
        .map((entry) => normalizeText(entry, 48))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).slice(0, 12);

  return uniqueItems.length > 0 ? uniqueItems : undefined;
}

function normalizePersonalInfo(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const candidate = input as Partial<Record<keyof UserPersonalInfo, unknown>>;
  const normalized = {
    birthYear: normalizeBirthYear(candidate.birthYear),
    city: normalizeText(candidate.city, 80),
    country: normalizeText(candidate.country, 80),
    industry: normalizeText(candidate.industry, 80),
    interests: normalizeInterestList(candidate.interests),
    occupation: normalizeText(candidate.occupation, 80),
    useCase: normalizeText(candidate.useCase, 240),
  } satisfies UserPersonalInfo;

  return Object.values(normalized).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== undefined;
  })
    ? normalized
    : undefined;
}

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === normalized.length - 1) {
    return undefined;
  }

  return normalized.slice(dotIndex + 1);
}

function isSupportedAvatarFile(file: File) {
  if (
    typeof file.type === "string" &&
    file.type.toLowerCase().startsWith("image/")
  ) {
    return true;
  }

  const extension = getFileExtension(file.name);
  return extension ? supportedImageExtensions.has(extension) : false;
}

function buildAvatarPath(userId: string, file: File) {
  const extension = getFileExtension(file.name) ?? "img";
  return `${userId}/avatar-${Date.now()}.${extension}`;
}

async function resolveAvatarUrl(
  supabase: SupabaseClient,
  avatarPath: string | undefined,
) {
  if (!avatarPath) {
    return undefined;
  }

  const { data, error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .createSignedUrl(avatarPath, 60 * 60);

  if (error) {
    console.warn("profile avatar URL could not be created", error);
    return undefined;
  }

  return data.signedUrl;
}

async function toUserProfile(
  supabase: SupabaseClient,
  row: RemoteProfileRow,
): Promise<UserProfile> {
  const avatarPath = normalizeText(row.avatar_path, 240);

  return {
    avatarPath,
    avatarUrl: await resolveAvatarUrl(supabase, avatarPath),
    createdAt: row.created_at,
    displayName: row.display_name ?? undefined,
    marketingConsent: row.marketing_consent === true,
    personalInfo: normalizePersonalInfo(row.personal_info),
    readerPreferences: normalizeReaderPreferences(row.reader_preferences),
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

async function fetchCurrentUserId(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id;
}

export async function ensureProfile(supabase: SupabaseClient, userId?: string) {
  const currentUserId = userId ?? (await fetchCurrentUserId(supabase));

  if (!currentUserId) {
    return;
  }

  const rpcResult = await supabase.rpc("ensure_my_profile");
  if (!rpcResult.error) {
    return;
  }

  await supabase.from(PROFILES_TABLE).upsert(
    {
      updated_at: new Date().toISOString(),
      user_id: currentUserId,
    },
    {
      onConflict: "user_id",
    },
  );
}

export async function getProfile(supabase: SupabaseClient, userId?: string) {
  const currentUserId = userId ?? (await fetchCurrentUserId(supabase));

  if (!currentUserId) {
    return undefined;
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("*")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toUserProfile(supabase, data as RemoteProfileRow) : undefined;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  input: {
    avatarPath?: string | null;
    displayName?: string;
    marketingConsent?: boolean;
    personalInfo?: UserPersonalInfo | null;
    readerPreferences?: ReaderPreferences;
    userId?: string;
  },
) {
  const currentUserId = input.userId ?? (await fetchCurrentUserId(supabase));

  if (!currentUserId) {
    throw new Error("Authentication required.");
  }

  await ensureProfile(supabase, currentUserId);

  const normalizedDisplayName = input.displayName?.trim();
  const updates: {
    avatar_path?: string | null;
    display_name?: string | null;
    marketing_consent?: boolean;
    personal_info?: UserPersonalInfo | null;
    reader_preferences?: ReaderPreferences | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if ("avatarPath" in input) {
    updates.avatar_path = input.avatarPath ?? null;
  }

  if ("displayName" in input) {
    updates.display_name = normalizedDisplayName ? normalizedDisplayName : null;
  }

  if ("marketingConsent" in input) {
    updates.marketing_consent = input.marketingConsent === true;
  }

  if ("personalInfo" in input) {
    updates.personal_info = input.personalInfo ?? null;
  }

  if ("readerPreferences" in input) {
    updates.reader_preferences = input.readerPreferences ?? null;
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .update(updates)
    .eq("user_id", currentUserId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toUserProfile(supabase, data as RemoteProfileRow);
}

export async function deleteProfileAvatar(
  supabase: SupabaseClient,
  avatarPath: string | undefined,
) {
  if (!avatarPath) {
    return;
  }

  const { error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .remove([avatarPath]);

  if (error) {
    throw error;
  }
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  input: {
    file: File;
    userId?: string;
  },
) {
  const currentUserId = input.userId ?? (await fetchCurrentUserId(supabase));

  if (!currentUserId) {
    throw new Error("Authentication required.");
  }

  if (!isSupportedAvatarFile(input.file)) {
    throw new Error("Please choose an image file.");
  }

  const avatarPath = buildAvatarPath(currentUserId, input.file);
  const { error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(avatarPath, input.file, {
      cacheControl: "3600",
      contentType: input.file.type || undefined,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return avatarPath;
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

export async function getLocalOnlyLibrarySummary(): Promise<LocalLibrarySummary> {
  const [documents, sessions, bookmarks, highlights] = await Promise.all([
    db.documents.toArray(),
    db.sessions.toArray(),
    db.bookmarks.toArray(),
    db.highlights.toArray(),
  ]);

  return {
    bookmarks: bookmarks.filter((bookmark) => !bookmark.ownerId).length,
    documents: documents.filter((document) => !document.ownerId).length,
    highlights: highlights.filter((highlight) => !highlight.ownerId).length,
    sessions: sessions.filter((session) => !session.ownerId).length,
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

  const localDocuments = documents.filter((document) => !document.ownerId);
  if (localDocuments.length === 0) {
    return { backedUpDocuments: 0 };
  }

  const localDocumentIds = new Set(
    localDocuments.map((document) => document.id),
  );
  const localSessions = sessions.filter((session) =>
    localDocumentIds.has(session.documentId),
  );
  const localBookmarks = bookmarks.filter((bookmark) =>
    localDocumentIds.has(bookmark.documentId),
  );
  const localHighlights = highlights.filter((highlight) =>
    localDocumentIds.has(highlight.documentId),
  );

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

  return { backedUpDocuments: localDocuments.length };
}

export async function hydrateCloudLibraryToLocal(
  supabase: SupabaseClient,
  userId: string,
) {
  const [documentsResult, sessionsResult, bookmarksResult, highlightsResult] =
    await Promise.all([
      supabase
        .from(DOCUMENTS_TABLE)
        .select("*")
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

  const syncedDocuments = (documentsResult.data ?? []).map(
    toSyncedDocumentRecord,
  );
  const syncedSessions = (sessionsResult.data ?? []).map(toSyncedSessionRecord);
  const syncedBookmarks = (bookmarksResult.data ?? []).map(
    toSyncedBookmarkRecord,
  );
  const syncedHighlights = (highlightsResult.data ?? []).map(
    toSyncedHighlightRecord,
  );

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

  return {
    bookmarks: syncedBookmarks.length,
    documents: syncedDocuments.length,
    highlights: syncedHighlights.length,
    sessions: syncedSessions.length,
  };
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

  const document = toSyncedDocumentRecord(documentResult.data);
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

export async function upsertCloudDocuments(
  supabase: SupabaseClient,
  userId: string,
  documents: DocumentRecord[],
) {
  if (documents.length === 0) {
    return;
  }

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
  const { error } = await supabase
    .from(BOOKMARKS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("id", bookmarkId);

  if (error) {
    throw error;
  }
}

export async function deleteCloudHighlight(
  supabase: SupabaseClient,
  userId: string,
  highlightId: string,
) {
  const { error } = await supabase
    .from(HIGHLIGHTS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("id", highlightId);

  if (error) {
    throw error;
  }
}

export async function deleteCloudDocumentBundle(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
) {
  const [sessionResult, bookmarksResult, highlightsResult, documentResult] =
    await Promise.all([
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
}

export async function submitFeedback(
  supabase: SupabaseClient,
  input: {
    email?: string;
    message: string;
    rating?: number;
    route: string;
    userId?: string;
  },
) {
  const { error } = await supabase.from(FEEDBACK_TABLE).insert({
    email: input.email?.trim() ? input.email.trim() : null,
    message: input.message.trim(),
    rating: input.rating ?? null,
    route: input.route,
    user_id: input.userId ?? null,
  });

  if (error) {
    throw error;
  }
}

import { nanoid } from "nanoid";

import { db } from "@/db/app-db";
import { getRelatedDocuments } from "@/db/repository-shared";
import { isCatalogDocumentId } from "@/lib/catalog";
import type { DocumentRecord } from "@/types/document";
import type { Bookmark } from "@/types/reader";

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

export async function putBookmark(bookmark: Bookmark) {
  await db.bookmarks.put(bookmark);
  return bookmark;
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
      return document && !isCatalogDocumentId(document.id)
        ? { bookmark, document }
        : null;
    })
    .filter((entry): entry is RecentBookmarkRecord => entry !== null);
}

export async function deleteBookmark(bookmarkId: string) {
  await db.bookmarks.delete(bookmarkId);
}
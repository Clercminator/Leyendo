import { nanoid } from "nanoid";

import { db } from "@/db/app-db";
import { getRelatedDocuments } from "@/db/repository-shared";
import { isCatalogDocumentId } from "@/lib/catalog";
import type { DocumentRecord } from "@/types/document";
import type { Highlight } from "@/types/reader";

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

export async function putHighlight(highlight: Highlight) {
  await db.highlights.put(highlight);
  return highlight;
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
      return document && !isCatalogDocumentId(document.id)
        ? { highlight, document }
        : null;
    })
    .filter((entry): entry is RecentHighlightRecord => entry !== null);
}

export async function deleteHighlight(highlightId: string) {
  await db.highlights.delete(highlightId);
}
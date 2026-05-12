import { db } from "@/db/app-db";
import { isCatalogDocumentId } from "@/lib/catalog";
import { getRelatedDocuments } from "@/db/repository-shared";
import type { DocumentModel, DocumentRecord } from "@/types/document";
import type { ReadingSession } from "@/types/reader";

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
      return document && !isCatalogDocumentId(document.id)
        ? { session, document }
        : null;
    })
    .filter((entry): entry is RecentSessionRecord => entry !== null);
}

export function buildInitialSession(document: DocumentModel): ReadingSession {
  return {
    id: `${document.id}:session`,
    documentId: document.id,
    currentChunkIndex: 0,
    currentTokenIndex: 0,
    currentParagraphIndex: 0,
    currentSectionIndex: 0,
    anchorText: document.chunks[0]?.text,
    percentComplete: 0,
    textPresentation: document.sourceKind === "markdown" ? "clean" : undefined,
    updatedAt: new Date().toISOString(),
  };
}
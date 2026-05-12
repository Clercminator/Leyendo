import { db } from "@/db/app-db";
import { isCatalogDocumentId } from "@/lib/catalog";
import type { DocumentAssetRecord, DocumentRecord } from "@/types/document";

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
  const documents = await db.documents
    .orderBy("updatedAt")
    .reverse()
    .limit(limit * 4)
    .toArray();

  return documents
    .filter((document) => !isCatalogDocumentId(document.id))
    .slice(0, limit);
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
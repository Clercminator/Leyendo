import { db } from "@/db/app-db";

export async function getRelatedDocuments(documentIds: string[]) {
  if (documentIds.length === 0) {
    return [];
  }

  return db.documents.bulkGet(documentIds);
}

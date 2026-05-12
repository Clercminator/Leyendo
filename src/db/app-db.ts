import Dexie, { type EntityTable } from "dexie";

import type { DocumentAssetRecord, DocumentRecord } from "@/types/document";
import type {
  Bookmark,
  Highlight,
  PdfViewerState,
  ReaderPreferences,
  ReadingSession,
} from "@/types/reader";
import type { PendingCloudDeleteRecord } from "@/types/sync";

export interface PreferenceRecord {
  key: string;
  value: unknown;
}

export class LeeDatabase extends Dexie {
  documents!: EntityTable<DocumentRecord, "id">;
  documentAssets!: EntityTable<DocumentAssetRecord, "documentId">;
  sessions!: EntityTable<ReadingSession, "id">;
  bookmarks!: EntityTable<Bookmark, "id">;
  highlights!: EntityTable<Highlight, "id">;
  pendingCloudDeletes!: EntityTable<PendingCloudDeleteRecord, "id">;
  preferences!: EntityTable<PreferenceRecord, "key">;

  constructor() {
    super("lee-reader-db");

    this.version(1).stores({
      documents: "id, updatedAt, sourceKind",
      sessions: "id, documentId, updatedAt",
      bookmarks: "id, documentId, createdAt",
      preferences: "key",
    });

    this.version(2).stores({
      documents: "id, updatedAt, sourceKind",
      sessions: "id, documentId, updatedAt",
      bookmarks: "id, documentId, createdAt",
      highlights: "id, documentId, createdAt",
      preferences: "key",
    });

    this.version(3).stores({
      documents: "id, updatedAt, sourceKind, ownerId, syncState",
      sessions: "id, documentId, updatedAt, ownerId, syncState",
      bookmarks: "id, documentId, createdAt, ownerId, syncState",
      highlights: "id, documentId, createdAt, ownerId, syncState",
      preferences: "key",
    });

    this.version(4).stores({
      documents: "id, updatedAt, sourceKind, ownerId, syncState",
      documentAssets: "documentId, sourceKind, updatedAt",
      sessions: "id, documentId, updatedAt, ownerId, syncState",
      bookmarks: "id, documentId, createdAt, ownerId, syncState",
      highlights: "id, documentId, createdAt, ownerId, syncState",
      preferences: "key",
    });

    this.version(5).stores({
      documents: "id, updatedAt, sourceKind, ownerId, syncState",
      documentAssets: "documentId, sourceKind, updatedAt",
      sessions: "id, documentId, updatedAt, ownerId, syncState",
      bookmarks: "id, documentId, createdAt, ownerId, syncState",
      highlights: "id, documentId, createdAt, ownerId, syncState",
      pendingCloudDeletes: "id, ownerId, recordType, createdAt",
      preferences: "key",
    });
  }
}

export const db = new LeeDatabase();

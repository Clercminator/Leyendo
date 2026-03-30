import Dexie, { type EntityTable } from "dexie";

import type { DocumentRecord } from "@/types/document";
import type {
  Bookmark,
  Highlight,
  ReaderPreferences,
  ReadingSession,
} from "@/types/reader";

export interface PreferenceRecord {
  key: string;
  value: ReaderPreferences;
}

export class LeeDatabase extends Dexie {
  documents!: EntityTable<DocumentRecord, "id">;
  sessions!: EntityTable<ReadingSession, "id">;
  bookmarks!: EntityTable<Bookmark, "id">;
  highlights!: EntityTable<Highlight, "id">;
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
  }
}

export const db = new LeeDatabase();

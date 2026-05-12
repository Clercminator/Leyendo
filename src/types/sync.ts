export type SyncState = "local-only" | "synced";

export type PendingCloudDeleteType = "bookmark" | "highlight";

export interface PendingCloudDeleteRecord {
  id: string;
  createdAt: string;
  ownerId: string;
  recordId: string;
  recordType: PendingCloudDeleteType;
}

export interface SyncOwnedRecord {
  ownerId?: string;
  syncState?: SyncState;
}

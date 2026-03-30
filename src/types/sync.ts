export type SyncState = "local-only" | "synced";

export interface SyncOwnedRecord {
  ownerId?: string;
  syncState?: SyncState;
}

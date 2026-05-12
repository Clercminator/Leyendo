import { db } from "@/db/app-db";
import type {
  PendingCloudDeleteRecord,
  PendingCloudDeleteType,
} from "@/types/sync";

function getPendingCloudDeleteId(
  ownerId: string,
  recordType: PendingCloudDeleteType,
  recordId: string,
) {
  return `${ownerId}:${recordType}:${recordId}`;
}

export async function savePendingCloudDelete(input: {
  ownerId: string;
  recordId: string;
  recordType: PendingCloudDeleteType;
}) {
  const record: PendingCloudDeleteRecord = {
    createdAt: new Date().toISOString(),
    id: getPendingCloudDeleteId(
      input.ownerId,
      input.recordType,
      input.recordId,
    ),
    ownerId: input.ownerId,
    recordId: input.recordId,
    recordType: input.recordType,
  };

  await db.pendingCloudDeletes.put(record);
  return record;
}

export async function getPendingCloudDeletesForOwner(ownerId: string) {
  return db.pendingCloudDeletes.where("ownerId").equals(ownerId).toArray();
}

export async function deletePendingCloudDeletes(ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  await db.pendingCloudDeletes.bulkDelete(ids);
}

export async function clearPendingCloudDeletesForOwner(ownerId: string) {
  await db.pendingCloudDeletes.where("ownerId").equals(ownerId).delete();
}
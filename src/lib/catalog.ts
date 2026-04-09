const catalogDocumentIdPrefix = "catalog:";
const catalogOwnerIdPrefix = "catalog:";

export const maxCatalogCacheDocuments = 2;

export function toCatalogDocumentId(catalogBookId: string) {
  return `${catalogDocumentIdPrefix}${catalogBookId}`;
}

export function isCatalogDocumentId(documentId: string | undefined) {
  return (
    typeof documentId === "string" &&
    documentId.startsWith(catalogDocumentIdPrefix)
  );
}

export function getCatalogBookIdFromDocumentId(documentId: string) {
  return isCatalogDocumentId(documentId)
    ? documentId.slice(catalogDocumentIdPrefix.length)
    : undefined;
}

export function toCatalogOwnerId(userId: string) {
  return `${catalogOwnerIdPrefix}${userId}`;
}

export function isCatalogOwnerId(ownerId: string | undefined) {
  return (
    typeof ownerId === "string" && ownerId.startsWith(catalogOwnerIdPrefix)
  );
}

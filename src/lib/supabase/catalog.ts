import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/db/app-db";
import { deleteDocumentAndRelatedData } from "@/db/repositories";
import {
  maxCatalogCacheDocuments,
  toCatalogDocumentId,
  toCatalogOwnerId,
} from "@/lib/catalog";
import type {
  DocumentModel,
  DocumentRecord,
  DocumentSourceKind,
} from "@/types/document";

const CATALOG_BOOKS_TABLE = "catalog_books";
const CATALOG_PAYLOAD_BUCKET = "catalog-payloads";

interface RemoteCatalogBookRow {
  author: string | null;
  created_at: string;
  description: string | null;
  estimated_reading_minutes: number | null;
  excerpt: string;
  id: string;
  language: string | null;
  payload_path: string;
  slug: string;
  source_kind: DocumentSourceKind;
  title: string;
  total_chunks: number | null;
  total_sections: number | null;
  updated_at: string;
}

export interface CatalogBook {
  author?: string;
  createdAt: string;
  description?: string;
  estimatedReadingMinutes: number;
  excerpt: string;
  id: string;
  language?: string;
  payloadPath: string;
  slug: string;
  sourceKind: DocumentSourceKind;
  title: string;
  totalChunks: number;
  totalSections: number;
  updatedAt: string;
}

function normalizeCatalogBook(row: RemoteCatalogBookRow): CatalogBook {
  return {
    author: row.author ?? undefined,
    createdAt: row.created_at,
    description: row.description ?? undefined,
    estimatedReadingMinutes: Math.max(0, row.estimated_reading_minutes ?? 0),
    excerpt: row.excerpt,
    id: row.id,
    language: row.language ?? undefined,
    payloadPath: row.payload_path,
    slug: row.slug,
    sourceKind: row.source_kind,
    title: row.title,
    totalChunks: Math.max(0, row.total_chunks ?? 0),
    totalSections: Math.max(0, row.total_sections ?? 0),
    updatedAt: row.updated_at,
  };
}

async function decodeCatalogPayloadBlob(blob: Blob, payloadPath: string) {
  if (!payloadPath.endsWith(".gz")) {
    return blob.text();
  }

  const decompressionStream = new DecompressionStream("gzip");
  const decompressed = blob.stream().pipeThrough(decompressionStream);

  return new Response(decompressed).text();
}

async function downloadCatalogPayload(
  supabase: SupabaseClient,
  payloadPath: string,
) {
  const { data, error } = await supabase.storage
    .from(CATALOG_PAYLOAD_BUCKET)
    .download(payloadPath);

  if (error || !data) {
    throw error ?? new Error("Catalog payload could not be downloaded.");
  }

  return JSON.parse(
    await decodeCatalogPayloadBlob(data, payloadPath),
  ) as DocumentModel;
}

async function getCatalogBookRecord(
  supabase: SupabaseClient,
  catalogBookId: string,
) {
  const { data, error } = await supabase
    .from(CATALOG_BOOKS_TABLE)
    .select(
      "id,slug,title,author,description,excerpt,language,source_kind,payload_path,total_chunks,total_sections,estimated_reading_minutes,created_at,updated_at",
    )
    .eq("id", catalogBookId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeCatalogBook(data as RemoteCatalogBookRow) : undefined;
}

export async function listCatalogBooks(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from(CATALOG_BOOKS_TABLE)
    .select(
      "id,slug,title,author,description,excerpt,language,source_kind,payload_path,total_chunks,total_sections,estimated_reading_minutes,created_at,updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeCatalogBook(row as RemoteCatalogBookRow),
  );
}

export async function clearLocalCatalogCache() {
  const catalogDocuments = (await db.documents.toArray()).filter((document) =>
    document.id.startsWith("catalog:"),
  );

  await Promise.all(
    catalogDocuments.map((document) =>
      deleteDocumentAndRelatedData(document.id),
    ),
  );
}

export async function evictLocalCatalogCache(args?: {
  keepDocumentIds?: string[];
  maxDocuments?: number;
}) {
  const keepDocumentIds = new Set(args?.keepDocumentIds ?? []);
  const maxDocuments = args?.maxDocuments ?? maxCatalogCacheDocuments;
  const catalogDocuments = (await db.documents.toArray())
    .filter((document) => document.id.startsWith("catalog:"))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const protectedCount = catalogDocuments.filter((document) =>
    keepDocumentIds.has(document.id),
  ).length;
  const allowedDocuments = Math.max(maxDocuments, protectedCount);
  const removableDocuments = catalogDocuments.filter(
    (document, index) =>
      index >= allowedDocuments && !keepDocumentIds.has(document.id),
  );

  await Promise.all(
    removableDocuments.map((document) =>
      deleteDocumentAndRelatedData(document.id),
    ),
  );
}

export async function hydrateCatalogBookToLocal(
  supabase: SupabaseClient,
  input: {
    catalogBookId: string;
    userId: string;
  },
) {
  const catalogBook = await getCatalogBookRecord(supabase, input.catalogBookId);

  if (!catalogBook) {
    return false;
  }

  const payload = await downloadCatalogPayload(
    supabase,
    catalogBook.payloadPath,
  );
  const documentId = toCatalogDocumentId(catalogBook.id);
  const documentRecord: DocumentRecord = {
    createdAt: catalogBook.createdAt,
    excerpt: catalogBook.excerpt,
    id: documentId,
    ownerId: toCatalogOwnerId(input.userId),
    payload,
    sourceKind: catalogBook.sourceKind,
    syncState: "local-only",
    title: catalogBook.title,
    totalChunks: catalogBook.totalChunks,
    totalSections: catalogBook.totalSections,
    updatedAt: new Date().toISOString(),
  };

  await db.documents.put(documentRecord);
  await evictLocalCatalogCache({ keepDocumentIds: [documentId] });
  return true;
}

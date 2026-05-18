import type { DocumentAssetRecord } from "@/types/document";

const browserPdfObjectUrlCache = new Map<
  string,
  {
    objectUrl: string;
    updatedAt: string;
  }
>();

let hasBrowserPdfCleanupListener = false;

function cleanupBrowserPdfObjectUrls() {
  browserPdfObjectUrlCache.forEach(({ objectUrl }) => {
    URL.revokeObjectURL(objectUrl);
  });

  browserPdfObjectUrlCache.clear();
  hasBrowserPdfCleanupListener = false;
}

function ensureBrowserPdfCleanupListener() {
  if (typeof window === "undefined" || hasBrowserPdfCleanupListener) {
    return;
  }

  window.addEventListener("pagehide", cleanupBrowserPdfObjectUrls, {
    once: true,
  });
  hasBrowserPdfCleanupListener = true;
}

function getBrowserPdfObjectUrl(args: {
  asset: DocumentAssetRecord;
  documentId: string;
}) {
  const cachedObjectUrl = browserPdfObjectUrlCache.get(args.documentId);

  if (cachedObjectUrl?.updatedAt === args.asset.updatedAt) {
    return cachedObjectUrl.objectUrl;
  }

  if (cachedObjectUrl) {
    URL.revokeObjectURL(cachedObjectUrl.objectUrl);
  }

  const objectUrl = URL.createObjectURL(args.asset.blob);

  browserPdfObjectUrlCache.set(args.documentId, {
    objectUrl,
    updatedAt: args.asset.updatedAt,
  });
  ensureBrowserPdfCleanupListener();

  return objectUrl;
}

export function buildBrowserPdfUrl(args: {
  asset: DocumentAssetRecord;
  documentId: string;
  pageIndex?: number;
}) {
  const objectUrl = getBrowserPdfObjectUrl(args);
  const pageFragment =
    typeof args.pageIndex === "number" && args.pageIndex >= 0
      ? `#page=${args.pageIndex + 1}`
      : "";

  return `${objectUrl}${pageFragment}`;
}

export function openPdfAssetInBrowser(args: {
  asset: DocumentAssetRecord;
  documentId: string;
  pageIndex?: number;
  targetWindow?: Window | null;
}) {
  const browserPdfUrl = buildBrowserPdfUrl(args);

  if (args.targetWindow) {
    args.targetWindow.opener = null;
    args.targetWindow.location.href = browserPdfUrl;
    return browserPdfUrl;
  }

  const nextWindow = window.open(browserPdfUrl, "_blank");

  if (nextWindow) {
    nextWindow.opener = null;
    return browserPdfUrl;
  }

  window.location.assign(browserPdfUrl);
  return browserPdfUrl;
}
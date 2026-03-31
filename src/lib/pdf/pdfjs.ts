let isPdfWorkerConfigured = false;

function getPdfAssetOrigin() {
  if (
    typeof globalThis.origin === "string" &&
    globalThis.origin.length > 0 &&
    globalThis.origin !== "null"
  ) {
    return globalThis.origin;
  }

  const locationHref =
    typeof globalThis.location?.href === "string"
      ? globalThis.location.href
      : null;

  if (
    locationHref?.startsWith("http://") ||
    locationHref?.startsWith("https://")
  ) {
    return new URL(locationHref).origin;
  }

  if (
    typeof document !== "undefined" &&
    typeof document.baseURI === "string" &&
    (document.baseURI.startsWith("http://") ||
      document.baseURI.startsWith("https://"))
  ) {
    return new URL(document.baseURI).origin;
  }

  return "http://localhost";
}

export function getPdfAssetUrl(path: string) {
  return new URL(`/pdfjs/${path}`, `${getPdfAssetOrigin()}/`).toString();
}

function isPdfWorkerContext() {
  return (
    typeof WorkerGlobalScope !== "undefined" &&
    globalThis instanceof WorkerGlobalScope &&
    typeof document === "undefined"
  );
}

export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!isPdfWorkerConfigured) {
    if (isPdfWorkerContext()) {
      await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc ||=
        getPdfAssetUrl("pdf.worker.min.mjs");
    }

    isPdfWorkerConfigured = true;
  }

  return pdfjs;
}

export async function loadPdfJsViewer() {
  return import("pdfjs-dist/web/pdf_viewer.mjs");
}

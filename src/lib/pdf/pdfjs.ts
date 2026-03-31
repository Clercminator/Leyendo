let isPdfWorkerConfigured = false;

function installArrayAtFallback() {
  if (typeof Array.prototype.at === "function") {
    return;
  }

  Object.defineProperty(Array.prototype, "at", {
    configurable: true,
    value: function at(index: number) {
      const length = this.length >>> 0;

      if (length === 0) {
        return undefined;
      }

      const normalizedIndex = Math.trunc(index) || 0;
      const resolvedIndex = normalizedIndex < 0 ? length + normalizedIndex : normalizedIndex;

      if (resolvedIndex < 0 || resolvedIndex >= length) {
        return undefined;
      }

      return this[resolvedIndex];
    },
    writable: true,
  });
}

function installStringAtFallback() {
  if (typeof String.prototype.at === "function") {
    return;
  }

  Object.defineProperty(String.prototype, "at", {
    configurable: true,
    value: function at(index: number) {
      const value = String(this);
      const length = value.length;

      if (length === 0) {
        return undefined;
      }

      const normalizedIndex = Math.trunc(index) || 0;
      const resolvedIndex = normalizedIndex < 0 ? length + normalizedIndex : normalizedIndex;

      if (resolvedIndex < 0 || resolvedIndex >= length) {
        return undefined;
      }

      return value.charAt(resolvedIndex);
    },
    writable: true,
  });
}

function installPromiseWithResolversFallback() {
  if (typeof Promise.withResolvers === "function") {
    return;
  }

  Object.defineProperty(Promise, "withResolvers", {
    configurable: true,
    value: function withResolvers<Value>() {
      let resolve!: (value: Value | PromiseLike<Value>) => void;
      let reject!: (reason?: unknown) => void;

      const promise = new Promise<Value>((nextResolve, nextReject) => {
        resolve = nextResolve;
        reject = nextReject;
      });

      return {
        promise,
        reject,
        resolve,
      };
    },
    writable: true,
  });
}

function installPdfJsCompatibilityFallbacks() {
  installArrayAtFallback();
  installStringAtFallback();
  installPromiseWithResolversFallback();
}

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
  installPdfJsCompatibilityFallbacks();
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
  installPdfJsCompatibilityFallbacks();
  return import("pdfjs-dist/legacy/web/pdf_viewer.mjs");
}

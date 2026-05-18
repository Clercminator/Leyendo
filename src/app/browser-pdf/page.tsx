"use client";

import { use, useEffect, useMemo, useState } from "react";

import { getDocumentAsset } from "@/db/repositories";
import { buildBrowserPdfUrl } from "@/lib/pdf/browser-pdf";

interface BrowserPdfPageProps {
  searchParams: Promise<{
    document?: string | string[];
    page?: string | string[];
  }>;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function BrowserPdfPage({
  searchParams,
}: BrowserPdfPageProps) {
  const resolvedSearchParams = use(searchParams);
  const documentId = getSingleSearchParam(resolvedSearchParams.document);
  const requestedPage = getSingleSearchParam(resolvedSearchParams.page);
  const [error, setError] = useState<string>();

  const pageIndex = useMemo(() => {
    const parsedPageNumber = Number.parseInt(requestedPage ?? "", 10);

    if (!Number.isFinite(parsedPageNumber) || parsedPageNumber <= 0) {
      return undefined;
    }

    return parsedPageNumber - 1;
  }, [requestedPage]);

  useEffect(() => {
    if (!documentId) {
      setError("This browser tab is missing the PDF document reference.");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const asset = await getDocumentAsset(documentId);

        if (!asset || asset.sourceKind !== "pdf") {
          if (!cancelled) {
            setError(
              "The original PDF is not stored on this device. Re-import it locally and try again.",
            );
          }
          return;
        }

        const browserPdfUrl = buildBrowserPdfUrl({
          asset,
          documentId,
          pageIndex,
        });

        if (!cancelled) {
          window.location.replace(browserPdfUrl);
        }
      } catch {
        if (!cancelled) {
          setError("This browser could not open the original PDF.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId, pageIndex]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-800 bg-slate-900/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
        <p className="text-xs tracking-[0.28em] text-sky-300 uppercase">
          Browser PDF
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          {error ? "Could not open the original PDF" : "Opening the original PDF"}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          {error ??
            "Leyendo is opening the stored PDF in this tab so the browser can handle the original page layout directly."}
        </p>
      </div>
    </main>
  );
}
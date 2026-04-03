"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { ArrowRight, LoaderCircle } from "lucide-react";

import {
  buildInitialSession,
  getDocumentById,
  getSessionForDocument,
  saveDocument,
  saveSession,
} from "@/db/repositories";
import {
  buildDocumentModel,
  toDocumentRecord,
} from "@/features/ingest/build/document-model";
import { getGuideReaderDocumentId } from "@/lib/guides";
import { cn } from "@/lib/utils";

interface OpenGuideInReaderButtonProps {
  guideSlug: string;
  guideTitle: string;
  guideMarkdown: string;
  label: string;
  loadingLabel: string;
  errorLabel: string;
  className?: string;
}

export function OpenGuideInReaderButton({
  guideSlug,
  guideTitle,
  guideMarkdown,
  label,
  loadingLabel,
  errorLabel,
  className,
}: OpenGuideInReaderButtonProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = async () => {
    if (isOpening) {
      return;
    }

    const documentId = getGuideReaderDocumentId(guideSlug);

    setIsOpening(true);
    setErrorMessage(undefined);

    try {
      const existingDocument = await getDocumentById(documentId);

      if (existingDocument?.payload) {
        const existingSession = await getSessionForDocument(documentId);

        if (!existingSession) {
          await saveSession(buildInitialSession(existingDocument.payload));
        }
      } else {
        const builtDocument = buildDocumentModel({
          title: guideTitle,
          rawText: guideMarkdown,
          sourceKind: "markdown",
        });
        const timestamp = new Date().toISOString();
        const guideDocument = {
          ...builtDocument,
          id: documentId,
          title: guideTitle,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await saveDocument(toDocumentRecord(guideDocument));
        await saveSession(buildInitialSession(guideDocument));
      }

      startTransition(() => {
        router.push(`/reader?document=${documentId}`);
      });
    } catch (error) {
      console.error("guide reader handoff failed", error);
      setErrorMessage(errorLabel);
      setIsOpening(false);
      return;
    }

    setIsOpening(false);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          void handleOpen();
        }}
        disabled={isOpening}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-(--text-strong) px-5 py-3 text-sm font-semibold text-(--text-on-accent) transition hover:opacity-92 disabled:cursor-wait disabled:opacity-75",
          className,
        )}
      >
        {isOpening ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        {isOpening ? loadingLabel : label}
      </button>

      {errorMessage ? (
        <p role="status" className="text-sm leading-7 text-rose-200">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

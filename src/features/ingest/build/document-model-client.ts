import {
  buildDocumentModel,
  type BuildDocumentModelInput,
} from "@/features/ingest/build/document-model";
import { measureAsync } from "@/lib/perf/instrumentation";
import type { DocumentSourceKind } from "@/types/document";

export const DOCUMENT_MODEL_WORKER_THRESHOLD = 120_000;
export const DOCUMENT_MODEL_WORKER_TIMEOUT_MS = 90_000;

const DOCUMENT_MODEL_MAIN_THREAD_FALLBACK_THRESHOLD = 180_000;

export interface DocumentBuildResult {
  document: ReturnType<typeof buildDocumentModel>;
  processingMode: "main-thread" | "worker";
}

export function shouldOffloadDocumentBuild(rawText: string) {
  return rawText.length >= DOCUMENT_MODEL_WORKER_THRESHOLD;
}

function createPreparationTimeoutMessage(sourceKind: DocumentSourceKind) {
  return sourceKind === "pdf"
    ? "The PDF text was extracted, but preparing it for the reader is taking too long in this browser. This usually means the file is very long or the extracted layout is complex. Try a shorter PDF, remove appendix pages, or paste only the section you need."
    : "Preparing this document for the reader is taking too long in this browser. Try a shorter file or paste only the section you need.";
}

export async function buildDocumentModelAsync(
  input: BuildDocumentModelInput,
): Promise<DocumentBuildResult> {
  if (
    !shouldOffloadDocumentBuild(input.rawText) ||
    typeof Worker === "undefined"
  ) {
    const document = await measureAsync(
      "import.build-document",
      {
        rawTextLength: input.rawText.length,
        processingMode: "main-thread",
      },
      async () => buildDocumentModel(input),
    );

    return {
      document,
      processingMode: "main-thread",
    };
  }

  const document = await measureAsync(
    "import.build-document",
    {
      rawTextLength: input.rawText.length,
      processingMode: "worker",
    },
    () =>
      new Promise<ReturnType<typeof buildDocumentModel>>((resolve, reject) => {
        const worker = new Worker(
          new URL("./document-model.worker.ts", import.meta.url),
          { type: "module" },
        );
        const timeoutId = globalThis.setTimeout(() => {
          worker.terminate();
          reject(new Error(createPreparationTimeoutMessage(input.sourceKind)));
        }, DOCUMENT_MODEL_WORKER_TIMEOUT_MS);

        const clearTimeoutIfPending = () => {
          globalThis.clearTimeout(timeoutId);
        };

        worker.onmessage = (
          event: MessageEvent<
            | { ok: true; document: ReturnType<typeof buildDocumentModel> }
            | { ok: false; message: string }
          >,
        ) => {
          clearTimeoutIfPending();
          worker.terminate();

          if (!event.data.ok) {
            reject(new Error(event.data.message));
            return;
          }

          resolve(event.data.document);
        };

        worker.onerror = () => {
          clearTimeoutIfPending();
          worker.terminate();

          if (
            input.rawText.length > DOCUMENT_MODEL_MAIN_THREAD_FALLBACK_THRESHOLD
          ) {
            reject(
              new Error(createPreparationTimeoutMessage(input.sourceKind)),
            );
            return;
          }

          try {
            resolve(buildDocumentModel(input));
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new Error(
                    "Something went wrong while preparing the document model.",
                  ),
            );
          }
        };

        worker.postMessage(input);
      }),
  );

  return {
    document,
    processingMode: "worker",
  };
}

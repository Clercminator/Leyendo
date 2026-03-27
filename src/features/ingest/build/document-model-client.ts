import {
  buildDocumentModel,
  type BuildDocumentModelInput,
} from "@/features/ingest/build/document-model";
import { measureAsync } from "@/lib/perf/instrumentation";

export const DOCUMENT_MODEL_WORKER_THRESHOLD = 120_000;

export interface DocumentBuildResult {
  document: ReturnType<typeof buildDocumentModel>;
  processingMode: "main-thread" | "worker";
}

export function shouldOffloadDocumentBuild(rawText: string) {
  return rawText.length >= DOCUMENT_MODEL_WORKER_THRESHOLD;
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

        worker.onmessage = (
          event: MessageEvent<
            | { ok: true; document: ReturnType<typeof buildDocumentModel> }
            | { ok: false; message: string }
          >,
        ) => {
          worker.terminate();

          if (!event.data.ok) {
            reject(new Error(event.data.message));
            return;
          }

          resolve(event.data.document);
        };

        worker.onerror = () => {
          worker.terminate();
          resolve(buildDocumentModel(input));
        };

        worker.postMessage(input);
      }),
  );

  return {
    document,
    processingMode: "worker",
  };
}

"use client";

import {
  startTransition,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import {
  createEmptyFileStatus,
  createFileReadyStatus,
  createLargePdfStatus,
  createMissingContentStatus,
  createReadingFileStatus,
  createRemainingWaitLabel,
  createSavingStatus,
  createSelectionErrorStatus,
  createStructuringStatus,
  createSubmissionErrorStatus,
  createUnsupportedTypeStatus,
  createUploadFlowSteps,
  createUploadQuotaStatus,
  deriveSubmissionProgressPercent,
  estimateDocumentReadyWait,
  formatDurationRange,
  getFirstTransferFile,
  getSubmissionProgressWidthClass,
  hasTransferFiles,
  legacyDocErrorCopy,
  type PasteSourceKind,
  type SelectedFileSummary,
  type SubmissionProgressState,
  type UploadStatusMessage,
} from "@/components/upload/upload-panel-helpers";
import { UploadPanelView } from "@/components/upload/upload-panel-view";
import {
  saveDocument,
  saveDocumentAsset,
  saveSession,
} from "@/db/repositories";
import { useLocale } from "@/components/layout/locale-provider";
import {
  getRecommendedMode,
  getRecommendedPreferences,
} from "@/features/reader/engine/presets";
import {
  detectPastedTextSourceKind,
  detectDocumentSourceKind,
  isLegacyWordDocument,
} from "@/features/ingest/detect/file-kind";
import { toDocumentRecord } from "@/features/ingest/build/document-model";
import {
  buildDocumentModelAsync,
  shouldOffloadDocumentBuild,
} from "@/features/ingest/build/document-model-client";
import { deriveDocumentComplexityHints } from "@/features/ingest/build/document-complexity-hints";
import {
  extractDocumentFromFileAsync,
  isPdfTooLargeForBrowser,
  shouldOffloadPdfExtraction,
} from "@/features/ingest/extract/file-text-client";
import { createDocumentComplexityNotice } from "@/lib/document-complexity";
import { getLocalizedCopy } from "@/lib/locale";
import {
  freeFileUploadLimit,
  getEffectivePlanTier,
  getFileUploadLimit,
  getRemainingFileUploads,
} from "@/lib/plans";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ensureProfile,
  getGuestFileUploadCount,
  incrementGuestFileUploadCount,
  incrementProfileFileUploadCount,
  upsertCloudDocuments,
  upsertCloudSessions,
} from "@/lib/supabase/library-sync";
import { useReaderStore } from "@/state/reader-store";
import type { DocumentBlockInput, DocumentSourceKind } from "@/types/document";

export function UploadPanel() {
  const router = useRouter();
  const { locale } = useLocale();
  const { profile, refreshProfile, user } = useSupabaseAuth();
  const savedReadingGoal = useReaderStore(
    (state) => state.preferences.readingGoal,
  );
  const [inputMode, setInputMode] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pasteSourceKind, setPasteSourceKind] =
    useState<PasteSourceKind>("plain-text");
  const [hasManualPasteSourceKind, setHasManualPasteSourceKind] =
    useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFileSummary>();
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(
    null,
  );
  const [selectedSourceKind, setSelectedSourceKind] =
    useState<DocumentSourceKind>("plain-text");
  const [structuredSourceBlocks, setStructuredSourceBlocks] =
    useState<DocumentBlockInput[]>();
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<UploadStatusMessage>();
  const [submissionProgress, setSubmissionProgress] =
    useState<SubmissionProgressState>();
  const [submissionElapsedMs, setSubmissionElapsedMs] = useState(0);
  const [guestFileUploadCount, setGuestFileUploadCount] = useState(0);
  const [isFileDragActive, setIsFileDragActive] = useState(false);

  const clearImportedFile = () => {
    setSelectedFile(undefined);
    setSelectedUploadFile(null);
    setSelectedSourceKind("plain-text");
    setStructuredSourceBlocks(undefined);
    setContent("");
    setSubmissionProgress(undefined);
    setSubmissionElapsedMs(0);
  };

  const resetFileInput = () => {
    setFileInputKey((currentValue) => currentValue + 1);
  };

  const handleInputModeChange = (value: "paste" | "file") => {
    setInputMode(value);

    if (value === "paste") {
      clearImportedFile();
      setPasteSourceKind("plain-text");
      setHasManualPasteSourceKind(false);
      setStatusMessage(undefined);
    }
  };

  const handleClear = () => {
    setTitle("");
    clearImportedFile();
    setStatusMessage(undefined);
    resetFileInput();
  };

  const handleContentChange = (value: string) => {
    setContent(value);

    if (inputMode === "file") {
      setStructuredSourceBlocks(undefined);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFileSelection(event.target.files?.[0] ?? null).finally(() => {
      resetFileInput();
    });
  };

  const handleContainerDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (isBusy || !hasTransferFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    setIsFileDragActive(true);
  };

  const handleContainerDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isBusy || !hasTransferFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = isFileUploadAvailable() ? "copy" : "none";

    if (!isFileDragActive) {
      setIsFileDragActive(true);
    }
  };

  const handleContainerDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setIsFileDragActive(false);
  };

  const handleContainerDrop = (event: DragEvent<HTMLDivElement>) => {
    const file = getFirstTransferFile(event.dataTransfer);

    if (isBusy || !file) {
      setIsFileDragActive(false);
      return;
    }

    event.preventDefault();
    void handleExternalFileSelection(file);
  };

  const handleContainerPasteCapture = (
    event: ClipboardEvent<HTMLDivElement>,
  ) => {
    const file = getFirstTransferFile(event.clipboardData);

    if (isBusy || !file) {
      return;
    }

    event.preventDefault();
    void handleExternalFileSelection(file);
  };

  const isBusy = isReadingFile || isSubmitting;
  const detectedPasteSourceKind = useMemo(
    () => detectPastedTextSourceKind(content),
    [content],
  );
  const effectivePasteSourceKind =
    inputMode === "paste" && !hasManualPasteSourceKind
      ? detectedPasteSourceKind
      : pasteSourceKind;
  const recommendedReaderStart = useMemo(() => {
    if (!savedReadingGoal) {
      return undefined;
    }

    const isPdfRecommendation =
      inputMode === "file" && selectedSourceKind === "pdf";
    const recommendedMode = getRecommendedMode(savedReadingGoal);
    const recommendedPreferences = getRecommendedPreferences(savedReadingGoal);
    const goalLabel = getLocalizedCopy(locale, {
      en:
        savedReadingGoal === "study-carefully"
          ? "Study carefully"
          : savedReadingGoal === "read-faster"
            ? "Read faster"
            : savedReadingGoal === "skim-overview"
              ? "Skim for overview"
              : "Practice focus",
      es:
        savedReadingGoal === "study-carefully"
          ? "Estudiar con calma"
          : savedReadingGoal === "read-faster"
            ? "Leer más rápido"
            : savedReadingGoal === "skim-overview"
              ? "Vista general"
              : "Practicar concentración",
      pt:
        savedReadingGoal === "study-carefully"
          ? "Estudar com calma"
          : savedReadingGoal === "read-faster"
            ? "Ler mais rapido"
            : savedReadingGoal === "skim-overview"
              ? "Ler por panorama"
              : "Praticar foco",
    });
    const modeLabel = getLocalizedCopy(locale, {
      en:
        isPdfRecommendation
          ? "Browser PDF + Classic Reader"
          : recommendedMode === "focus-word"
            ? "Focus Word"
            : recommendedMode === "phrase-chunk"
              ? "Phrase Chunk"
              : recommendedMode === "guided-line"
                ? "Guided Line"
                : "Classic Reader",
      es:
        isPdfRecommendation
          ? "PDF en navegador + Lector clásico"
          : recommendedMode === "focus-word"
            ? "Foco por palabra"
            : recommendedMode === "phrase-chunk"
              ? "Bloques de frases"
              : recommendedMode === "guided-line"
                ? "Línea guiada"
                : "Lector clásico",
      pt:
        isPdfRecommendation
          ? "PDF no navegador + Leitor classico"
          : recommendedMode === "focus-word"
            ? "Palavra foco"
            : recommendedMode === "phrase-chunk"
              ? "Blocos de frases"
              : recommendedMode === "guided-line"
                ? "Linha guiada"
                : "Leitor classico",
    });

    return {
      goalLabel,
      modeLabel,
      paceLabel: isPdfRecommendation
        ? getLocalizedCopy(locale, {
            en: `Classic Reader at ${recommendedPreferences.wordsPerMinute} WPM`,
            es: `Lector clásico a ${recommendedPreferences.wordsPerMinute} ppm`,
            pt: `Leitor classico a ${recommendedPreferences.wordsPerMinute} ppm`,
          })
        : `${recommendedPreferences.wordsPerMinute} WPM`,
    };
  }, [inputMode, locale, savedReadingGoal, selectedSourceKind]);
  const showRecommendedReaderStart = Boolean(
    recommendedReaderStart && (content.trim().length > 0 || selectedFile),
  );
  const activePlanTier = getEffectivePlanTier(profile);
  const fileUploadPlanTier = user ? activePlanTier : "basic";
  const usedFileUploads = user
    ? (profile?.fileUploadCount ?? 0)
    : guestFileUploadCount;
  const fileUploadLimit = user
    ? getFileUploadLimit(fileUploadPlanTier)
    : freeFileUploadLimit;
  const remainingFileUploads = getRemainingFileUploads({
    planTier: fileUploadPlanTier,
    usedUploads: usedFileUploads,
  });

  useEffect(() => {
    if (user) {
      return;
    }

    let isMounted = true;

    void getGuestFileUploadCount().then((count) => {
      if (isMounted) {
        setGuestFileUploadCount(count);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!submissionProgress) {
      setSubmissionElapsedMs(0);
      return;
    }

    const updateElapsed = () => {
      setSubmissionElapsedMs(Date.now() - submissionProgress.startedAt);
    };

    updateElapsed();

    const intervalId = window.setInterval(updateElapsed, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [submissionProgress]);

  useEffect(() => {
    if (inputMode !== "paste" || content.trim()) {
      return;
    }

    setPasteSourceKind("plain-text");
    setHasManualPasteSourceKind(false);
  }, [content, inputMode]);

  const isFileUploadAvailable = () => {
    if (remainingFileUploads === null) {
      return true;
    }

    return remainingFileUploads > 0;
  };

  const handleFileSelection = async (file: File | null) => {
    if (!file) {
      clearImportedFile();
      setStatusMessage(undefined);
      return;
    }

    setStatusMessage(undefined);

    if (!isFileUploadAvailable()) {
      clearImportedFile();
      setStatusMessage(
        createUploadQuotaStatus({
          locale,
          planTier: fileUploadPlanTier,
        }),
      );
      return;
    }

    if (file.size === 0) {
      clearImportedFile();
      setStatusMessage(createEmptyFileStatus(locale));
      return;
    }

    if (isLegacyWordDocument(file.name, file.type)) {
      clearImportedFile();
      setStatusMessage({
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atención"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "Legacy .doc files are not supported"
            : locale === "es"
              ? "Los archivos .doc antiguos no son compatibles"
              : "Arquivos .doc antigos nao sao compativeis",
        detail: getLocalizedCopy(locale, legacyDocErrorCopy),
        nextStep:
          locale === "en"
            ? "Resave the document as .docx, then upload the new file."
            : locale === "es"
              ? "Guarda de nuevo el documento como .docx y luego sube el archivo nuevo."
              : "Salve o documento novamente como .docx e depois envie o novo arquivo.",
      });
      return;
    }

    const detectedSourceKind = detectDocumentSourceKind(file.name, file.type);
    if (!detectedSourceKind) {
      clearImportedFile();
      setStatusMessage(createUnsupportedTypeStatus(locale));
      return;
    }

    if (isPdfTooLargeForBrowser(file)) {
      clearImportedFile();
      setStatusMessage(createLargePdfStatus(locale, file));
      return;
    }

    setIsReadingFile(true);
    const shouldUseBackgroundExtraction =
      shouldOffloadPdfExtraction(file) && typeof Worker !== "undefined";
    setStatusMessage(
      createReadingFileStatus(locale, file, shouldUseBackgroundExtraction),
    );

    try {
      const { payload: extracted, processingMode } =
        await extractDocumentFromFileAsync(file, {
          onPdfProgress: (progress) => {
            setStatusMessage(
              createReadingFileStatus(
                locale,
                file,
                shouldUseBackgroundExtraction,
                progress,
              ),
            );
          },
        });
      const nextSelectedFile = {
        name: file.name,
        size: file.size,
        sourceKind: extracted.sourceKind,
      } satisfies SelectedFileSummary;

      setSelectedFile(nextSelectedFile);
      setSelectedUploadFile(file);
      setSelectedSourceKind(extracted.sourceKind);
      setStructuredSourceBlocks(extracted.sourceBlocks);
      setContent(extracted.rawText);
      if (!title.trim()) {
        setTitle(extracted.title);
      }
      setStatusMessage(
        createFileReadyStatus(
          locale,
          nextSelectedFile,
          shouldOffloadDocumentBuild(extracted.rawText) ||
            processingMode === "worker",
        ),
      );
    } catch (selectionError) {
      clearImportedFile();
      setStatusMessage(createSelectionErrorStatus(locale, selectionError));
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleExternalFileSelection = async (file: File | null) => {
    setInputMode("file");
    setIsFileDragActive(false);
    setPasteSourceKind("plain-text");
    setHasManualPasteSourceKind(false);

    try {
      await handleFileSelection(file);
    } finally {
      resetFileInput();
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setStatusMessage(createMissingContentStatus(locale));
      return;
    }

    if (inputMode === "file" && !isFileUploadAvailable()) {
      setStatusMessage(
        createUploadQuotaStatus({
          locale,
          planTier: fileUploadPlanTier,
        }),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const sourceKind =
        inputMode === "file" ? selectedSourceKind : effectivePasteSourceKind;
      const willOffloadBuild = shouldOffloadDocumentBuild(trimmed);
      const waitEstimate = estimateDocumentReadyWait({
        fileSize: selectedFile?.size,
        rawTextLength: trimmed.length,
        sourceKind,
        willOffloadBuild,
      });

      setSubmissionProgress({
        stage: "structuring",
        startedAt: Date.now(),
        estimatedMinMs: waitEstimate.minMs,
        estimatedMaxMs: waitEstimate.maxMs,
        sourceKind,
      });
      setStatusMessage(createStructuringStatus(locale, willOffloadBuild));

      const { document } = await buildDocumentModelAsync({
        title,
        rawText: trimmed,
        sourceBlocks: inputMode === "file" ? structuredSourceBlocks : undefined,
        sourceKind,
      });

      setSubmissionProgress((currentProgress) =>
        currentProgress
          ? { ...currentProgress, stage: "saving" }
          : currentProgress,
      );
      setStatusMessage(createSavingStatus(locale));

      const supabase = getSupabaseBrowserClient();
      const ownerId = user?.id;
      const record = {
        ...toDocumentRecord(document),
        ownerId,
        syncState: "local-only" as const,
      };
      const session = {
        id: `${document.id}:session`,
        documentId: document.id,
        currentChunkIndex: 0,
        currentTokenIndex: 0,
        currentParagraphIndex: 0,
        currentSectionIndex: 0,
        anchorText: document.chunks[0]?.text,
        ownerId,
        percentComplete: 0,
        syncState: "local-only" as const,
        textPresentation:
          sourceKind === "markdown" ? ("clean" as const) : undefined,
        updatedAt: new Date().toISOString(),
      };

      const assetSavePromise =
        sourceKind === "pdf" && selectedUploadFile
          ? saveDocumentAsset({
              blob: selectedUploadFile,
              documentId: document.id,
              fileName: selectedUploadFile.name,
              size: selectedUploadFile.size,
              sourceKind,
            })
          : Promise.resolve(undefined);

      await Promise.all([
        saveDocument(record),
        saveSession(session),
        assetSavePromise,
      ]);

      if (inputMode === "file") {
        if (ownerId && supabase) {
          try {
            await incrementProfileFileUploadCount(supabase, ownerId);
            await refreshProfile();
          } catch (uploadCountError) {
            console.warn(
              "profile upload count could not be updated",
              uploadCountError,
            );
          }
        } else {
          const nextGuestUploadCount = await incrementGuestFileUploadCount();
          setGuestFileUploadCount(nextGuestUploadCount);
        }
      }

      if (ownerId && supabase) {
        try {
          await ensureProfile(supabase, ownerId);
          await Promise.all([
            upsertCloudDocuments(supabase, ownerId, [record]),
            upsertCloudSessions(supabase, ownerId, [session]),
          ]);
          await Promise.all([
            saveDocument({
              ...record,
              ownerId,
              syncState: "synced",
            }),
            saveSession({
              ...session,
              ownerId,
              syncState: "synced",
            }),
          ]);
        } catch (syncError) {
          console.warn("document sync after upload failed", syncError);
        }
      }

      startTransition(() => {
        router.push(`/reader?document=${document.id}`);
      });
    } catch (submissionError) {
      setStatusMessage(createSubmissionErrorStatus(locale, submissionError));
      setSubmissionProgress(undefined);
      setSubmissionElapsedMs(0);
      setIsSubmitting(false);
      return;
    }

    setSubmissionProgress(undefined);
    setSubmissionElapsedMs(0);
    setIsSubmitting(false);
  };

  const uploadFlowSteps = createUploadFlowSteps(locale, {
    inputMode,
    isReadingFile,
    isSubmitting,
    hasSelectedFile: Boolean(selectedFile),
  });

  const showFileSuccessActions =
    inputMode === "file" &&
    selectedFile &&
    statusMessage?.tone === "success" &&
    !isBusy;

  const showPdfFormattingNotice =
    inputMode === "file" &&
    selectedSourceKind === "pdf" &&
    content.trim().length > 0;

  const previewSourceKind =
    inputMode === "file" ? selectedSourceKind : effectivePasteSourceKind;
  const previewComplexityHints = useMemo(() => {
    if (!content.trim()) {
      return [];
    }

    return deriveDocumentComplexityHints({
      rawText: content,
      sourceKind: previewSourceKind,
    });
  }, [content, previewSourceKind]);
  const previewComplexityNotice = useMemo(
    () => createDocumentComplexityNotice(locale, previewComplexityHints),
    [locale, previewComplexityHints],
  );

  const showFileTitleField =
    inputMode === "paste" || Boolean(selectedFile) || content.trim().length > 0;

  const submissionProgressPercent = submissionProgress
    ? deriveSubmissionProgressPercent(submissionProgress, submissionElapsedMs)
    : 0;

  const submissionProgressWidthClass = getSubmissionProgressWidthClass(
    submissionProgressPercent,
  );

  const submissionStageLabel = submissionProgress
    ? submissionProgress.stage === "structuring"
      ? locale === "en"
        ? "Structuring the reading model"
        : locale === "es"
          ? "Estructurando el modelo de lectura"
          : "Estruturando o modelo de leitura"
      : locale === "en"
        ? "Saving the document on this device"
        : locale === "es"
          ? "Guardando el documento en este dispositivo"
          : "Salvando o documento neste dispositivo"
    : undefined;

  const submissionEstimateLabel = submissionProgress
    ? formatDurationRange(
        locale,
        submissionProgress.estimatedMinMs,
        submissionProgress.estimatedMaxMs,
      )
    : undefined;

  const submissionRemainingLabel = submissionProgress
    ? createRemainingWaitLabel(
        locale,
        submissionElapsedMs,
        submissionProgress.estimatedMinMs,
        submissionProgress.estimatedMaxMs,
      )
    : undefined;

  return (
    <UploadPanelView
      content={content}
      effectivePasteSourceKind={effectivePasteSourceKind}
      fileInputKey={fileInputKey}
      fileUploadLimit={fileUploadLimit}
      fileUploadPlanName={fileUploadPlanTier === "focus" ? "Focus" : "Basic"}
      inputMode={inputMode}
      isBusy={isBusy}
      isFileDragActive={isFileDragActive}
      isReadingFile={isReadingFile}
      isSubmitting={isSubmitting}
      locale={locale}
      pasteSourceKind={pasteSourceKind}
      previewComplexityNotice={previewComplexityNotice}
      recommendedReaderStart={recommendedReaderStart}
      remainingFileUploads={remainingFileUploads}
      selectedFile={selectedFile}
      selectedSourceKind={selectedSourceKind}
      statusMessage={statusMessage}
      submissionElapsedMs={submissionElapsedMs}
      submissionEstimateLabel={submissionEstimateLabel}
      submissionProgress={submissionProgress}
      submissionProgressWidthClass={submissionProgressWidthClass}
      submissionRemainingLabel={submissionRemainingLabel}
      submissionStageLabel={submissionStageLabel}
      title={title}
      uploadFlowSteps={uploadFlowSteps}
      onClear={handleClear}
      onContainerDragEnter={handleContainerDragEnter}
      onContainerDragLeave={handleContainerDragLeave}
      onContainerDragOver={handleContainerDragOver}
      onContainerDrop={handleContainerDrop}
      onContainerPasteCapture={handleContainerPasteCapture}
      onContentChange={handleContentChange}
      onFileInputChange={handleFileInputChange}
      onInputModeChange={handleInputModeChange}
      onPasteSourceKindChange={(value) => {
        setPasteSourceKind(value);
        setHasManualPasteSourceKind(true);
      }}
      onSubmit={() => {
        void handleSubmit();
      }}
      onTitleChange={setTitle}
    />
  );
}

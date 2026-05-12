"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEventHandler,
  type ClipboardEventHandler,
  type DragEventHandler,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  FileUp,
  LoaderCircle,
  PencilLine,
  Sparkles,
} from "lucide-react";

import {
  chooseSupportedFileCopy,
  formatDuration,
  formatFileSize,
  formatSourceKind,
  maxBrowserPdfMb,
  pasteFormatLabelCopy,
  pasteFormatOptions,
  pdfBestResultsCopy,
  pdfFormattingNoteCopy,
  supportedFileSummaryCopy,
  supportedTypes,
  uploadFailureReasons,
  whyFilesFailTitleCopy,
  type PasteSourceKind,
  type SelectedFileSummary,
  type SubmissionProgressState,
  type UploadFlowStep,
  type UploadStatusMessage,
} from "@/components/upload/upload-panel-helpers";
import type { AppLocale } from "@/lib/locale";
import { getLocalizedCopy } from "@/lib/locale";
import type { DocumentSourceKind } from "@/types/document";

type InputMode = "paste" | "file";

interface ComplexityNotice {
  description: string;
  items: string[];
  title: string;
}

interface RecommendedReaderStart {
  goalLabel: string;
  modeLabel: string;
  wordsPerMinute: number;
}

interface UploadPanelViewProps {
  content: string;
  effectivePasteSourceKind: PasteSourceKind;
  fileInputKey: number;
  fileUploadLimit: number | null;
  fileUploadPlanName: string;
  inputMode: InputMode;
  isBusy: boolean;
  isFileDragActive: boolean;
  isReadingFile: boolean;
  isSubmitting: boolean;
  locale: AppLocale;
  pasteSourceKind: PasteSourceKind;
  previewComplexityNotice?: ComplexityNotice;
  recommendedReaderStart?: RecommendedReaderStart;
  remainingFileUploads: number | null;
  selectedFile?: SelectedFileSummary;
  selectedSourceKind: DocumentSourceKind;
  statusMessage?: UploadStatusMessage;
  submissionElapsedMs: number;
  submissionEstimateLabel?: string;
  submissionProgress?: SubmissionProgressState;
  submissionProgressWidthClass: string;
  submissionRemainingLabel?: string;
  submissionStageLabel?: string;
  title: string;
  uploadFlowSteps: UploadFlowStep[];
  onClear: () => void;
  onContainerDragEnter: DragEventHandler<HTMLDivElement>;
  onContainerDragLeave: DragEventHandler<HTMLDivElement>;
  onContainerDragOver: DragEventHandler<HTMLDivElement>;
  onContainerDrop: DragEventHandler<HTMLDivElement>;
  onContainerPasteCapture: ClipboardEventHandler<HTMLDivElement>;
  onContentChange: (value: string) => void;
  onFileInputChange: ChangeEventHandler<HTMLInputElement>;
  onInputModeChange: (value: InputMode) => void;
  onPasteSourceKindChange: (value: PasteSourceKind) => void;
  onSubmit: () => void;
  onTitleChange: (value: string) => void;
}

const modeOptions = [
  {
    value: "file" as const,
    title: {
      en: "Upload a document",
      es: "Subir un documento",
      pt: "Enviar um documento",
    },
    description: {
      en: "Bring in a PDF, DOCX, RTF, or Markdown file and keep everything on-device.",
      es: "Sube un PDF, DOCX, RTF o Markdown y mantén todo en este dispositivo.",
      pt: "Traga um PDF, DOCX, RTF ou Markdown e mantenha tudo neste dispositivo.",
    },
    icon: FileText,
    accentClass: "text-(--accent-sky)",
  },
  {
    value: "paste" as const,
    title: {
      en: "Paste text instantly",
      es: "Pegar texto",
      pt: "Colar texto na hora",
    },
    description: {
      en: "Drop in article text, notes, or a draft and start reading without any setup.",
      es: "Pega un artículo, notas o un borrador y empieza a leer sin configuración extra.",
      pt: "Cole texto de um artigo, notas ou rascunho e comece a ler sem configuracao extra.",
    },
    icon: Sparkles,
    accentClass: "text-(--accent-amber)",
  },
];

export function UploadPanelView({
  content,
  effectivePasteSourceKind,
  fileInputKey,
  fileUploadLimit,
  fileUploadPlanName,
  inputMode,
  isBusy,
  isFileDragActive,
  isReadingFile,
  isSubmitting,
  locale,
  pasteSourceKind,
  previewComplexityNotice,
  recommendedReaderStart,
  remainingFileUploads,
  selectedFile,
  selectedSourceKind,
  statusMessage,
  submissionElapsedMs,
  submissionEstimateLabel,
  submissionProgress,
  submissionProgressWidthClass,
  submissionRemainingLabel,
  submissionStageLabel,
  title,
  uploadFlowSteps,
  onClear,
  onContainerDragEnter,
  onContainerDragLeave,
  onContainerDragOver,
  onContainerDrop,
  onContainerPasteCapture,
  onContentChange,
  onFileInputChange,
  onInputModeChange,
  onPasteSourceKindChange,
  onSubmit,
  onTitleChange,
}: UploadPanelViewProps) {
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputMethodLabel =
    locale === "en"
      ? "Document input method"
      : locale === "es"
        ? "Método de entrada del documento"
        : "Metodo de entrada do documento";
  const [isPasteEditorExpanded, setIsPasteEditorExpanded] = useState(true);

  const showFileSuccessActions =
    inputMode === "file" &&
    Boolean(selectedFile) &&
    statusMessage?.tone === "success" &&
    !isBusy;
  const showFileTitleField =
    inputMode === "paste" || Boolean(selectedFile) || content.trim().length > 0;
  const showPdfFormattingNotice =
    inputMode === "file" &&
    selectedSourceKind === "pdf" &&
    content.trim().length > 0;
  const showRecommendedReaderStart = Boolean(
    recommendedReaderStart && (content.trim().length > 0 || selectedFile),
  );
  const documentContentLabel =
    inputMode === "file"
      ? locale === "en"
        ? "Extracted content preview"
        : locale === "es"
          ? "Vista previa del contenido extraído"
          : "Previa do conteudo extraido"
      : locale === "en"
        ? "Paste text"
        : locale === "es"
          ? "Pegar texto"
          : "Colar texto";
  const documentContentPlaceholder =
    inputMode === "file"
      ? getLocalizedCopy(locale, chooseSupportedFileCopy)
      : locale === "en"
        ? "Paste text here to create a local reading session"
        : locale === "es"
          ? "Pega texto aquí para crear una sesión local de lectura."
          : "Cole texto aqui para criar uma sessao de leitura local";
  const pasteEditorToggleLabel =
    locale === "en"
      ? isPasteEditorExpanded
        ? "Hide text area"
        : "Show text area"
      : locale === "es"
        ? isPasteEditorExpanded
            ? "Ocultar área de texto"
            : "Mostrar área de texto"
        : isPasteEditorExpanded
            ? "Ocultar área de texto"
            : "Mostrar área de texto";
  const pasteEditorCollapsedSummary =
    content.trim().length > 0
      ? locale === "en"
        ? `${content.trim().length} characters ready to open in the reader`
        : locale === "es"
          ? `${content.trim().length} caracteres listos para abrir en el lector`
          : `${content.trim().length} caracteres prontos para abrir no leitor`
      : documentContentPlaceholder;

  useEffect(() => {
    setIsPasteEditorExpanded(true);
  }, [inputMode]);

  useEffect(() => {
    if (inputMode === "paste" && content.trim().length > 0) {
      setIsPasteEditorExpanded(true);
    }
  }, [content, inputMode]);

  function togglePasteEditor() {
    setIsPasteEditorExpanded((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        requestAnimationFrame(() => {
          contentTextareaRef.current?.focus();
        });
      }

      return nextValue;
    });
  }

  const statusToneClassName =
    statusMessage?.tone === "error"
      ? "border-rose-400/30 bg-rose-500/10"
      : statusMessage?.tone === "success"
        ? "border-emerald-400/30 bg-emerald-500/10"
        : "border-(--border-soft) bg-(--surface-soft)";
  const statusIconClassName =
    statusMessage?.tone === "error"
      ? "text-rose-200"
      : statusMessage?.tone === "success"
        ? "text-emerald-200"
        : "animate-spin text-(--accent-sky)";
  const StatusIcon =
    statusMessage?.tone === "error"
      ? AlertTriangle
      : statusMessage?.tone === "success"
        ? CheckCircle2
        : LoaderCircle;

  return (
    <section id="upload-panel" className="fade-rise">
      <div
        className={`editorial-panel hover-lift rounded-[2rem] border bg-(--surface-card) p-6 shadow-[0_28px_110px_rgba(20,26,56,0.16)] backdrop-blur-xl transition sm:p-8 ${
          isFileDragActive
            ? "border-(--accent-sky) shadow-[0_0_0_1px_rgba(95,119,215,0.22),0_28px_110px_rgba(20,26,56,0.16)]"
            : "border-(--border-soft)"
        }`}
        onDragEnter={onContainerDragEnter}
        onDragOver={onContainerDragOver}
        onDragLeave={onContainerDragLeave}
        onDrop={onContainerDrop}
        onPasteCapture={onContainerPasteCapture}
      >
        <div
          className="grid gap-4 sm:grid-cols-2"
          role="radiogroup"
          aria-label={inputMethodLabel}
        >
          {modeOptions.map(
            ({ value, title: optionTitle, description, icon: Icon, accentClass }) => (
              <label
                key={value}
                className={`relative cursor-pointer rounded-[1.5rem] border p-5 text-left transition ${
                  inputMode === value
                    ? "border-(--accent-sky) bg-[linear-gradient(180deg,rgba(95,119,215,0.18),rgba(255,255,255,0.94))] shadow-[0_0_0_1px_rgba(95,119,215,0.2),0_18px_45px_rgba(95,119,215,0.14)] dark:bg-[linear-gradient(180deg,rgba(91,111,255,0.24),rgba(255,255,255,0.08))]"
                    : value === "file"
                      ? "border-dashed border-(--border-soft) bg-(--surface-strong) hover:border-(--border-strong) hover:bg-(--surface-soft)"
                      : "border-(--border-soft) bg-(--surface-soft) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                }`}
              >
                <input
                  type="radio"
                  name="input-mode"
                  value={value}
                  checked={inputMode === value}
                  disabled={isBusy}
                  aria-describedby={`input-mode-${value}`}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={() => onInputModeChange(value)}
                />
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    inputMode === value
                      ? "bg-white text-(--accent-sky) shadow-[0_10px_24px_rgba(95,119,215,0.18)] dark:bg-white/12"
                      : `bg-(--surface-chip) ${accentClass}`
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-(--text-strong)">
                  {getLocalizedCopy(locale, optionTitle)}
                </h3>
                <p
                  id={`input-mode-${value}`}
                  className="mt-2 text-sm leading-7 text-(--text-muted)"
                >
                  {getLocalizedCopy(locale, description)}
                </p>
              </label>
            ),
          )}
        </div>

        <div className="mt-8 grid gap-4">
          <p className="rounded-[1.2rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm leading-6 text-(--text-muted)">
            {locale === "en"
              ? "You can also drag a supported file into this import area or paste a copied file from your clipboard."
              : locale === "es"
                ? "También puedes arrastrar un archivo compatible a esta zona o pegar un archivo desde el portapapeles."
                : "Voce tambem pode arrastar um arquivo compativel para esta area de importacao ou colar um arquivo copiado da area de transferencia."}
          </p>

          {inputMode === "file" ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-4">
                {uploadFlowSteps.map((step, index) => (
                  <div
                    key={step.key}
                    className={`rounded-[1.2rem] border px-4 py-3 ${
                      step.state === "complete"
                        ? "border-emerald-400/35 bg-emerald-500/10"
                        : step.state === "current"
                          ? "border-(--accent-sky) bg-[linear-gradient(180deg,rgba(95,119,215,0.14),rgba(255,255,255,0.02))]"
                          : "border-(--border-soft) bg-(--surface-soft)"
                    }`}
                  >
                    <p className="text-xs font-semibold tracking-[0.18em] text-(--text-muted) uppercase">
                      {locale === "en"
                        ? `Step ${index + 1}`
                        : locale === "es"
                          ? `Paso ${index + 1}`
                          : `Etapa ${index + 1}`}
                    </p>
                    <p className="mt-2 text-sm font-medium text-(--text-strong)">
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>

              <label
                htmlFor={fileInputId}
                className={`group flex min-h-52 flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 py-8 text-center text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition ${
                  isBusy
                    ? "cursor-wait border-(--border-strong) bg-[linear-gradient(180deg,var(--surface-strong),var(--surface-soft))]"
                    : "cursor-pointer border-(--border-soft) bg-[linear-gradient(180deg,var(--surface-strong),var(--surface-soft))] hover:border-(--accent-sky) hover:shadow-[0_18px_50px_rgba(95,119,215,0.16)]"
                }`}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(95,119,215,0.18),rgba(213,138,83,0.16))] text-(--accent-sky) dark:bg-[linear-gradient(135deg,rgba(91,111,255,0.2),rgba(255,147,76,0.14))]">
                  {isReadingFile ? (
                    <LoaderCircle className="h-7 w-7 animate-spin" />
                  ) : (
                    <FileUp className="h-7 w-7" />
                  )}
                </span>
                <span className="mt-5 text-xl font-semibold text-(--text-strong)">
                  {isReadingFile
                    ? locale === "en"
                      ? "Processing your document"
                      : locale === "es"
                        ? "Procesando tu documento"
                        : "Processando seu documento"
                    : selectedFile
                      ? locale === "en"
                        ? `Ready: ${selectedFile.name}`
                        : locale === "es"
                          ? `Listo: ${selectedFile.name}`
                          : `Pronto: ${selectedFile.name}`
                      : locale === "en"
                        ? "Choose your document"
                        : locale === "es"
                          ? "Elige tu documento"
                          : "Escolha seu documento"}
                </span>
                <span className="mt-2 max-w-md text-sm leading-7 text-(--text-muted)">
                  {selectedFile
                    ? `${formatSourceKind(locale, selectedFile.sourceKind)} · ${formatFileSize(selectedFile.size)}`
                    : getLocalizedCopy(locale, supportedFileSummaryCopy)}
                </span>
                <span className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[linear-gradient(135deg,var(--accent-sky),color-mix(in_srgb,var(--accent-sky)_72%,var(--accent-amber)))] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(95,119,215,0.26)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_24px_54px_rgba(95,119,215,0.32)]">
                  {isReadingFile
                    ? locale === "en"
                      ? "Reading file..."
                      : locale === "es"
                        ? "Leyendo archivo..."
                        : "Lendo arquivo..."
                    : selectedFile
                      ? locale === "en"
                        ? "Replace file"
                        : locale === "es"
                          ? "Cambiar archivo"
                          : "Trocar arquivo"
                      : locale === "en"
                        ? "Upload file"
                        : locale === "es"
                          ? "Subir archivo"
                          : "Enviar arquivo"}
                </span>
                <span className="sr-only">
                  {getLocalizedCopy(locale, chooseSupportedFileCopy)}
                </span>
              </label>

              <div className="rounded-[1.4rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4">
                <p className="text-sm font-medium text-(--text-strong)">
                  {locale === "en"
                    ? "Supported formats: PDF, DOCX, RTF, Markdown, TXT"
                    : locale === "es"
                      ? "Formatos admitidos: PDF, DOCX, RTF, Markdown, TXT"
                      : "Formatos compativeis: PDF, DOCX, RTF, Markdown, TXT"}
                </p>
                <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                  {locale === "en"
                    ? `Best results come from PDFs with selectable text, up to ${maxBrowserPdfMb} MB.`
                    : locale === "es"
                      ? `Mejor con PDF con texto seleccionable, hasta ${maxBrowserPdfMb} MB.`
                      : `Os melhores resultados vem de PDFs com texto selecionavel, ate ${maxBrowserPdfMb} MB.`}
                </p>
                <p className="mt-2 text-sm leading-6 text-(--text-strong)">
                  {getLocalizedCopy(locale, pdfBestResultsCopy)}
                </p>
                <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                  {fileUploadLimit === null
                    ? locale === "en"
                      ? "Max includes unlimited file uploads."
                      : locale === "es"
                        ? "Max incluye cargas ilimitadas de archivos."
                        : "Max inclui uploads ilimitados de arquivo."
                    : locale === "en"
                      ? `${Math.max(0, remainingFileUploads ?? 0)} of ${fileUploadLimit} file uploads left on ${fileUploadPlanName}.`
                      : locale === "es"
                        ? `Te quedan ${Math.max(0, remainingFileUploads ?? 0)} de ${fileUploadLimit} cargas en ${fileUploadPlanName}.`
                        : `Restam ${Math.max(0, remainingFileUploads ?? 0)} de ${fileUploadLimit} uploads no ${fileUploadPlanName}.`}
                </p>
                <details className="mt-3 rounded-[1.1rem] border border-(--border-soft) bg-(--surface-card) px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-(--text-strong)">
                    <span>{getLocalizedCopy(locale, whyFilesFailTitleCopy)}</span>
                    <ChevronDown className="h-4 w-4 text-(--text-muted)" />
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-(--text-muted)">
                    {uploadFailureReasons.map((reason) => (
                      <li key={reason.en} className="flex gap-2">
                        <span className="text-(--accent-amber)">*</span>
                        <span>{getLocalizedCopy(locale, reason)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>

              <input
                key={fileInputKey}
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept=".pdf,.doc,.docx,.rtf,.md,.markdown,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,application/x-rtf,text/rtf,text/richtext,text/markdown,text/plain"
                disabled={isBusy}
                className="sr-only"
                onChange={onFileInputChange}
              />
            </div>
          ) : null}

          {inputMode === "paste" ? (
            <div className="grid gap-3">
              <p className="text-sm font-medium text-(--text-strong)">
                {getLocalizedCopy(locale, pasteFormatLabelCopy)}
              </p>
              <div
                className="grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label={getLocalizedCopy(locale, pasteFormatLabelCopy)}
              >
                {pasteFormatOptions.map(({ value, title: optionTitle, description }) => (
                  <label
                    key={value}
                    className={`relative cursor-pointer rounded-[1.35rem] border p-4 text-left transition ${
                      pasteSourceKind === value
                        ? "border-(--accent-sky) bg-[linear-gradient(180deg,rgba(95,119,215,0.14),rgba(255,255,255,0.02))] shadow-[0_0_0_1px_rgba(95,119,215,0.12)]"
                        : "border-(--border-soft) bg-(--surface-soft) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paste-source-kind"
                      value={value}
                      checked={effectivePasteSourceKind === value}
                      disabled={isBusy}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={() => onPasteSourceKindChange(value)}
                    />
                    <span className="text-sm font-semibold text-(--text-strong)">
                      {getLocalizedCopy(locale, optionTitle)}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-(--text-muted)">
                      {getLocalizedCopy(locale, description)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {showFileTitleField ? (
            <label
              className="grid gap-2 text-sm text-(--text-strong)"
              htmlFor="document-title"
            >
              {locale === "en"
                ? "Document title"
                : locale === "es"
                  ? "Título del documento"
                  : "Titulo do documento"}
              <input
                id="document-title"
                name="document-title"
                value={title}
                disabled={isBusy}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder={
                  locale === "en"
                    ? "Give this document a short name"
                    : locale === "es"
                      ? "Dale un nombre corto al documento"
                      : "Dê um nome curto ao documento"
                }
                className="rounded-2xl border border-(--border-soft) bg-(--surface-input) px-4 py-3 text-sm text-(--text-strong) outline-none placeholder:text-(--text-muted) focus:border-(--border-strong)"
              />
            </label>
          ) : null}

          {inputMode === "paste" ? (
            <div className="grid gap-2 text-sm text-(--text-strong)">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="document-content">{documentContentLabel}</label>
                <button
                  type="button"
                  onClick={togglePasteEditor}
                  className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs font-semibold tracking-[0.12em] text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  aria-controls="document-content"
                  aria-expanded={isPasteEditorExpanded}
                >
                  <span>{pasteEditorToggleLabel}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-(--text-muted) transition-transform ${
                      isPasteEditorExpanded ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>
              </div>

              {isPasteEditorExpanded ? (
                <textarea
                  ref={contentTextareaRef}
                  id="document-content"
                  name="document-content"
                  value={content}
                  disabled={isBusy}
                  onChange={(event) => onContentChange(event.target.value)}
                  placeholder={documentContentPlaceholder}
                  rows={8}
                  className="min-h-40 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-input) px-4 py-4 text-sm leading-7 text-(--text-strong) outline-none placeholder:text-(--text-muted) focus:border-(--border-strong)"
                />
              ) : (
                <button
                  type="button"
                  onClick={togglePasteEditor}
                  className="flex min-h-18 w-full items-center justify-between gap-3 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4 text-left transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                >
                  <span className="text-sm leading-6 text-(--text-muted)">
                    {pasteEditorCollapsedSummary}
                  </span>
                  <span className="text-xs font-semibold tracking-[0.18em] text-(--accent-sky) uppercase">
                    {locale === "en"
                      ? "Expand"
                      : locale === "es"
                        ? "Expandir"
                        : "Expandir"}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <label
              className="grid gap-2 text-sm text-(--text-strong)"
              htmlFor="document-content"
            >
              {documentContentLabel}
              <textarea
                ref={contentTextareaRef}
                id="document-content"
                name="document-content"
                value={content}
                disabled={isBusy}
                onChange={(event) => onContentChange(event.target.value)}
                placeholder={documentContentPlaceholder}
                rows={10}
                className="min-h-56 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-input) px-4 py-4 text-sm leading-7 text-(--text-strong) outline-none placeholder:text-(--text-muted) focus:border-(--border-strong)"
              />
            </label>
          )}

          {showPdfFormattingNotice ? (
            <div className="rounded-[1.4rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-(--accent-amber) uppercase">
                {locale === "en"
                  ? "PDF preview note"
                  : locale === "es"
                    ? "Nota sobre la vista previa del PDF"
                    : "Nota sobre a previa do PDF"}
              </p>
              <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                {getLocalizedCopy(locale, pdfFormattingNoteCopy)}
              </p>
            </div>
          ) : null}

          {previewComplexityNotice ? (
            <div className="rounded-[1.4rem] border border-amber-300/30 bg-amber-500/10 px-4 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-(--accent-amber) uppercase">
                {previewComplexityNotice.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                {previewComplexityNotice.description}
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-(--text-muted)">
                {previewComplexityNotice.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-(--accent-amber)">*</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {statusMessage && statusMessage.tone === "error" ? (
            <div
              role="alert"
              className={`rounded-[1.5rem] border px-4 py-4 ${statusToneClassName}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 ${statusIconClassName}`}>
                  <StatusIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-rose-200 uppercase">
                    {statusMessage.eyebrow}
                  </p>
                  <p className="text-sm font-semibold text-(--text-strong)">
                    {statusMessage.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-(--text-muted)">
                    {statusMessage.detail}
                  </p>
                  {statusMessage.nextStep ? (
                    <p className="mt-2 text-sm leading-6 text-(--text-strong)">
                      {statusMessage.nextStep}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {statusMessage && statusMessage.tone !== "error" ? (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-[1.5rem] border px-4 py-4 ${statusToneClassName}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 ${statusIconClassName}`}>
                  <StatusIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-(--accent-sky) uppercase">
                    {statusMessage.eyebrow}
                  </p>
                  <p className="text-sm font-semibold text-(--text-strong)">
                    {statusMessage.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-(--text-muted)">
                    {statusMessage.detail}
                  </p>
                  {statusMessage.nextStep ? (
                    <p className="mt-2 text-sm leading-6 text-(--text-strong)">
                      {statusMessage.nextStep}
                    </p>
                  ) : null}
                  {isSubmitting && submissionProgress ? (
                    <div className="mt-4 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold tracking-[0.18em] text-(--text-muted) uppercase">
                          {locale === "en"
                            ? "Estimated wait"
                            : locale === "es"
                              ? "Espera estimada"
                              : "Espera estimada"}
                        </p>
                        <p className="text-sm font-semibold text-(--text-strong)">
                          {submissionEstimateLabel}
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-(--surface-soft)">
                        <div
                          className={`h-full rounded-full bg-[linear-gradient(135deg,var(--accent-sky),color-mix(in_srgb,var(--accent-sky)_72%,var(--accent-amber)))] transition-[width] duration-700 ${submissionProgressWidthClass}`}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-(--text-muted)">
                        <span>
                          {locale === "en"
                            ? "Current step:"
                            : locale === "es"
                              ? "Paso actual:"
                              : "Etapa atual:"}{" "}
                          <span className="text-(--text-strong)">
                            {submissionStageLabel}
                          </span>
                        </span>
                        <span>
                          {locale === "en"
                            ? "Elapsed:"
                            : locale === "es"
                              ? "Transcurrido:"
                              : "Decorrido:"}{" "}
                          <span className="text-(--text-strong)">
                            {formatDuration(locale, submissionElapsedMs)}
                          </span>
                        </span>
                        <span className="text-(--text-strong)">
                          {submissionRemainingLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                        {submissionProgress.sourceKind === "pdf"
                          ? locale === "en"
                            ? "The first open is the slowest part because Leyendo still has to structure the PDF and save it on this device before the reader can launch."
                            : locale === "es"
                              ? "La primera apertura tarda más porque Leyendo aún debe estructurar el PDF y guardarlo en este dispositivo antes de abrir el lector."
                              : "A primeira abertura e a parte mais lenta porque o Leyendo ainda precisa estruturar o PDF e salva-lo neste dispositivo antes de abrir o leitor."
                          : locale === "en"
                            ? "The first open is slower because Leyendo still has to structure the text and save it on this device before the reader can launch."
                            : locale === "es"
                              ? "La primera apertura tarda más porque Leyendo aún debe estructurar el texto y guardarlo en este dispositivo antes de abrir el lector."
                              : "A primeira abertura e mais lenta porque o Leyendo ainda precisa estruturar o texto e salva-lo neste dispositivo antes de abrir o leitor."}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {showFileSuccessActions ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSubmit}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-sky),color-mix(in_srgb,var(--accent-sky)_68%,var(--accent-amber)))] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(95,119,215,0.26)]"
              >
                {locale === "en"
                  ? "Open imported file"
                  : locale === "es"
                    ? "Abrir archivo importado"
                    : "Abrir arquivo importado"}
              </button>
              <button
                type="button"
                onClick={() => {
                  contentTextareaRef.current?.focus();
                }}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                <PencilLine className="h-4 w-4" />
                {locale === "en"
                  ? "Edit extracted text"
                  : locale === "es"
                    ? "Editar texto extraído"
                    : "Editar texto extraido"}
              </button>
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="inline-flex min-h-12 items-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                {locale === "en"
                  ? "Replace file"
                  : locale === "es"
                    ? "Cambiar archivo"
                    : "Trocar arquivo"}
              </button>
            </div>
          ) : null}

          {showRecommendedReaderStart ? (
            <div className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-5 py-4">
              <p className="text-xs tracking-[0.18em] text-(--accent-sky) uppercase">
                {locale === "en"
                  ? "Recommended start"
                  : locale === "es"
                    ? "Inicio recomendado"
                    : "Inicio recomendado"}
              </p>
              <p className="mt-2 text-sm font-medium text-(--text-strong)">
                {recommendedReaderStart?.goalLabel}: {recommendedReaderStart?.modeLabel} · {recommendedReaderStart?.wordsPerMinute} WPM
              </p>
              <p className="mt-2 text-sm leading-7 text-(--text-muted)">
                {locale === "en"
                  ? "This goal is already saved. Open the reader and you can still switch modes or pacing whenever the document demands it."
                  : locale === "es"
                    ? "Este objetivo ya está guardado. Abre el lector y aún podrás cambiar el modo o el ritmo cuando lo necesites."
                    : "Este objetivo ja esta salvo. Abra o leitor e ainda sera possivel trocar modo ou ritmo quando o documento pedir."}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={onClear}
              className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              {locale === "en"
                ? "Clear"
                : locale === "es"
                  ? "Limpiar"
                  : "Limpar"}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onSubmit}
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,var(--accent-sky),color-mix(in_srgb,var(--accent-sky)_68%,var(--accent-amber)))] px-7 py-4 text-base font-semibold text-white shadow-[0_20px_46px_rgba(95,119,215,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgba(95,119,215,0.3)] disabled:opacity-60"
            >
              {isReadingFile
                ? locale === "en"
                  ? "Processing file..."
                  : locale === "es"
                    ? "Procesando archivo..."
                    : "Processando arquivo..."
                : isSubmitting
                  ? locale === "en"
                    ? "Preparing document..."
                    : locale === "es"
                      ? "Preparando documento..."
                      : "Preparando documento..."
                  : locale === "en"
                    ? "Open in reader"
                    : locale === "es"
                      ? "Abrir en el lector"
                      : "Abrir no leitor"}
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {supportedTypes.map((item) => (
            <span
              key={item.en}
              className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)"
            >
              {getLocalizedCopy(locale, item)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
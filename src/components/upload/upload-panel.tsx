"use client";

import { startTransition, useId, useState } from "react";
import { useRouter } from "next/navigation";

import { FileText, FileUp, Sparkles } from "lucide-react";

import { saveDocument, saveSession } from "@/db/repositories";
import { useLocale } from "@/components/layout/locale-provider";
import { isLegacyWordDocument } from "@/features/ingest/detect/file-kind";
import { toDocumentRecord } from "@/features/ingest/build/document-model";
import {
  buildDocumentModelAsync,
  shouldOffloadDocumentBuild,
} from "@/features/ingest/build/document-model-client";
import {
  extractDocumentFromFileAsync,
  isPdfTooLargeForBrowser,
  MAX_BROWSER_PDF_BYTES,
  shouldOffloadPdfExtraction,
} from "@/features/ingest/extract/file-text-client";
import { getLocalizedCopy } from "@/lib/locale";
import type { DocumentBlockInput, DocumentSourceKind } from "@/types/document";

const supportedTypes = [
  {
    en: "PDF with selectable text",
    es: "PDF con texto seleccionable",
    pt: "PDF com texto selecionavel",
  },
  { en: "DOCX", es: "DOCX", pt: "DOCX" },
  { en: "RTF", es: "RTF", pt: "RTF" },
  { en: "Markdown", es: "Markdown", pt: "Markdown" },
  { en: "Pasted text", es: "Texto pegado", pt: "Texto colado" },
];

const chooseSupportedFileCopy = {
  en: "Choose a PDF, DOCX, RTF, Markdown, or text file",
  es: "Elige un archivo PDF, DOCX, RTF, Markdown o de texto",
  pt: "Escolha um arquivo PDF, DOCX, RTF, Markdown ou texto",
};

const supportedFileSummaryCopy = {
  en: "PDF, DOCX, RTF, Markdown, and text files supported.",
  es: "Compatible con PDF, DOCX, RTF, Markdown y archivos de texto.",
  pt: "Compativel com PDF, DOCX, RTF, Markdown e arquivos de texto.",
};

const legacyDocErrorCopy = {
  en: "Legacy .doc files are not supported yet. Save the document as .docx, then upload it.",
  es: "Los archivos .doc antiguos aun no son compatibles. Guarda el documento como .docx y luego subelo.",
  pt: "Arquivos .doc antigos ainda nao sao compativeis. Salve o documento como .docx e depois envie-o.",
};

const maxBrowserPdfMb = Math.round(MAX_BROWSER_PDF_BYTES / 1_000_000);

const oversizedPdfErrorCopy = {
  en: `This PDF is too large to process reliably in the browser. The current limit is ${maxBrowserPdfMb} MB. Try a smaller PDF or split it into sections.`,
  es: `Este PDF es demasiado grande para procesarlo de forma confiable en el navegador. El limite actual es de ${maxBrowserPdfMb} MB. Prueba con un PDF mas pequeno o dividelo en secciones.`,
  pt: `Este PDF e grande demais para ser processado com confianca no navegador. O limite atual e de ${maxBrowserPdfMb} MB. Tente um PDF menor ou divida-o em secoes.`,
};

export function UploadPanel() {
  const router = useRouter();
  const { locale } = useLocale();
  const fileInputId = useId();
  const [inputMode, setInputMode] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string>();
  const [selectedSourceKind, setSelectedSourceKind] =
    useState<DocumentSourceKind>("plain-text");
  const [structuredSourceBlocks, setStructuredSourceBlocks] =
    useState<DocumentBlockInput[]>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [processingMessage, setProcessingMessage] = useState<string>();

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
        es: "Trae un PDF, DOCX, RTF o Markdown y manten todo en este dispositivo.",
        pt: "Traga um PDF, DOCX, RTF ou Markdown e mantenha tudo neste dispositivo.",
      },
      icon: FileText,
      accentClass: "text-(--accent-sky)",
    },
    {
      value: "paste" as const,
      title: {
        en: "Paste text instantly",
        es: "Pegar texto al instante",
        pt: "Colar texto na hora",
      },
      description: {
        en: "Drop in article text, notes, or a draft and start reading without any setup.",
        es: "Pega texto de un articulo, notas o un borrador y empieza a leer sin configuracion extra.",
        pt: "Cole texto de um artigo, notas ou rascunho e comece a ler sem configuracao extra.",
      },
      icon: Sparkles,
      accentClass: "text-(--accent-amber)",
    },
  ];

  const handleFileSelection = async (file: File | null) => {
    if (!file) {
      setSelectedFileName(undefined);
      setSelectedSourceKind("plain-text");
      setStructuredSourceBlocks(undefined);
      setContent("");
      return;
    }

    setError(undefined);
    if (isLegacyWordDocument(file.name, file.type)) {
      setSelectedFileName(undefined);
      setSelectedSourceKind("plain-text");
      setStructuredSourceBlocks(undefined);
      setContent("");
      setProcessingMessage(undefined);
      setError(getLocalizedCopy(locale, legacyDocErrorCopy));
      return;
    }

    if (isPdfTooLargeForBrowser(file)) {
      setSelectedFileName(undefined);
      setSelectedSourceKind("plain-text");
      setStructuredSourceBlocks(undefined);
      setContent("");
      setProcessingMessage(undefined);
      setError(getLocalizedCopy(locale, oversizedPdfErrorCopy));
      return;
    }

    setProcessingMessage(
      shouldOffloadPdfExtraction(file)
        ? locale === "en"
          ? "Large PDF detected. Extracting text off the main thread..."
          : locale === "es"
            ? "PDF grande detectado. Extrayendo texto fuera del hilo principal..."
            : "PDF grande detectado. Extraindo texto fora da thread principal..."
        : locale === "en"
          ? "Extracting readable text..."
          : locale === "es"
            ? "Extrayendo texto legible..."
            : "Extraindo texto legivel...",
    );

    try {
      const { payload: extracted, processingMode } =
        await extractDocumentFromFileAsync(file);
      setSelectedFileName(file.name);
      setSelectedSourceKind(extracted.sourceKind);
      setStructuredSourceBlocks(extracted.sourceBlocks);
      setContent(extracted.rawText);
      if (!title.trim()) {
        setTitle(extracted.title);
      }
      if (shouldOffloadDocumentBuild(extracted.rawText)) {
        setProcessingMessage(
          processingMode === "worker"
            ? locale === "en"
              ? "Large PDF extracted off the main thread. The reading model will also be built off the main thread when you open it."
              : locale === "es"
                ? "El PDF grande se extrajo fuera del hilo principal. El modelo de lectura tambien se preparara fuera del hilo principal al abrirlo."
                : "O PDF grande foi extraido fora da thread principal. O modelo de leitura tambem sera preparado fora da thread principal ao abri-lo."
            : locale === "en"
              ? "Large document detected. The reading model will be built off the main thread when you open it."
              : locale === "es"
                ? "Documento grande detectado. El modelo de lectura se preparara fuera del hilo principal al abrirlo."
                : "Documento grande detectado. O modelo de leitura sera preparado fora da thread principal ao abri-lo.",
        );
      } else {
        setProcessingMessage(undefined);
      }
    } catch (selectionError) {
      setSelectedFileName(undefined);
      setSelectedSourceKind("plain-text");
      setStructuredSourceBlocks(undefined);
      setContent("");
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : locale === "en"
            ? "Something went wrong while reading that file."
            : locale === "es"
              ? "Algo salio mal al leer ese archivo."
              : "Algo deu errado ao ler esse arquivo.",
      );
      setProcessingMessage(undefined);
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError(
        locale === "en"
          ? "Add some text or choose a supported file before opening the reader."
          : locale === "es"
            ? "Agrega texto o elige un archivo compatible antes de abrir el lector."
            : "Adicione texto ou escolha um arquivo compativel antes de abrir o leitor.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      setProcessingMessage(
        shouldOffloadDocumentBuild(trimmed)
          ? locale === "en"
            ? "Structuring the document off the main thread for a smoother import..."
            : locale === "es"
              ? "Estructurando el documento fuera del hilo principal para una importacion mas fluida..."
              : "Estruturando o documento fora da thread principal para uma importacao mais fluida..."
          : locale === "en"
            ? "Structuring the document..."
            : locale === "es"
              ? "Estructurando el documento..."
              : "Estruturando o documento...",
      );

      const { document, processingMode } = await buildDocumentModelAsync({
        title,
        rawText: trimmed,
        sourceBlocks: inputMode === "file" ? structuredSourceBlocks : undefined,
        sourceKind: inputMode === "file" ? selectedSourceKind : "plain-text",
      });

      setProcessingMessage(
        processingMode === "worker"
          ? locale === "en"
            ? "Large document prepared off the main thread. Saving locally..."
            : locale === "es"
              ? "Documento grande preparado fuera del hilo principal. Guardando localmente..."
              : "Documento grande preparado fora da thread principal. Salvando localmente..."
          : locale === "en"
            ? "Saving locally..."
            : locale === "es"
              ? "Guardando localmente..."
              : "Salvando localmente...",
      );

      const record = toDocumentRecord(document);
      const session = {
        id: `${document.id}:session`,
        documentId: document.id,
        currentChunkIndex: 0,
        currentTokenIndex: 0,
        currentParagraphIndex: 0,
        currentSectionIndex: 0,
        percentComplete: 0,
        updatedAt: new Date().toISOString(),
      };

      await saveDocument(record);
      await saveSession(session);

      startTransition(() => {
        router.push(`/reader?document=${document.id}`);
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : locale === "en"
            ? "Something went wrong while preparing the document."
            : locale === "es"
              ? "Algo salio mal al preparar el documento."
              : "Algo deu errado ao preparar o documento.",
      );
      setProcessingMessage(undefined);
      setIsSubmitting(false);
      return;
    }

    setProcessingMessage(undefined);
    setIsSubmitting(false);
  };

  return (
    <section
      id="upload-panel"
      aria-labelledby="upload-panel-title"
      className="fade-rise"
    >
      <div className="editorial-panel hover-lift rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_28px_110px_rgba(20,26,56,0.16)] backdrop-blur-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.28em] text-(--accent-sky) uppercase">
              {locale === "en"
                ? "Start with your document"
                : locale === "es"
                  ? "Empieza con tu documento"
                  : "Comece com seu documento"}
            </p>
            <h2
              id="upload-panel-title"
              className="font-heading mt-3 text-4xl leading-tight font-semibold text-(--text-strong)"
            >
              {locale === "en"
                ? "Paste the text you want to read faster, or upload the file and open the reader."
                : locale === "es"
                  ? "Pega el texto que quieres leer mas rapido o sube el archivo y abre el lector."
                  : "Cole o texto que quer ler mais rapido ou envie o arquivo e abra o leitor."}
            </h2>
          </div>
          <div className="rounded-2xl border border-(--border-soft) bg-(--surface-soft) p-3 text-(--accent-amber)">
            <FileUp className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-(--border-soft) bg-[linear-gradient(135deg,rgba(95,119,215,0.14),rgba(213,138,83,0.1))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:bg-[linear-gradient(135deg,rgba(91,111,255,0.12),rgba(255,147,76,0.08))]">
          <p className="text-sm font-medium text-(--text-strong)">
            {locale === "en"
              ? "Fastest path: choose a file below or paste text, then open the reader immediately with your progress saved locally."
              : locale === "es"
                ? "Ruta mas rapida: elige un archivo abajo o pega texto y abre el lector enseguida con progreso guardado localmente."
                : "Caminho mais rapido: escolha um arquivo abaixo ou cole texto e abra o leitor em seguida com progresso salvo localmente."}
          </p>
        </div>

        <div
          className="mt-8 grid gap-4 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Document input method"
        >
          {modeOptions.map(
            ({ value, title, description, icon: Icon, accentClass }) => (
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
                  aria-describedby={`input-mode-${value}`}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={() => {
                    setInputMode(value);
                    if (value === "paste") {
                      setSelectedFileName(undefined);
                      setSelectedSourceKind("plain-text");
                      setStructuredSourceBlocks(undefined);
                    }
                    setError(undefined);
                  }}
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
                  {getLocalizedCopy(locale, title)}
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
          <label
            className="grid gap-2 text-sm text-(--text-strong)"
            htmlFor="document-title"
          >
            {locale === "en"
              ? "Document title"
              : locale === "es"
                ? "Titulo del documento"
                : "Titulo do documento"}
            <input
              id="document-title"
              name="document-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
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

          {inputMode === "file" ? (
            <div className="grid gap-3">
              <label
                htmlFor={fileInputId}
                className="group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-(--border-soft) bg-[linear-gradient(180deg,var(--surface-strong),var(--surface-soft))] px-6 py-8 text-center text-sm text-(--text-muted) shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-(--accent-sky) hover:shadow-[0_18px_50px_rgba(95,119,215,0.16)]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(95,119,215,0.18),rgba(213,138,83,0.16))] text-(--accent-sky) dark:bg-[linear-gradient(135deg,rgba(91,111,255,0.2),rgba(255,147,76,0.14))]">
                  <FileUp className="h-7 w-7" />
                </span>
                <span className="mt-5 text-xl font-semibold text-(--text-strong)">
                  {selectedFileName
                    ? `Selected: ${selectedFileName}`
                    : locale === "en"
                      ? "Choose your document"
                      : locale === "es"
                        ? "Elige tu documento"
                        : "Escolha seu documento"}
                </span>
                <span className="mt-2 max-w-md text-sm leading-7 text-(--text-muted)">
                  {getLocalizedCopy(locale, supportedFileSummaryCopy)}
                </span>
                <span className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[linear-gradient(135deg,var(--accent-sky),color-mix(in_srgb,var(--accent-sky)_72%,var(--accent-amber)))] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(95,119,215,0.26)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_24px_54px_rgba(95,119,215,0.32)]">
                  {locale === "en"
                    ? "Upload file"
                    : locale === "es"
                      ? "Subir archivo"
                      : "Enviar arquivo"}
                </span>
                <span className="sr-only">
                  {getLocalizedCopy(locale, chooseSupportedFileCopy)}
                </span>
              </label>
              <input
                id={fileInputId}
                type="file"
                accept=".pdf,.doc,.docx,.rtf,.md,.markdown,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,application/x-rtf,text/rtf,text/richtext,text/markdown,text/plain"
                className="sr-only"
                onChange={(event) => {
                  void handleFileSelection(event.target.files?.[0] ?? null);
                }}
              />
            </div>
          ) : null}

          <label
            className="grid gap-2 text-sm text-(--text-strong)"
            htmlFor="document-content"
          >
            {inputMode === "file"
              ? locale === "en"
                ? "Extracted content preview"
                : locale === "es"
                  ? "Vista previa del contenido extraido"
                  : "Previa do conteudo extraido"
              : locale === "en"
                ? "Paste text"
                : locale === "es"
                  ? "Pegar texto"
                  : "Colar texto"}
            <textarea
              id="document-content"
              name="document-content"
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                if (inputMode === "file") {
                  setStructuredSourceBlocks(undefined);
                }
              }}
              placeholder={
                inputMode === "file"
                  ? getLocalizedCopy(locale, chooseSupportedFileCopy)
                  : locale === "en"
                    ? "Paste text here to create a local reading session"
                    : locale === "es"
                      ? "Pega texto aqui para crear una sesion de lectura local"
                      : "Cole texto aqui para criar uma sessao de leitura local"
              }
              rows={10}
              className="min-h-56 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-input) px-4 py-4 text-sm leading-7 text-(--text-strong) outline-none placeholder:text-(--text-muted) focus:border-(--border-strong)"
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
            >
              {error}
            </p>
          ) : null}

          {processingMessage ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm text-(--text-strong)"
            >
              {processingMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTitle("");
                setContent("");
                setSelectedFileName(undefined);
                setSelectedSourceKind("plain-text");
                setStructuredSourceBlocks(undefined);
                setError(undefined);
                setProcessingMessage(undefined);
              }}
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
              disabled={isSubmitting}
              onClick={() => {
                void handleSubmit();
              }}
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,var(--accent-sky),color-mix(in_srgb,var(--accent-sky)_68%,var(--accent-amber)))] px-7 py-4 text-base font-semibold text-white shadow-[0_20px_46px_rgba(95,119,215,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgba(95,119,215,0.3)] disabled:opacity-60"
            >
              {isSubmitting
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

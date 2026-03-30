"use client";

import { startTransition, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

import { saveDocument, saveSession } from "@/db/repositories";
import { useLocale } from "@/components/layout/locale-provider";
import {
  detectDocumentSourceKind,
  isLegacyWordDocument,
} from "@/features/ingest/detect/file-kind";
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

const whyFilesFailTitleCopy = {
  en: "Why a file may fail",
  es: "Por que puede fallar un archivo",
  pt: "Por que um arquivo pode falhar",
};

const uploadFailureReasons = [
  {
    en: ".doc files need to be resaved as .docx before import.",
    es: "Los archivos .doc deben guardarse de nuevo como .docx antes de importar.",
    pt: "Arquivos .doc precisam ser salvos novamente como .docx antes da importacao.",
  },
  {
    en: "Scanned or image-only PDFs need OCR or a text-based export.",
    es: "Los PDF escaneados o solo con imagen necesitan OCR o una exportacion con texto.",
    pt: "PDFs digitalizados ou apenas com imagem precisam de OCR ou exportacao com texto.",
  },
  {
    en: `Selectable-text PDFs are supported up to ${maxBrowserPdfMb} MB.`,
    es: `Los PDF con texto seleccionable son compatibles hasta ${maxBrowserPdfMb} MB.`,
    pt: `PDFs com texto selecionavel sao compativeis ate ${maxBrowserPdfMb} MB.`,
  },
  {
    en: "Password-protected PDFs need to be unlocked before import.",
    es: "Los PDF protegidos con contrasena deben desbloquearse antes de importar.",
    pt: "PDFs protegidos por senha precisam ser desbloqueados antes da importacao.",
  },
  {
    en: "Multi-column pages, tables, forms, footnotes, headers, and page numbers may import with rough formatting.",
    es: "Las paginas con varias columnas, tablas, formularios, notas al pie, encabezados y numeros de pagina pueden importarse con formato irregular.",
    pt: "Paginas com varias colunas, tabelas, formularios, notas de rodape, cabecalhos e numeros de pagina podem ser importadas com formatacao irregular.",
  },
  {
    en: "Unsupported formats such as ZIP or CSV need to be converted first.",
    es: "Los formatos no compatibles como ZIP o CSV deben convertirse primero.",
    pt: "Formatos nao compativeis como ZIP ou CSV precisam ser convertidos primeiro.",
  },
];

const pdfBestResultsCopy = {
  en: "PDFs work best when they have selectable text, a simple single-column layout, and no password protection.",
  es: "Los PDF funcionan mejor cuando tienen texto seleccionable, una maquetacion simple de una sola columna y no tienen proteccion por contrasena.",
  pt: "PDFs funcionam melhor quando tem texto selecionavel, um layout simples de coluna unica e nao tem protecao por senha.",
};

const pdfFormattingNoteCopy = {
  en: "PDF import keeps the reading text, not the exact page layout. Columns, tables, forms, footnotes, headers, and page numbers may need cleanup before you open the reader.",
  es: "La importacion de PDF conserva el texto para leer, no el diseno exacto de la pagina. Las columnas, tablas, formularios, notas al pie, encabezados y numeros de pagina pueden necesitar limpieza antes de abrir el lector.",
  pt: "A importacao de PDF preserva o texto para leitura, nao o layout exato da pagina. Colunas, tabelas, formularios, notas de rodape, cabecalhos e numeros de pagina podem precisar de limpeza antes de abrir o leitor.",
};

interface UploadFlowStep {
  key: string;
  title: string;
  state: "pending" | "current" | "complete";
}

interface UploadStatusMessage {
  tone: "info" | "success" | "error";
  eyebrow: string;
  title: string;
  detail: string;
  nextStep?: string;
}

interface SubmissionProgressState {
  stage: "structuring" | "saving";
  startedAt: number;
  estimatedMinMs: number;
  estimatedMaxMs: number;
  sourceKind: DocumentSourceKind;
}

interface SelectedFileSummary {
  name: string;
  size: number;
  sourceKind: DocumentSourceKind;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) {
    const megabytes = bytes / 1_000_000;
    return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
  }

  if (bytes >= 1_000) {
    return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  }

  return `${bytes} B`;
}

function clampEstimatedWaitMs(value: number) {
  return Math.max(4_000, Math.min(90_000, value));
}

function estimateDocumentReadyWait(args: {
  fileSize?: number;
  rawTextLength: number;
  sourceKind: DocumentSourceKind;
  willOffloadBuild: boolean;
}) {
  const normalizedLength = Math.max(
    args.rawTextLength,
    args.sourceKind === "pdf"
      ? Math.round((args.fileSize ?? 0) * 0.45)
      : args.rawTextLength,
  );
  const minBase = args.sourceKind === "pdf" ? 4_500 : 1_800;
  const maxBase = args.sourceKind === "pdf" ? 10_000 : 4_500;
  const workerMin = args.willOffloadBuild ? 2_500 : 1_000;
  const workerMax = args.willOffloadBuild ? 7_000 : 2_500;
  const minMs = clampEstimatedWaitMs(
    minBase +
      workerMin +
      Math.round(normalizedLength / (args.sourceKind === "pdf" ? 52 : 95)),
  );
  const unclampedMaxMs =
    maxBase +
    workerMax +
    Math.round(normalizedLength / (args.sourceKind === "pdf" ? 26 : 58));
  const maxMs = clampEstimatedWaitMs(Math.max(unclampedMaxMs, minMs + 4_000));

  return { minMs, maxMs };
}

function formatDuration(locale: "en" | "es" | "pt", durationMs: number) {
  const totalSeconds = Math.max(1, Math.ceil(durationMs / 1_000));

  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return locale === "en"
      ? `${minutes} min ${seconds} sec`
      : `${minutes} min ${seconds} s`;
  }

  return locale === "en" ? `${totalSeconds} sec` : `${totalSeconds} s`;
}

function formatDurationRange(
  locale: "en" | "es" | "pt",
  minMs: number,
  maxMs: number,
) {
  const minLabel = formatDuration(locale, minMs);
  const maxLabel = formatDuration(locale, maxMs);

  if (minLabel === maxLabel) {
    return minLabel;
  }

  return locale === "en"
    ? `${minLabel} to ${maxLabel}`
    : `${minLabel} a ${maxLabel}`;
}

function createRemainingWaitLabel(
  locale: "en" | "es" | "pt",
  elapsedMs: number,
  estimatedMinMs: number,
  estimatedMaxMs: number,
) {
  const remainingMinMs = Math.max(0, estimatedMinMs - elapsedMs);
  const remainingMaxMs = Math.max(0, estimatedMaxMs - elapsedMs);

  if (elapsedMs > estimatedMaxMs) {
    return locale === "en"
      ? "Longer than usual, still working."
      : locale === "es"
        ? "Esta tardando mas de lo normal, pero sigue trabajando."
        : "Esta demorando mais do que o normal, mas ainda esta processando.";
  }

  if (remainingMaxMs <= 0) {
    return locale === "en"
      ? "Almost done."
      : locale === "es"
        ? "Casi listo."
        : "Quase pronto.";
  }

  if (remainingMinMs <= 0) {
    const maxLabel = formatDuration(locale, remainingMaxMs);

    return locale === "en"
      ? `Under ${maxLabel} left.`
      : locale === "es"
        ? `Quedan menos de ${maxLabel}.`
        : `Faltam menos de ${maxLabel}.`;
  }

  return locale === "en"
    ? `${formatDurationRange(locale, remainingMinMs, remainingMaxMs)} left.`
    : locale === "es"
      ? `Quedan ${formatDurationRange(locale, remainingMinMs, remainingMaxMs)}.`
      : `Faltam ${formatDurationRange(locale, remainingMinMs, remainingMaxMs)}.`;
}

function deriveSubmissionProgressPercent(
  submissionProgress: SubmissionProgressState,
  elapsedMs: number,
) {
  const estimatedMidpointMs = Math.round(
    (submissionProgress.estimatedMinMs + submissionProgress.estimatedMaxMs) / 2,
  );
  const rawPercent = Math.round(
    (elapsedMs / Math.max(estimatedMidpointMs, 1_000)) * 100,
  );

  if (submissionProgress.stage === "saving") {
    return Math.max(86, Math.min(99, rawPercent));
  }

  return Math.max(8, Math.min(94, rawPercent));
}

function getSubmissionProgressWidthClass(progressPercent: number) {
  if (progressPercent >= 98) {
    return "w-[98%]";
  }

  if (progressPercent >= 94) {
    return "w-[94%]";
  }

  if (progressPercent >= 90) {
    return "w-[90%]";
  }

  if (progressPercent >= 80) {
    return "w-[80%]";
  }

  if (progressPercent >= 70) {
    return "w-[70%]";
  }

  if (progressPercent >= 60) {
    return "w-[60%]";
  }

  if (progressPercent >= 50) {
    return "w-[50%]";
  }

  if (progressPercent >= 40) {
    return "w-[40%]";
  }

  if (progressPercent >= 30) {
    return "w-[30%]";
  }

  if (progressPercent >= 20) {
    return "w-[20%]";
  }

  if (progressPercent >= 12) {
    return "w-[12%]";
  }

  return "w-[8%]";
}

function formatSourceKind(
  locale: "en" | "es" | "pt",
  sourceKind: DocumentSourceKind,
) {
  if (sourceKind === "pdf") {
    return "PDF";
  }

  if (sourceKind === "docx") {
    return "DOCX";
  }

  if (sourceKind === "rtf") {
    return "RTF";
  }

  if (sourceKind === "markdown") {
    return "Markdown";
  }

  return locale === "en" ? "TXT" : locale === "es" ? "TXT" : "TXT";
}

function createUnsupportedTypeStatus(
  locale: "en" | "es" | "pt",
): UploadStatusMessage {
  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atencion"
          : "Precisa de atencao",
    title:
      locale === "en"
        ? "That file format is not supported"
        : locale === "es"
          ? "Ese formato de archivo no es compatible"
          : "Esse formato de arquivo nao e compativel",
    detail:
      locale === "en"
        ? "Upload a PDF, DOCX, RTF, Markdown, or TXT file. Legacy .doc files need to be resaved as .docx first."
        : locale === "es"
          ? "Sube un archivo PDF, DOCX, RTF, Markdown o TXT. Los archivos .doc antiguos deben guardarse primero como .docx."
          : "Envie um arquivo PDF, DOCX, RTF, Markdown ou TXT. Arquivos .doc antigos precisam ser salvos primeiro como .docx.",
    nextStep:
      locale === "en"
        ? "Convert the file to a supported format, then try again."
        : locale === "es"
          ? "Convierte el archivo a un formato compatible y vuelve a intentarlo."
          : "Converta o arquivo para um formato compativel e tente novamente.",
  };
}

function createEmptyFileStatus(
  locale: "en" | "es" | "pt",
): UploadStatusMessage {
  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atencion"
          : "Precisa de atencao",
    title:
      locale === "en"
        ? "That file is empty"
        : locale === "es"
          ? "Ese archivo esta vacio"
          : "Esse arquivo esta vazio",
    detail:
      locale === "en"
        ? "Choose a file that contains readable text, or paste the text directly."
        : locale === "es"
          ? "Elige un archivo que tenga texto legible o pega el texto directamente."
          : "Escolha um arquivo com texto legivel ou cole o texto diretamente.",
    nextStep:
      locale === "en"
        ? "Pick another file or switch to pasted text."
        : locale === "es"
          ? "Elige otro archivo o cambia a texto pegado."
          : "Escolha outro arquivo ou troque para texto colado.",
  };
}

function createLargePdfStatus(
  locale: "en" | "es" | "pt",
  file: Pick<File, "size">,
): UploadStatusMessage {
  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atencion"
          : "Precisa de atencao",
    title:
      locale === "en"
        ? "This PDF is above the current upload limit"
        : locale === "es"
          ? "Este PDF supera el limite actual de carga"
          : "Este PDF ultrapassa o limite atual de upload",
    detail:
      locale === "en"
        ? `PDFs with selectable text are supported up to ${maxBrowserPdfMb} MB. This file is ${formatFileSize(file.size)}.`
        : locale === "es"
          ? `Los PDF con texto seleccionable son compatibles hasta ${maxBrowserPdfMb} MB. Este archivo pesa ${formatFileSize(file.size)}.`
          : `PDFs com texto selecionavel sao compativeis ate ${maxBrowserPdfMb} MB. Este arquivo tem ${formatFileSize(file.size)}.`,
    nextStep:
      locale === "en"
        ? "Split the PDF into smaller sections or export only the pages you need."
        : locale === "es"
          ? "Divide el PDF en secciones mas pequenas o exporta solo las paginas que necesitas."
          : "Divida o PDF em secoes menores ou exporte apenas as paginas de que precisa.",
  };
}

function createReadingFileStatus(
  locale: "en" | "es" | "pt",
  file: Pick<File, "name">,
  isLargePdf: boolean,
): UploadStatusMessage {
  return {
    tone: "info",
    eyebrow:
      locale === "en"
        ? "Import in progress"
        : locale === "es"
          ? "Importacion en curso"
          : "Importacao em andamento",
    title:
      locale === "en"
        ? `Processing ${file.name}`
        : locale === "es"
          ? `Procesando ${file.name}`
          : `Processando ${file.name}`,
    detail: isLargePdf
      ? locale === "en"
        ? "Large PDF detected. Leyendo is extracting the text off the main thread to keep the page responsive."
        : locale === "es"
          ? "Se detecto un PDF grande. Leyendo esta extrayendo el texto fuera del hilo principal para mantener la pagina fluida."
          : "PDF grande detectado. O Leyendo esta extraindo o texto fora da thread principal para manter a pagina responsiva."
      : locale === "en"
        ? "Leyendo is reading the file locally and pulling out the text preview now."
        : locale === "es"
          ? "Leyendo esta leyendo el archivo localmente y extrayendo ahora la vista previa del texto."
          : "O Leyendo esta lendo o arquivo localmente e extraindo agora a previa do texto.",
    nextStep:
      locale === "en"
        ? "Keep this tab open while the preview is prepared."
        : locale === "es"
          ? "Manten esta pestana abierta mientras se prepara la vista previa."
          : "Mantenha esta aba aberta enquanto a previa e preparada.",
  };
}

function createFileReadyStatus(
  locale: "en" | "es" | "pt",
  file: SelectedFileSummary,
  willOffloadBuild: boolean,
): UploadStatusMessage {
  const sourceLabel = formatSourceKind(locale, file.sourceKind);
  const pdfFormattingNote =
    file.sourceKind === "pdf"
      ? locale === "en"
        ? " PDF layout is simplified in the preview, so review the extracted text before opening the reader."
        : locale === "es"
          ? " El diseno del PDF se simplifica en la vista previa, asi que revisa el texto extraido antes de abrir el lector."
          : " O layout do PDF e simplificado na previa, entao revise o texto extraido antes de abrir o leitor."
      : "";

  return {
    tone: "success",
    eyebrow:
      locale === "en"
        ? "Review ready"
        : locale === "es"
          ? "Revision lista"
          : "Revisao pronta",
    title:
      locale === "en"
        ? `${file.name} is ready`
        : locale === "es"
          ? `${file.name} esta listo`
          : `${file.name} esta pronto`,
    detail: willOffloadBuild
      ? locale === "en"
        ? `${sourceLabel} at ${formatFileSize(file.size)} imported. Review the text below, then Leyendo will finish structuring the document off the main thread when you open it.${pdfFormattingNote}`
        : locale === "es"
          ? `${sourceLabel} de ${formatFileSize(file.size)} importado. Revisa el texto abajo y Leyendo terminara de estructurar el documento fuera del hilo principal al abrirlo.${pdfFormattingNote}`
          : `${sourceLabel} com ${formatFileSize(file.size)} importado. Revise o texto abaixo e o Leyendo terminara de estruturar o documento fora da thread principal ao abri-lo.${pdfFormattingNote}`
      : locale === "en"
        ? `${sourceLabel} at ${formatFileSize(file.size)} imported. Review or edit the text below, then open it in the reader.${pdfFormattingNote}`
        : locale === "es"
          ? `${sourceLabel} de ${formatFileSize(file.size)} importado. Revisa o edita el texto abajo y luego abrelo en el lector.${pdfFormattingNote}`
          : `${sourceLabel} com ${formatFileSize(file.size)} importado. Revise ou edite o texto abaixo e depois abra no leitor.${pdfFormattingNote}`,
    nextStep:
      locale === "en"
        ? "Next: edit the extracted text if needed, or open it in the reader."
        : locale === "es"
          ? "Siguiente: edita el texto extraido si hace falta o abrelo en el lector."
          : "Proximo: edite o texto extraido se precisar ou abra no leitor.",
  };
}

function createStructuringStatus(
  locale: "en" | "es" | "pt",
  willOffloadBuild: boolean,
): UploadStatusMessage {
  return {
    tone: "info",
    eyebrow:
      locale === "en"
        ? "Preparing reader"
        : locale === "es"
          ? "Preparando el lector"
          : "Preparando o leitor",
    title:
      locale === "en"
        ? "Preparing your document"
        : locale === "es"
          ? "Preparando tu documento"
          : "Preparando seu documento",
    detail: willOffloadBuild
      ? locale === "en"
        ? "Large document detected. Leyendo is structuring the reading model off the main thread before saving it locally."
        : locale === "es"
          ? "Se detecto un documento grande. Leyendo esta estructurando el modelo de lectura fuera del hilo principal antes de guardarlo localmente."
          : "Documento grande detectado. O Leyendo esta estruturando o modelo de leitura fora da thread principal antes de salva-lo localmente."
      : locale === "en"
        ? "Leyendo is structuring the text into a reading model now."
        : locale === "es"
          ? "Leyendo esta estructurando el texto en un modelo de lectura."
          : "O Leyendo esta estruturando o texto em um modelo de leitura.",
    nextStep:
      locale === "en"
        ? "The reader will open automatically when this step finishes."
        : locale === "es"
          ? "El lector se abrira automaticamente cuando termine este paso."
          : "O leitor sera aberto automaticamente quando esta etapa terminar.",
  };
}

function createSavingStatus(locale: "en" | "es" | "pt"): UploadStatusMessage {
  return {
    tone: "info",
    eyebrow:
      locale === "en"
        ? "Opening reader"
        : locale === "es"
          ? "Abriendo el lector"
          : "Abrindo o leitor",
    title:
      locale === "en"
        ? "Saving locally"
        : locale === "es"
          ? "Guardando localmente"
          : "Salvando localmente",
    detail:
      locale === "en"
        ? "Leyendo is saving the document on this device and opening the reader."
        : locale === "es"
          ? "Leyendo esta guardando el documento en este dispositivo y abriendo el lector."
          : "O Leyendo esta salvando o documento neste dispositivo e abrindo o leitor.",
    nextStep:
      locale === "en"
        ? "You will move into the reader in a moment."
        : locale === "es"
          ? "Entraras al lector en un momento."
          : "Voce entrara no leitor em instantes.",
  };
}

function createMissingContentStatus(
  locale: "en" | "es" | "pt",
): UploadStatusMessage {
  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atencion"
          : "Precisa de atencao",
    title:
      locale === "en"
        ? "Add text or choose a file first"
        : locale === "es"
          ? "Agrega texto o elige un archivo primero"
          : "Adicione texto ou escolha um arquivo primeiro",
    detail:
      locale === "en"
        ? "Paste some text or import a supported file before opening the reader."
        : locale === "es"
          ? "Pega texto o importa un archivo compatible antes de abrir el lector."
          : "Cole texto ou importe um arquivo compativel antes de abrir o leitor.",
    nextStep:
      locale === "en"
        ? "Start by uploading a file or pasting text below."
        : locale === "es"
          ? "Empieza subiendo un archivo o pegando texto abajo."
          : "Comece enviando um arquivo ou colando texto abaixo.",
  };
}

function createSubmissionErrorStatus(
  locale: "en" | "es" | "pt",
  error: unknown,
): UploadStatusMessage {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (
      normalizedMessage.includes("taking too long to prepare") ||
      normalizedMessage.includes(
        "preparing it for the reader is taking too long",
      )
    ) {
      return {
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atencion"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "The text imported, but reader preparation is taking too long"
            : locale === "es"
              ? "El texto se importo, pero la preparacion del lector esta tardando demasiado"
              : "O texto foi importado, mas a preparacao do leitor esta demorando demais",
        detail:
          locale === "en"
            ? "This usually means the PDF is very long or the extracted layout is complex enough that the browser cannot finish structuring it quickly."
            : locale === "es"
              ? "Esto suele significar que el PDF es muy largo o que el diseno extraido es lo bastante complejo como para que el navegador no termine de estructurarlo con rapidez."
              : "Isso normalmente significa que o PDF e muito longo ou que o layout extraido e complexo o suficiente para que o navegador nao consiga estruturalo rapidamente.",
        nextStep:
          locale === "en"
            ? "Try a shorter PDF, remove appendix pages, or paste only the section you need to read right now."
            : locale === "es"
              ? "Prueba con un PDF mas corto, elimina paginas de apendices o pega solo la seccion que necesitas leer ahora."
              : "Tente um PDF menor, remova paginas de apendices ou cole apenas a secao que precisa ler agora.",
      };
    }
  }

  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atencion"
          : "Precisa de atencao",
    title:
      locale === "en"
        ? "Leyendo could not prepare that document"
        : locale === "es"
          ? "Leyendo no pudo preparar ese documento"
          : "O Leyendo nao conseguiu preparar esse documento",
    detail:
      error instanceof Error
        ? error.message
        : locale === "en"
          ? "Something went wrong while preparing the document."
          : locale === "es"
            ? "Algo salio mal al preparar el documento."
            : "Algo deu errado ao preparar o documento.",
    nextStep:
      locale === "en"
        ? "Try again or replace the file if the issue continues."
        : locale === "es"
          ? "Vuelve a intentarlo o cambia el archivo si el problema continua."
          : "Tente novamente ou troque o arquivo se o problema continuar.",
  };
}

function createSelectionErrorStatus(
  locale: "en" | "es" | "pt",
  error: unknown,
): UploadStatusMessage {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (
      normalizedMessage.includes("password") ||
      normalizedMessage.includes("encrypted")
    ) {
      return {
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atencion"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "This PDF is locked"
            : locale === "es"
              ? "Este PDF esta bloqueado"
              : "Este PDF esta bloqueado",
        detail:
          locale === "en"
            ? "Password-protected or encrypted PDFs cannot be read until they are unlocked."
            : locale === "es"
              ? "Los PDF protegidos con contrasena o cifrados no se pueden leer hasta que se desbloqueen."
              : "PDFs protegidos por senha ou criptografados nao podem ser lidos antes de serem desbloqueados.",
        nextStep:
          locale === "en"
            ? "Open the PDF in another app, remove the protection, and upload the unlocked copy."
            : locale === "es"
              ? "Abre el PDF en otra aplicacion, quita la proteccion y sube la copia desbloqueada."
              : "Abra o PDF em outro app, remova a protecao e envie a copia desbloqueada.",
      };
    }

    if (
      normalizedMessage.includes("invalid pdf") ||
      normalizedMessage.includes("malformed") ||
      normalizedMessage.includes("missingpdf") ||
      normalizedMessage.includes("unexpected response")
    ) {
      return {
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atencion"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "This PDF looks damaged or unsupported"
            : locale === "es"
              ? "Este PDF parece danado o no compatible"
              : "Este PDF parece danificado ou nao compativel",
        detail:
          locale === "en"
            ? "The browser could not read the PDF structure cleanly."
            : locale === "es"
              ? "El navegador no pudo leer la estructura del PDF con claridad."
              : "O navegador nao conseguiu ler a estrutura do PDF corretamente.",
        nextStep:
          locale === "en"
            ? "Re-export the PDF from the original document or print it again as a fresh PDF, then retry."
            : locale === "es"
              ? "Vuelve a exportar el PDF desde el documento original o imprimelo otra vez como PDF nuevo y luego reintentalo."
              : "Exporte o PDF novamente a partir do documento original ou imprima-o outra vez como um PDF novo e tente de novo.",
      };
    }

    if (normalizedMessage.includes("no selectable text")) {
      return {
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atencion"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "This PDF does not contain selectable text"
            : locale === "es"
              ? "Este PDF no contiene texto seleccionable"
              : "Este PDF nao contem texto selecionavel",
        detail:
          locale === "en"
            ? "Scanned or image-only PDFs are not supported yet. Run OCR first or export a text-based PDF."
            : locale === "es"
              ? "Los PDF escaneados o solo con imagen no son compatibles aun. Ejecuta OCR primero o exporta un PDF con texto."
              : "PDFs digitalizados ou somente com imagem ainda nao sao compativeis. Rode OCR primeiro ou exporte um PDF com texto.",
        nextStep:
          locale === "en"
            ? "Run OCR on the PDF or export a version with selectable text."
            : locale === "es"
              ? "Ejecuta OCR en el PDF o exporta una version con texto seleccionable."
              : "Rode OCR no PDF ou exporte uma versao com texto selecionavel.",
      };
    }

    if (normalizedMessage.includes("taking too long to process")) {
      return {
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atencion"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "This PDF is taking too long to process"
            : locale === "es"
              ? "Este PDF esta tardando demasiado en procesarse"
              : "Este PDF esta demorando demais para ser processado",
        detail:
          locale === "en"
            ? "Try a smaller file, split the PDF into sections, or paste the text directly."
            : locale === "es"
              ? "Prueba con un archivo mas pequeno, divide el PDF en secciones o pega el texto directamente."
              : "Tente um arquivo menor, divida o PDF em secoes ou cole o texto diretamente.",
        nextStep:
          locale === "en"
            ? "Use a shorter PDF or import only the relevant pages."
            : locale === "es"
              ? "Usa un PDF mas corto o importa solo las paginas relevantes."
              : "Use um PDF menor ou importe apenas as paginas relevantes.",
      };
    }

    if (
      normalizedMessage.includes("couldn't extract readable text") ||
      normalizedMessage.includes("couldn't extract any readable text")
    ) {
      return {
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atencion"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "Leyendo could not extract readable text"
            : locale === "es"
              ? "Leyendo no pudo extraer texto legible"
              : "O Leyendo nao conseguiu extrair texto legivel",
        detail:
          locale === "en"
            ? "Make sure the file actually contains text and is not empty, image-only, or export-corrupted."
            : locale === "es"
              ? "Asegurate de que el archivo realmente contenga texto y no este vacio, solo con imagenes o dañado al exportar."
              : "Garanta que o arquivo realmente contenha texto e nao esteja vazio, apenas com imagens ou corrompido na exportacao.",
        nextStep:
          locale === "en"
            ? "Check the file contents, then re-export it as a text-based format."
            : locale === "es"
              ? "Comprueba el contenido del archivo y vuelve a exportarlo en un formato basado en texto."
              : "Verifique o conteudo do arquivo e exporte-o novamente em um formato com texto.",
      };
    }

    if (normalizedMessage.includes("couldn't read that rtf file")) {
      return {
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atencion"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "Leyendo could not read that RTF file"
            : locale === "es"
              ? "Leyendo no pudo leer ese archivo RTF"
              : "O Leyendo nao conseguiu ler esse arquivo RTF",
        detail:
          locale === "en"
            ? "Try exporting it again as RTF, DOCX, Markdown, or TXT."
            : locale === "es"
              ? "Prueba exportarlo de nuevo como RTF, DOCX, Markdown o TXT."
              : "Tente exporta-lo novamente como RTF, DOCX, Markdown ou TXT.",
        nextStep:
          locale === "en"
            ? "Re-export the document and upload the new file."
            : locale === "es"
              ? "Vuelve a exportar el documento y sube el archivo nuevo."
              : "Exporte o documento novamente e envie o novo arquivo.",
      };
    }
  }

  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atencion"
          : "Precisa de atencao",
    title:
      locale === "en"
        ? "Leyendo could not process that file"
        : locale === "es"
          ? "Leyendo no pudo procesar ese archivo"
          : "O Leyendo nao conseguiu processar esse arquivo",
    detail:
      error instanceof Error
        ? error.message
        : locale === "en"
          ? "Something went wrong while reading that file."
          : locale === "es"
            ? "Algo salio mal al leer ese archivo."
            : "Algo deu errado ao ler esse arquivo.",
    nextStep:
      locale === "en"
        ? "Try again or choose a different file."
        : locale === "es"
          ? "Vuelve a intentarlo o elige otro archivo."
          : "Tente novamente ou escolha outro arquivo.",
  };
}

function createUploadFlowSteps(
  locale: "en" | "es" | "pt",
  options: {
    inputMode: "paste" | "file";
    isReadingFile: boolean;
    isSubmitting: boolean;
    hasSelectedFile: boolean;
  },
): UploadFlowStep[] {
  if (options.inputMode !== "file") {
    return [];
  }

  const labels =
    locale === "en"
      ? ["Choose file", "Extract text", "Review result", "Open reader"]
      : locale === "es"
        ? [
            "Elegir archivo",
            "Extraer texto",
            "Revisar resultado",
            "Abrir lector",
          ]
        : [
            "Escolher arquivo",
            "Extrair texto",
            "Revisar resultado",
            "Abrir leitor",
          ];

  return labels.map((title, index) => {
    let state: UploadFlowStep["state"] = "pending";

    if (options.isSubmitting) {
      state = index < 3 ? "complete" : "current";
    } else if (options.isReadingFile) {
      state = index === 0 ? "complete" : index === 1 ? "current" : "pending";
    } else if (options.hasSelectedFile) {
      state = index < 2 ? "complete" : index === 2 ? "current" : "pending";
    } else {
      state = index === 0 ? "current" : "pending";
    }

    return {
      key: title,
      title,
      state,
    };
  });
}

export function UploadPanel() {
  const router = useRouter();
  const { locale } = useLocale();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputMode, setInputMode] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<SelectedFileSummary>();
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

  const clearImportedFile = () => {
    setSelectedFile(undefined);
    setSelectedSourceKind("plain-text");
    setStructuredSourceBlocks(undefined);
    setContent("");
    setSubmissionProgress(undefined);
    setSubmissionElapsedMs(0);
  };

  const resetFileInput = () => {
    setFileInputKey((currentValue) => currentValue + 1);
  };

  const isBusy = isReadingFile || isSubmitting;

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

  const handleFileSelection = async (file: File | null) => {
    if (!file) {
      clearImportedFile();
      setStatusMessage(undefined);
      return;
    }

    setStatusMessage(undefined);

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
              ? "Necesita atencion"
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
    setStatusMessage(
      createReadingFileStatus(locale, file, shouldOffloadPdfExtraction(file)),
    );

    try {
      const { payload: extracted, processingMode } =
        await extractDocumentFromFileAsync(file);
      const nextSelectedFile = {
        name: file.name,
        size: file.size,
        sourceKind: extracted.sourceKind,
      } satisfies SelectedFileSummary;

      setSelectedFile(nextSelectedFile);
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

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setStatusMessage(createMissingContentStatus(locale));
      return;
    }

    setIsSubmitting(true);

    try {
      const sourceKind =
        inputMode === "file" ? selectedSourceKind : "plain-text";
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

      await Promise.all([saveDocument(record), saveSession(session)]);

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
    <section id="upload-panel" className="fade-rise">
      <div className="editorial-panel hover-lift rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_28px_110px_rgba(20,26,56,0.16)] backdrop-blur-xl sm:p-8">
        <div
          className="grid gap-4 sm:grid-cols-2"
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
                  disabled={isBusy}
                  aria-describedby={`input-mode-${value}`}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={() => {
                    setInputMode(value);
                    if (value === "paste") {
                      setSelectedFile(undefined);
                      setSelectedSourceKind("plain-text");
                      setStructuredSourceBlocks(undefined);
                      setStatusMessage(undefined);
                    }
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
                      ? "Formatos compatibles: PDF, DOCX, RTF, Markdown, TXT"
                      : "Formatos compativeis: PDF, DOCX, RTF, Markdown, TXT"}
                </p>
                <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                  {locale === "en"
                    ? `Best results come from PDFs with selectable text, up to ${maxBrowserPdfMb} MB.`
                    : locale === "es"
                      ? `Los mejores resultados llegan con PDF que tienen texto seleccionable, hasta ${maxBrowserPdfMb} MB.`
                      : `Os melhores resultados vem de PDFs com texto selecionavel, ate ${maxBrowserPdfMb} MB.`}
                </p>
                <p className="mt-2 text-sm leading-6 text-(--text-strong)">
                  {getLocalizedCopy(locale, pdfBestResultsCopy)}
                </p>
                <details className="mt-3 rounded-[1.1rem] border border-(--border-soft) bg-(--surface-card) px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-(--text-strong)">
                    <span>
                      {getLocalizedCopy(locale, whyFilesFailTitleCopy)}
                    </span>
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
                onChange={(event) => {
                  void handleFileSelection(
                    event.target.files?.[0] ?? null,
                  ).finally(() => {
                    resetFileInput();
                  });
                }}
              />
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
                  ? "Titulo del documento"
                  : "Titulo do documento"}
              <input
                id="document-title"
                name="document-title"
                value={title}
                disabled={isBusy}
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
              ref={contentTextareaRef}
              id="document-content"
              name="document-content"
              value={content}
              disabled={isBusy}
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
                              ? "La primera apertura es la parte mas lenta porque Leyendo todavia tiene que estructurar el PDF y guardarlo en este dispositivo antes de abrir el lector."
                              : "A primeira abertura e a parte mais lenta porque o Leyendo ainda precisa estruturar o PDF e salva-lo neste dispositivo antes de abrir o leitor."
                          : locale === "en"
                            ? "The first open is slower because Leyendo still has to structure the text and save it on this device before the reader can launch."
                            : locale === "es"
                              ? "La primera apertura es mas lenta porque Leyendo todavia tiene que estructurar el texto y guardarlo en este dispositivo antes de abrir el lector."
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
                onClick={() => {
                  void handleSubmit();
                }}
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
                    ? "Editar texto extraido"
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setTitle("");
                clearImportedFile();
                setStatusMessage(undefined);
                resetFileInput();
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
              disabled={isBusy}
              onClick={() => {
                void handleSubmit();
              }}
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

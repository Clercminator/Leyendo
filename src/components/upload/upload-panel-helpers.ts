import { MAX_BROWSER_PDF_BYTES } from "@/features/ingest/extract/file-text-client";
import type { DocumentSourceKind } from "@/types/document";

export const supportedTypes = [
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

export const chooseSupportedFileCopy = {
  en: "Choose a PDF, DOCX, RTF, Markdown, or text file",
  es: "Elige un PDF, DOCX, RTF, Markdown o TXT",
  pt: "Escolha um arquivo PDF, DOCX, RTF, Markdown ou texto",
};

export const supportedFileSummaryCopy = {
  en: "PDF, DOCX, RTF, Markdown, and text files supported.",
  es: "Compatible con PDF, DOCX, RTF, Markdown y TXT.",
  pt: "Compativel com PDF, DOCX, RTF, Markdown e arquivos de texto.",
};

export const legacyDocErrorCopy = {
  en: "Legacy .doc files are not supported yet. Save the document as .docx, then upload it.",
  es: "Los archivos .doc aún no son compatibles. Guarda el documento como .docx y vuelve a subirlo.",
  pt: "Arquivos .doc antigos ainda nao sao compativeis. Salve o documento como .docx e depois envie-o.",
};

export const maxBrowserPdfMb = Math.round(MAX_BROWSER_PDF_BYTES / 1_000_000);

export const whyFilesFailTitleCopy = {
  en: "Why a file may fail",
  es: "Por qué puede fallar un archivo",
  pt: "Por que um arquivo pode falhar",
};

export const uploadFailureReasons = [
  {
    en: ".doc files need to be resaved as .docx before import.",
    es: "Los archivos .doc deben volver a guardarse como .docx antes de importar.",
    pt: "Arquivos .doc precisam ser salvos novamente como .docx antes da importacao.",
  },
  {
    en: "Scanned or image-only PDFs need OCR or a text-based export.",
    es: "Los PDF escaneados o solo con imagen necesitan OCR o una exportación con texto.",
    pt: "PDFs digitalizados ou apenas com imagem precisam de OCR ou exportacao com texto.",
  },
  {
    en: `Selectable-text PDFs are supported up to ${maxBrowserPdfMb} MB.`,
    es: `Los PDF con texto seleccionable son compatibles hasta ${maxBrowserPdfMb} MB.`,
    pt: `PDFs com texto selecionavel sao compativeis ate ${maxBrowserPdfMb} MB.`,
  },
  {
    en: "Password-protected PDFs need to be unlocked before import.",
    es: "Los PDF protegidos con contraseña deben desbloquearse antes de importar.",
    pt: "PDFs protegidos por senha precisam ser desbloqueados antes da importacao.",
  },
  {
    en: "Older browsers may need an update before PDF import works reliably.",
    es: "Los navegadores más antiguos pueden necesitar una actualización para que la importación de PDF funcione bien.",
    pt: "Navegadores mais antigos podem precisar de atualizacao para que a importacao de PDF funcione bem.",
  },
  {
    en: "Multi-column pages, tables, forms, footnotes, headers, and page numbers may import with rough formatting.",
    es: "Las páginas con varias columnas, tablas, formularios, notas al pie, encabezados y números de página pueden importarse con formato irregular.",
    pt: "Paginas com varias colunas, tabelas, formularios, notas de rodape, cabecalhos e numeros de pagina podem ser importadas com formatacao irregular.",
  },
  {
    en: "Unsupported formats such as ZIP or CSV need to be converted first.",
    es: "Los formatos no compatibles como ZIP o CSV deben convertirse primero.",
    pt: "Formatos nao compativeis como ZIP ou CSV precisam ser convertidos primeiro.",
  },
];

export const pdfBestResultsCopy = {
  en: "PDFs work best when they have selectable text, a simple single-column layout, and no password protection.",
  es: "Los PDF funcionan mejor con texto seleccionable, diseño simple de una sola columna y sin contraseña.",
  pt: "PDFs funcionam melhor quando tem texto selecionavel, um layout simples de coluna unica e nao tem protecao por senha.",
};

export const pdfFormattingNoteCopy = {
  en: "PDF import keeps the reading text, not the exact page layout. Columns, tables, forms, footnotes, headers, and page numbers may need cleanup before you open the reader.",
  es: "La importación de PDF conserva el texto de lectura, no el diseño exacto de la página. Las columnas, tablas, formularios, notas al pie, encabezados y números de página pueden necesitar limpieza antes de abrir el lector.",
  pt: "A importacao de PDF preserva o texto para leitura, nao o layout exato da pagina. Colunas, tabelas, formularios, notas de rodape, cabecalhos e numeros de pagina podem precisar de limpeza antes de abrir o leitor.",
};

export interface UploadFlowStep {
  key: string;
  title: string;
  state: "pending" | "current" | "complete";
}

export interface UploadStatusMessage {
  tone: "info" | "success" | "error";
  eyebrow: string;
  title: string;
  detail: string;
  nextStep?: string;
}

export interface SubmissionProgressState {
  stage: "structuring" | "saving";
  startedAt: number;
  estimatedMinMs: number;
  estimatedMaxMs: number;
  sourceKind: DocumentSourceKind;
}

export interface SelectedFileSummary {
  name: string;
  size: number;
  sourceKind: DocumentSourceKind;
}

export type PasteSourceKind = Extract<
  DocumentSourceKind,
  "plain-text" | "markdown"
>;

export const pasteFormatLabelCopy = {
  en: "Open pasted text as",
  es: "Abrir el texto pegado como",
  pt: "Abrir o texto colado como",
};

export const pasteFormatOptions: Array<{
  value: PasteSourceKind;
  title: { en: string; es: string; pt: string };
  description: { en: string; es: string; pt: string };
}> = [
  {
    value: "plain-text",
    title: {
      en: "Literal text",
      es: "Texto literal",
      pt: "Texto literal",
    },
    description: {
      en: "Keep Markdown symbols like #, **, and links visible in the reader.",
      es: "Mantiene visibles en el lector símbolos como #, ** y los enlaces de Markdown.",
      pt: "Mantem visiveis no leitor simbolos como #, ** e links de Markdown.",
    },
  },
  {
    value: "markdown",
    title: {
      en: "Clean Markdown",
      es: "Markdown limpio",
      pt: "Markdown limpo",
    },
    description: {
      en: "Turn headings, lists, and inline emphasis into a cleaner reading layout.",
      es: "Convierte encabezados, listas y énfasis en una vista de lectura más limpia.",
      pt: "Transforma titulos, listas e enfase inline em uma leitura mais limpa.",
    },
  },
];

export function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) {
    const megabytes = bytes / 1_000_000;
    return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
  }

  if (bytes >= 1_000) {
    return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  }

  return `${bytes} B`;
}

export function getFirstTransferFile(dataTransfer?: DataTransfer | null) {
  if (!dataTransfer) {
    return null;
  }

  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== "file") {
      continue;
    }

    const file = item.getAsFile();

    if (file) {
      return file;
    }
  }

  return dataTransfer.files?.[0] ?? null;
}

export function hasTransferFiles(dataTransfer?: DataTransfer | null) {
  return Boolean(getFirstTransferFile(dataTransfer));
}

function clampEstimatedWaitMs(value: number) {
  return Math.max(4_000, Math.min(90_000, value));
}

export function estimateDocumentReadyWait(args: {
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

export function formatDuration(
  locale: "en" | "es" | "pt",
  durationMs: number,
) {
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

export function formatDurationRange(
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

export function createRemainingWaitLabel(
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
        ? "Está tardando más de lo normal, pero sigue trabajando."
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

export function deriveSubmissionProgressPercent(
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

export function getSubmissionProgressWidthClass(progressPercent: number) {
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

export function formatSourceKind(
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

export function createUnsupportedTypeStatus(
  locale: "en" | "es" | "pt",
): UploadStatusMessage {
  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atención"
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

export function createEmptyFileStatus(
  locale: "en" | "es" | "pt",
): UploadStatusMessage {
  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atención"
          : "Precisa de atencao",
    title:
      locale === "en"
        ? "That file is empty"
        : locale === "es"
          ? "Ese archivo está vacío"
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

export function createLargePdfStatus(
  locale: "en" | "es" | "pt",
  file: Pick<File, "size">,
): UploadStatusMessage {
  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atención"
          : "Precisa de atencao",
    title:
      locale === "en"
        ? "This PDF is above the current upload limit"
        : locale === "es"
          ? "Este PDF supera el límite actual de carga"
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
          ? "Divide el PDF en secciones más pequeñas o exporta solo las páginas que necesitas."
          : "Divida o PDF em secoes menores ou exporte apenas as paginas de que precisa.",
  };
}

export function createReadingFileStatus(
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
          ? "Importación en curso"
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
          ? "Se detectó un PDF grande. Leyendo está extrayendo el texto fuera del hilo principal para mantener fluida la página."
          : "PDF grande detectado. O Leyendo esta extraindo o texto fora da thread principal para manter a pagina responsiva."
      : locale === "en"
        ? "Leyendo is reading the file locally and pulling out the text preview now."
        : locale === "es"
          ? "Leyendo está leyendo el archivo localmente y extrayendo la vista previa del texto."
          : "O Leyendo esta lendo o arquivo localmente e extraindo agora a previa do texto.",
    nextStep:
      locale === "en"
        ? "Keep this tab open while the preview is prepared."
        : locale === "es"
          ? "Mantén esta pestaña abierta mientras se prepara la vista previa."
          : "Mantenha esta aba aberta enquanto a previa e preparada.",
  };
}

export function createFileReadyStatus(
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
          ? " El diseño del PDF se simplifica en la vista previa, así que revisa el texto extraído antes de abrir el lector."
          : " O layout do PDF e simplificado na previa, entao revise o texto extraido antes de abrir o leitor."
      : "";

  return {
    tone: "success",
    eyebrow:
      locale === "en"
        ? "Review ready"
        : locale === "es"
          ? "Revisión lista"
          : "Revisao pronta",
    title:
      locale === "en"
        ? `${file.name} is ready`
        : locale === "es"
          ? `${file.name} está listo`
          : `${file.name} esta pronto`,
    detail: willOffloadBuild
      ? locale === "en"
        ? `${sourceLabel} at ${formatFileSize(file.size)} imported. Review the text below, then Leyendo will finish structuring the document off the main thread when you open it.${pdfFormattingNote}`
        : locale === "es"
          ? `${sourceLabel} de ${formatFileSize(file.size)} importado. Revisa el texto de abajo y Leyendo terminará de estructurar el documento fuera del hilo principal al abrirlo.${pdfFormattingNote}`
          : `${sourceLabel} com ${formatFileSize(file.size)} importado. Revise o texto abaixo e o Leyendo terminara de estruturar o documento fora da thread principal ao abri-lo.${pdfFormattingNote}`
      : locale === "en"
        ? `${sourceLabel} at ${formatFileSize(file.size)} imported. Review or edit the text below, then open it in the reader.${pdfFormattingNote}`
        : locale === "es"
          ? `${sourceLabel} de ${formatFileSize(file.size)} importado. Revisa o edita el texto de abajo y luego ábrelo en el lector.${pdfFormattingNote}`
          : `${sourceLabel} com ${formatFileSize(file.size)} importado. Revise ou edite o texto abaixo e depois abra no leitor.${pdfFormattingNote}`,
    nextStep:
      locale === "en"
        ? "Next: edit the extracted text if needed, or open it in the reader."
        : locale === "es"
          ? "Siguiente: edita el texto extraído si hace falta o ábrelo en el lector."
          : "Proximo: edite o texto extraido se precisar ou abra no leitor.",
  };
}

export function createStructuringStatus(
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
          ? "Se detectó un documento grande. Leyendo está estructurando el modelo de lectura fuera del hilo principal antes de guardarlo localmente."
          : "Documento grande detectado. O Leyendo esta estruturando o modelo de leitura fora da thread principal antes de salva-lo localmente."
      : locale === "en"
        ? "Leyendo is structuring the text into a reading model now."
        : locale === "es"
          ? "Leyendo está estructurando el texto en un modelo de lectura."
          : "O Leyendo esta estruturando o texto em um modelo de leitura.",
    nextStep:
      locale === "en"
        ? "The reader will open automatically when this step finishes."
        : locale === "es"
          ? "El lector se abrirá automáticamente cuando termine este paso."
          : "O leitor sera aberto automaticamente quando esta etapa terminar.",
  };
}

export function createSavingStatus(
  locale: "en" | "es" | "pt",
): UploadStatusMessage {
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
          ? "Leyendo está guardando el documento en este dispositivo y abriendo el lector."
          : "O Leyendo esta salvando o documento neste dispositivo e abrindo o leitor.",
    nextStep:
      locale === "en"
        ? "You will move into the reader in a moment."
        : locale === "es"
          ? "Entrarás al lector en un momento."
          : "Voce entrara no leitor em instantes.",
  };
}

export function createMissingContentStatus(
  locale: "en" | "es" | "pt",
): UploadStatusMessage {
  return {
    tone: "error",
    eyebrow:
      locale === "en"
        ? "Needs attention"
        : locale === "es"
          ? "Necesita atención"
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

export function createUploadQuotaStatus(args: {
  locale: "en" | "es" | "pt";
  planTier: "basic" | "focus" | "max";
}) {
  const { locale, planTier } = args;

  if (planTier === "focus") {
    return {
      tone: "error" as const,
      eyebrow:
        locale === "en"
          ? "Upload limit reached"
          : locale === "es"
            ? "Limite de cargas alcanzado"
            : "Limite de uploads atingido",
      title:
        locale === "en"
          ? "Focus includes up to 15 file uploads"
          : locale === "es"
            ? "Focus incluye hasta 15 cargas de archivos"
            : "Focus inclui ate 15 uploads de arquivo",
      detail:
        locale === "en"
          ? "This account has already used all 15 Focus uploads. Upgrade to Max to keep importing files."
          : locale === "es"
            ? "Esta cuenta ya usó las 15 cargas de Focus. Mejora a Max para seguir importando archivos."
            : "Esta conta ja usou os 15 uploads do Focus. Faca upgrade para Max para continuar importando arquivos.",
      nextStep:
        locale === "en"
          ? "Pasted text still works, or you can upgrade for unlimited uploads."
          : locale === "es"
            ? "El texto pegado sigue funcionando, o puedes mejorar a un plan con cargas ilimitadas."
            : "Texto colado continua funcionando, ou voce pode fazer upgrade para uploads ilimitados.",
    };
  }

  return {
    tone: "error" as const,
    eyebrow:
      locale === "en"
        ? "Upload limit reached"
        : locale === "es"
          ? "Limite de cargas alcanzado"
          : "Limite de uploads atingido",
    title:
      locale === "en"
        ? "Free reading includes 3 file uploads"
        : locale === "es"
          ? "La lectura gratis incluye 3 cargas de archivos"
          : "A leitura gratuita inclui 3 uploads de arquivo",
    detail:
      locale === "en"
        ? "You have already used the 3 free uploads on this plan or device."
        : locale === "es"
          ? "Ya usaste las 3 cargas gratis disponibles en este plan o dispositivo."
          : "Voce ja usou os 3 uploads gratis disponiveis neste plano ou dispositivo.",
    nextStep:
      locale === "en"
        ? "Upgrade to Focus for 15 uploads or Max for unlimited uploads."
        : locale === "es"
          ? "Mejora a Focus para 15 cargas o a Max para cargas ilimitadas."
          : "Faca upgrade para Focus com 15 uploads ou para Max com uploads ilimitados.",
  };
}

export function createSubmissionErrorStatus(
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
              ? "Necesita atención"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "The text imported, but reader preparation is taking too long"
            : locale === "es"
              ? "El texto se importó, pero la preparación del lector está tardando demasiado"
              : "O texto foi importado, mas a preparacao do leitor esta demorando demais",
        detail:
          locale === "en"
            ? "This usually means the PDF is very long or the extracted layout is complex enough that the browser cannot finish structuring it quickly."
            : locale === "es"
              ? "Esto suele significar que el PDF es muy largo o que el diseño extraído es lo bastante complejo como para que el navegador no termine de estructurarlo con rapidez."
              : "Isso normalmente significa que o PDF e muito longo ou que o layout extraido e complexo o suficiente para que o navegador nao consiga estruturalo rapidamente.",
        nextStep:
          locale === "en"
            ? "Try a shorter PDF, remove appendix pages, or paste only the section you need to read right now."
            : locale === "es"
              ? "Prueba con un PDF más corto, elimina páginas de apéndices o pega solo la sección que necesitas leer ahora."
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
          ? "Necesita atención"
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
            ? "Algo salió mal al preparar el documento."
            : "Algo deu errado ao preparar o documento.",
    nextStep:
      locale === "en"
        ? "Try again or replace the file if the issue continues."
        : locale === "es"
          ? "Vuelve a intentarlo o cambia el archivo si el problema continua."
          : "Tente novamente ou troque o arquivo se o problema continuar.",
  };
}

function isPdfBrowserCompatibilityError(message: string) {
  return (
    message.includes("this browser cannot process pdf") ||
    message.includes("this browser can't process pdf") ||
    message.includes("update the browser") ||
    message.includes("another device") ||
    message.includes("object doesn't support property or method 'at'") ||
    message.includes("can't find variable: structuredclone") ||
    message.includes("promise.withresolvers") ||
    message.includes("array.prototype.at") ||
    message.includes("string.prototype.at") ||
    (message.includes("undefined is not a function") &&
      (message.includes(".at") ||
        message.includes("withresolvers") ||
        message.includes("structuredclone")))
  );
}

export function createSelectionErrorStatus(
  locale: "en" | "es" | "pt",
  error: unknown,
): UploadStatusMessage {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (isPdfBrowserCompatibilityError(normalizedMessage)) {
      return {
        tone: "error",
        eyebrow:
          locale === "en"
            ? "Needs attention"
            : locale === "es"
              ? "Necesita atención"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "This browser could not open that PDF"
            : locale === "es"
              ? "Este navegador no pudo abrir ese PDF"
              : "Este navegador nao conseguiu abrir esse PDF",
        detail:
          locale === "en"
            ? "The PDF may be fine, but this browser version does not support one of the tools Leyendo needs to read it."
            : locale === "es"
              ? "Puede que el PDF este bien, pero esta version del navegador no admite una de las herramientas que Leyendo necesita para leerlo."
              : "O PDF pode estar normal, mas esta versao do navegador nao suporta uma das ferramentas que o Leyendo precisa para le-lo.",
        nextStep:
          locale === "en"
            ? "Update the browser or your phone, or try the upload again from another browser or a desktop device."
            : locale === "es"
              ? "Actualiza el navegador o el telefono, o vuelve a intentarlo desde otro navegador o desde un equipo de escritorio."
              : "Atualize o navegador ou o telefone, ou tente novamente em outro navegador ou em um computador.",
      };
    }

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
              ? "Necesita atención"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "This PDF is locked"
            : locale === "es"
              ? "Este PDF está bloqueado"
              : "Este PDF esta bloqueado",
        detail:
          locale === "en"
            ? "Password-protected or encrypted PDFs cannot be read until they are unlocked."
            : locale === "es"
              ? "Los PDF protegidos con contraseña o cifrados no se pueden leer hasta que se desbloqueen."
              : "PDFs protegidos por senha ou criptografados nao podem ser lidos antes de serem desbloqueados.",
        nextStep:
          locale === "en"
            ? "Open the PDF in another app, remove the protection, and upload the unlocked copy."
            : locale === "es"
              ? "Abre el PDF en otra aplicación, quita la protección y sube la copia desbloqueada."
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
              ? "Necesita atención"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "This PDF looks damaged or unsupported"
            : locale === "es"
              ? "Este PDF parece dañado o no compatible"
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
              ? "Vuelve a exportar el PDF desde el documento original o imprímelo otra vez como PDF nuevo y luego reinténtalo."
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
              ? "Necesita atención"
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
              ? "Los PDF escaneados o solo con imagen aún no son compatibles. Ejecuta OCR primero o exporta un PDF con texto."
              : "PDFs digitalizados ou somente com imagem ainda nao sao compativeis. Rode OCR primeiro ou exporte um PDF com texto.",
        nextStep:
          locale === "en"
            ? "Run OCR on the PDF or export a version with selectable text."
            : locale === "es"
              ? "Ejecuta OCR en el PDF o exporta una versión con texto seleccionable."
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
              ? "Necesita atención"
              : "Precisa de atencao",
        title:
          locale === "en"
            ? "This PDF is taking too long to process"
            : locale === "es"
              ? "Este PDF está tardando demasiado en procesarse"
              : "Este PDF esta demorando demais para ser processado",
        detail:
          locale === "en"
            ? "Try a smaller file, split the PDF into sections, or paste the text directly."
            : locale === "es"
              ? "Prueba con un archivo más pequeño, divide el PDF en secciones o pega el texto directamente."
              : "Tente um arquivo menor, divida o PDF em secoes ou cole o texto diretamente.",
        nextStep:
          locale === "en"
            ? "Use a shorter PDF or import only the relevant pages."
            : locale === "es"
              ? "Usa un PDF más corto o importa solo las páginas relevantes."
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
              ? "Necesita atención"
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
              ? "Asegúrate de que el archivo realmente contenga texto y no esté vacío, solo con imágenes o dañado al exportar."
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
              ? "Necesita atención"
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
          ? "Necesita atención"
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
            ? "Algo salió mal al leer ese archivo."
            : "Algo deu errado ao ler esse arquivo.",
    nextStep:
      locale === "en"
        ? "Try again or choose a different file."
        : locale === "es"
          ? "Vuelve a intentarlo o elige otro archivo."
          : "Tente novamente ou escolha outro arquivo.",
  };
}

export function createUploadFlowSteps(
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
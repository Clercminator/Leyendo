import { getLocalizedCopy } from "@/lib/locale";
import type { DocumentComplexityHint } from "@/types/document";

export interface DocumentComplexityNotice {
  title: string;
  description: string;
  items: string[];
}

const hintOrder: DocumentComplexityHint[] = [
  "docx-rich-content",
  "rtf-rich-content",
  "markdown-advanced-content",
  "markdown-code-blocks",
  "markdown-mermaid-diagrams",
  "markdown-tables",
  "markdown-task-lists",
  "markdown-images",
  "markdown-html",
  "markdown-math",
  "markdown-footnotes",
];

export function createDocumentComplexityNotice(
  locale: "en" | "es" | "pt",
  hints: DocumentComplexityHint[],
) {
  if (hints.length === 0) {
    return undefined;
  }

  const orderedHints = hintOrder.filter((hint) => hints.includes(hint));

  return {
    title: getLocalizedCopy(locale, {
      en: "Review this import carefully",
      es: "Revisa esta importacion con cuidado",
      pt: "Revise esta importacao com cuidado",
    }),
    description: getLocalizedCopy(locale, {
      en: "Leyendo kept the readable text, but this document includes structures that can be simplified, flattened, or signposted instead of rendered exactly.",
      es: "Leyendo conservo el texto legible, pero este documento incluye estructuras que pueden simplificarse, aplanarse o mostrarse como avisos en lugar de renderizarse exactamente.",
      pt: "O Leyendo preservou o texto legivel, mas este documento inclui estruturas que podem ser simplificadas, achatadas ou sinalizadas em vez de renderizadas exatamente.",
    }),
    items: orderedHints.map((hint) => {
      switch (hint) {
        case "docx-rich-content":
          return getLocalizedCopy(locale, {
            en: "DOCX imports can simplify tables, images, comments, footnotes, headers, text boxes, and tracked changes.",
            es: "Las importaciones DOCX pueden simplificar tablas, imagenes, comentarios, notas al pie, encabezados, cuadros de texto y control de cambios.",
            pt: "Imports DOCX podem simplificar tabelas, imagens, comentarios, notas de rodape, cabecalhos, caixas de texto e controle de alteracoes.",
          });
        case "rtf-rich-content":
          return getLocalizedCopy(locale, {
            en: "RTF imports can simplify tables, embedded objects, footnotes, and rich formatting.",
            es: "Las importaciones RTF pueden simplificar tablas, objetos incrustados, notas al pie y formato enriquecido.",
            pt: "Imports RTF podem simplificar tabelas, objetos incorporados, notas de rodape e formatacao rica.",
          });
        case "markdown-advanced-content":
          return getLocalizedCopy(locale, {
            en: "Classic Reader shows the closest Markdown preview, but other reading modes can still simplify advanced blocks. Literal text remains the source-of-truth fallback.",
            es: "El Lector clasico muestra la vista Markdown mas fiel, pero otros modos de lectura aun pueden simplificar bloques avanzados. El texto literal sigue siendo la referencia mas segura.",
            pt: "O Leitor classico mostra a visualizacao Markdown mais fiel, mas outros modos de leitura ainda podem simplificar blocos avancados. O texto literal continua sendo o fallback mais seguro.",
          });
        case "markdown-code-blocks":
          return getLocalizedCopy(locale, {
            en: "Classic Reader renders fenced code blocks as code, but other reading modes may still simplify them.",
            es: "El Lector clasico renderiza los bloques de codigo con cercas como codigo, pero otros modos de lectura aun pueden simplificarlos.",
            pt: "O Leitor classico renderiza blocos de codigo cercados como codigo, mas outros modos de leitura ainda podem simplifica-los.",
          });
        case "markdown-mermaid-diagrams":
          return getLocalizedCopy(locale, {
            en: "Classic Reader renders Mermaid diagrams inline when possible. Other reading modes may still simplify them, and Literal text remains the raw fallback.",
            es: "El Lector clasico renderiza diagramas Mermaid en linea cuando es posible. Otros modos de lectura aun pueden simplificarlos, y el texto literal sigue siendo el fallback bruto.",
            pt: "O Leitor classico renderiza diagramas Mermaid em linha quando possivel. Outros modos de leitura ainda podem simplifica-los, e o texto literal continua sendo o fallback bruto.",
          });
        case "markdown-tables":
          return getLocalizedCopy(locale, {
            en: "Markdown tables can flatten into plain text in clean view.",
            es: "Las tablas Markdown pueden aplanarse a texto plano en la vista limpia.",
            pt: "Tabelas Markdown podem ser achatadas em texto simples na visualizacao limpa.",
          });
        case "markdown-task-lists":
          return getLocalizedCopy(locale, {
            en: "Markdown task lists can lose checkbox state in clean view.",
            es: "Las listas de tareas Markdown pueden perder el estado de sus casillas en la vista limpia.",
            pt: "Listas de tarefas Markdown podem perder o estado das caixas de selecao na visualizacao limpa.",
          });
        case "markdown-images":
          return getLocalizedCopy(locale, {
            en: "Markdown image references keep labels or alt text, not the embedded image asset itself.",
            es: "Las referencias de imagen en Markdown conservan etiquetas o texto alternativo, no la imagen incrustada en si.",
            pt: "Referencias de imagem em Markdown mantem rotulos ou texto alternativo, nao a imagem incorporada em si.",
          });
        case "markdown-html":
          return getLocalizedCopy(locale, {
            en: "Raw HTML inside Markdown can be simplified or omitted in clean view.",
            es: "El HTML sin procesar dentro de Markdown puede simplificarse u omitirse en la vista limpia.",
            pt: "HTML bruto dentro de Markdown pode ser simplificado ou omitido na visualizacao limpa.",
          });
        case "markdown-math":
          return getLocalizedCopy(locale, {
            en: "Math notation can be simplified in clean view.",
            es: "La notacion matematica puede simplificarse en la vista limpia.",
            pt: "A notacao matematica pode ser simplificada na visualizacao limpa.",
          });
        case "markdown-footnotes":
          return getLocalizedCopy(locale, {
            en: "Markdown footnotes can be flattened into plain text.",
            es: "Las notas al pie de Markdown pueden aplanarse a texto plano.",
            pt: "Notas de rodape em Markdown podem ser achatadas em texto simples.",
          });
      }
    }),
  } satisfies DocumentComplexityNotice;
}

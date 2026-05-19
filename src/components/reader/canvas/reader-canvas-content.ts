import { getLocalizedCopy, type AppLocale } from "@/lib/locale";
import {
  pdfScrollModes,
  readerModes,
  readerPresets,
  type ReaderPreferences,
} from "@/types/reader";

export const themeLabels: Record<
  ReaderPreferences["theme"],
  Record<"en" | "es" | "pt", string>
> = {
  midnight: { en: "Midnight", es: "Medianoche", pt: "Meia-noite" },
  ember: { en: "Ember", es: "Ámbar", pt: "Brasa" },
  indigo: { en: "Indigo", es: "Índigo", pt: "Indigo" },
  "high-contrast": {
    en: "High Contrast",
    es: "Alto contraste",
    pt: "Alto contraste",
  },
};

export const themePreviewSwatchClassNames: Record<
  ReaderPreferences["theme"],
  string
> = {
  midnight: "bg-[#8eb5ff]",
  ember: "bg-[#ffb36a]",
  indigo: "bg-[#b8c0ff]",
  "high-contrast": "bg-white",
};

export const modeLabels: Record<
  (typeof readerModes)[number],
  Record<"en" | "es" | "pt", string>
> = {
  "focus-word": {
    en: "Focus Word",
    es: "Foco por palabra",
    pt: "Palavra foco",
  },
  "phrase-chunk": {
    en: "Phrase Chunk",
    es: "Bloques de frases",
    pt: "Blocos de frases",
  },
  "guided-line": {
    en: "Guided Line",
    es: "Línea guiada",
    pt: "Linha guiada",
  },
  "classic-reader": {
    en: "Classic Reader",
    es: "Lector clásico",
    pt: "Leitor classico",
  },
};

export const presetCopy: Record<
  (typeof readerPresets)[number]["id"],
  {
    label: Record<"en" | "es" | "pt", string>;
    summary: Record<"en" | "es" | "pt", string>;
  }
> = {
  beginner: {
    label: { en: "Beginner", es: "Inicial", pt: "Iniciante" },
    summary: {
      en: "Calm pacing with extra breathing room for comprehension.",
      es: "Ritmo calmado con más espacio para comprender.",
      pt: "Ritmo calmo com mais espaco para compreender.",
    },
  },
  comfortable: {
    label: { en: "Comfortable", es: "Cómodo", pt: "Confortavel" },
    summary: {
      en: "A balanced default for everyday reading practice.",
      es: "Un punto medio equilibrado para leer todos los días.",
      pt: "Um equilibrio pratico para a leitura do dia a dia.",
    },
  },
  "push-me": {
    label: { en: "Push Me", es: "Exígeme", pt: "Me desafie" },
    summary: {
      en: "Faster pacing with small phrase groups and light assist.",
      es: "Más velocidad con grupos cortos y ayuda ligera.",
      pt: "Mais velocidade com grupos curtos e ajuda leve.",
    },
  },
  challenge: {
    label: { en: "Challenge", es: "Desafío", pt: "Desafio" },
    summary: {
      en: "A sharper training preset for strong focus sessions.",
      es: "Un ajuste más exigente para sesiones de mucho foco.",
      pt: "Um ajuste mais intenso para sessoes de foco forte.",
    },
  },
};

export function getReaderCanvasCopy(
  locale: AppLocale,
  activeGoalLabel?: string,
) {
  return {
    readerCanvas: getLocalizedCopy(locale, {
      en: "Reader canvas",
      es: "Lienzo de lectura",
      pt: "Painel de leitura",
    }),
    paragraph: getLocalizedCopy(locale, {
      en: "Paragraph",
      es: "Párrafo",
      pt: "Paragrafo",
    }),
    complete: getLocalizedCopy(locale, {
      en: "complete",
      es: "completado",
      pt: "concluido",
    }),
    sentenceCount: getLocalizedCopy(locale, {
      en: "sentences",
      es: "frases",
      pt: "frases",
    }),
    playbackRunning: getLocalizedCopy(locale, {
      en: "Playback running",
      es: "Reproducción activa",
      pt: "Reproducao ativa",
    }),
    playbackPaused: getLocalizedCopy(locale, {
      en: "Playback paused",
      es: "Reproducción pausada",
      pt: "Reproducao pausada",
    }),
    timeLeft: getLocalizedCopy(locale, {
      en: "Time left",
      es: "Tiempo restante",
      pt: "Tempo restante",
    }),
    readerDetails: getLocalizedCopy(locale, {
      en: "Reader details",
      es: "Detalles de lectura",
      pt: "Detalhes de leitura",
    }),
    timeEstimateHelp: getLocalizedCopy(locale, {
      en: "Time is an estimate. It can change with reading mode, pacing, and motion settings.",
      es: "El tiempo es una estimación. Puede cambiar según el modo de lectura, el ritmo y los ajustes de movimiento.",
      pt: "O tempo e uma estimativa. Ele pode mudar com o modo de leitura, o ritmo e os ajustes de movimento.",
    }),
    saveBookmark: getLocalizedCopy(locale, {
      en: "Save bookmark",
      es: "Guardar marcador",
      pt: "Salvar marcador",
    }),
    saveHighlight: getLocalizedCopy(locale, {
      en: "Save highlight",
      es: "Guardar destacado",
      pt: "Salvar destaque",
    }),
    save: getLocalizedCopy(locale, {
      en: "Save",
      es: "Guardar",
      pt: "Salvar",
    }),
    saveMenu: getLocalizedCopy(locale, {
      en: "Save options",
      es: "Opciones para guardar",
      pt: "Opcoes para salvar",
    }),
    pdfPageControls: getLocalizedCopy(locale, {
      en: "PDF page controls",
      es: "Controles de pagina PDF",
      pt: "Controles da pagina PDF",
    }),
    pdfCompanion: getLocalizedCopy(locale, {
      en: "PDF companion",
      es: "Companero PDF",
      pt: "Companheiro PDF",
    }),
    pdfSearch: getLocalizedCopy(locale, {
      en: "Search this PDF",
      es: "Buscar en este PDF",
      pt: "Buscar neste PDF",
    }),
    pdfSearchMenu: getLocalizedCopy(locale, {
      en: "PDF search",
      es: "Busqueda PDF",
      pt: "Busca no PDF",
    }),
    openBrowserPdf: getLocalizedCopy(locale, {
      en: "Open Browser PDF",
      es: "Abrir PDF en el navegador",
      pt: "Abrir PDF no navegador",
    }),
    previousPage: getLocalizedCopy(locale, {
      en: "Previous page",
      es: "Pagina anterior",
      pt: "Pagina anterior",
    }),
    nextPage: getLocalizedCopy(locale, {
      en: "Next page",
      es: "Pagina siguiente",
      pt: "Proxima pagina",
    }),
    jumpToPage: getLocalizedCopy(locale, {
      en: "Jump to page",
      es: "Ir a la pagina",
      pt: "Ir para a pagina",
    }),
    pageFieldPlaceholder: getLocalizedCopy(locale, {
      en: "Page",
      es: "Pagina",
      pt: "Pagina",
    }),
    goToPage: getLocalizedCopy(locale, {
      en: "Go",
      es: "Ir",
      pt: "Ir",
    }),
    zoomOut: getLocalizedCopy(locale, {
      en: "Zoom out",
      es: "Alejar",
      pt: "Diminuir zoom",
    }),
    zoomIn: getLocalizedCopy(locale, {
      en: "Zoom in",
      es: "Acercar",
      pt: "Aumentar zoom",
    }),
    view: getLocalizedCopy(locale, {
      en: "View",
      es: "Vista",
      pt: "Vista",
    }),
    viewMenu: getLocalizedCopy(locale, {
      en: "PDF view tools",
      es: "Herramientas de vista PDF",
      pt: "Ferramentas de visualizacao PDF",
    }),
    fitWidth: getLocalizedCopy(locale, {
      en: "Fit width",
      es: "Ajustar ancho",
      pt: "Ajustar largura",
    }),
    fitPage: getLocalizedCopy(locale, {
      en: "Fit page",
      es: "Ajustar pagina",
      pt: "Ajustar pagina",
    }),
    actualSize: getLocalizedCopy(locale, {
      en: "Actual size",
      es: "Tamano real",
      pt: "Tamanho real",
    }),
    continuousPages: getLocalizedCopy(locale, {
      en: "Continuous",
      es: "Continuo",
      pt: "Continuo",
    }),
    singlePage: getLocalizedCopy(locale, {
      en: "Single page",
      es: "Pagina unica",
      pt: "Pagina unica",
    }),
    pageCountSummary: (args: { currentPageNumber: number; pageCount: number }) =>
      getLocalizedCopy(locale, {
        en: `${args.currentPageNumber} of ${args.pageCount}`,
        es: `${args.currentPageNumber} de ${args.pageCount}`,
        pt: `${args.currentPageNumber} de ${args.pageCount}`,
      }),
    currentPageSummary: (args: { currentPageLabel: string }) =>
      getLocalizedCopy(locale, {
        en: `Page ${args.currentPageLabel}`,
        es: `Pagina ${args.currentPageLabel}`,
        pt: `Pagina ${args.currentPageLabel}`,
      }),
    returnToOriginalPage: getLocalizedCopy(locale, {
      en: "Return to original page",
      es: "Volver a la pagina original",
      pt: "Voltar para a pagina original",
    }),
    backToPdfView: getLocalizedCopy(locale, {
      en: "Back to PDF view",
      es: "Volver a la vista PDF",
      pt: "Voltar para a vista em PDF",
    }),
    pause: getLocalizedCopy(locale, {
      en: "Pause",
      es: "Pausar",
      pt: "Pausar",
    }),
    play: getLocalizedCopy(locale, {
      en: "Play",
      es: "Reproducir",
      pt: "Reproduzir",
    }),
    backFive: getLocalizedCopy(locale, {
      en: "Back 5",
      es: "Retroceder 5",
      pt: "Voltar 5",
    }),
    previous: getLocalizedCopy(locale, {
      en: "Previous",
      es: "Anterior",
      pt: "Anterior",
    }),
    restart: getLocalizedCopy(locale, {
      en: "Restart",
      es: "Reiniciar",
      pt: "Reiniciar",
    }),
    restartParagraph: getLocalizedCopy(locale, {
      en: "Restart paragraph",
      es: "Reiniciar párrafo",
      pt: "Reiniciar paragrafo",
    }),
    repeatChunk: getLocalizedCopy(locale, {
      en: "Repeat chunk",
      es: "Repetir bloque",
      pt: "Repetir bloco",
    }),
    next: getLocalizedCopy(locale, {
      en: "Next",
      es: "Siguiente",
      pt: "Seguinte",
    }),
    forwardFive: getLocalizedCopy(locale, {
      en: "Forward 5",
      es: "Avanzar 5",
      pt: "Avancar 5",
    }),
    chunkSize: getLocalizedCopy(locale, {
      en: "Chunk size",
      es: "Tamaño del bloque",
      pt: "Tamanho do bloco",
    }),
    word: getLocalizedCopy(locale, {
      en: "word",
      es: "palabra",
      pt: "palavra",
    }),
    words: getLocalizedCopy(locale, {
      en: "words",
      es: "palabras",
      pt: "palavras",
    }),
    decreaseChunkSize: getLocalizedCopy(locale, {
      en: "Decrease chunk size",
      es: "Reducir tamaño del bloque",
      pt: "Reduzir tamanho do bloco",
    }),
    increaseChunkSize: getLocalizedCopy(locale, {
      en: "Increase chunk size",
      es: "Aumentar tamaño del bloque",
      pt: "Aumentar tamanho do bloco",
    }),
    presets: getLocalizedCopy(locale, {
      en: "Presets",
      es: "Ajustes rápidos",
      pt: "Ajustes rapidos",
    }),
    presetMenu: getLocalizedCopy(locale, {
      en: "Reading presets",
      es: "Ajustes de lectura",
      pt: "Ajustes de leitura",
    }),
    changePreset: getLocalizedCopy(locale, {
      en: "Change preset",
      es: "Cambiar ajuste",
      pt: "Mudar ajuste",
    }),
    changeTextView: getLocalizedCopy(locale, {
      en: "Change text view",
      es: "Cambiar vista del texto",
      pt: "Mudar visualizacao do texto",
    }),
    playbackSettings: getLocalizedCopy(locale, {
      en: "Playback settings",
      es: "Ajustes de reproducción",
      pt: "Ajustes de reproducao",
    }),
    fontScaleSettings: getLocalizedCopy(locale, {
      en: "Font scale settings",
      es: "Ajustes de escala tipográfica",
      pt: "Ajustes de escala tipografica",
    }),
    lineHeightSettings: getLocalizedCopy(locale, {
      en: "Line height settings",
      es: "Ajustes de altura de línea",
      pt: "Ajustes de altura da linha",
    }),
    enterFullscreen: getLocalizedCopy(locale, {
      en: "Enter fullscreen",
      es: "Entrar a pantalla completa",
      pt: "Entrar em tela cheia",
    }),
    exitFullscreen: getLocalizedCopy(locale, {
      en: "Exit fullscreen",
      es: "Salir de pantalla completa",
      pt: "Sair da tela cheia",
    }),
    expand: getLocalizedCopy(locale, {
      en: "Expand",
      es: "Expandir",
      pt: "Expandir",
    }),
    collapse: getLocalizedCopy(locale, {
      en: "Collapse",
      es: "Contraer",
      pt: "Recolher",
    }),
    currentValue: getLocalizedCopy(locale, {
      en: "Current",
      es: "Actual",
      pt: "Atual",
    }),
    customPreset: getLocalizedCopy(locale, {
      en: "Custom",
      es: "Personalizado",
      pt: "Personalizado",
    }),
    appearance: getLocalizedCopy(locale, {
      en: "Appearance",
      es: "Apariencia",
      pt: "Aparencia",
    }),
    textView: getLocalizedCopy(locale, {
      en: "Text view",
      es: "Vista del texto",
      pt: "Visualizacao do texto",
    }),
    textViewMenu: getLocalizedCopy(locale, {
      en: "Text rendering",
      es: "Renderizado del texto",
      pt: "Renderizacao do texto",
    }),
    cleanMarkdown: getLocalizedCopy(locale, {
      en: "Clean Markdown",
      es: "Markdown limpio",
      pt: "Markdown limpo",
    }),
    literalText: getLocalizedCopy(locale, {
      en: "Literal text",
      es: "Texto literal",
      pt: "Texto literal",
    }),
    changeTheme: getLocalizedCopy(locale, {
      en: "Change theme",
      es: "Cambiar tema",
      pt: "Mudar tema",
    }),
    changeReadingMode: getLocalizedCopy(locale, {
      en: "Change reading mode",
      es: "Cambiar modo de lectura",
      pt: "Mudar modo de leitura",
    }),
    themeMenu: getLocalizedCopy(locale, {
      en: "Theme colors",
      es: "Colores del tema",
      pt: "Cores do tema",
    }),
    playback: getLocalizedCopy(locale, {
      en: "Playback",
      es: "Reproducción",
      pt: "Reproducao",
    }),
    readingMode: getLocalizedCopy(locale, {
      en: "Reading mode",
      es: "Modo de lectura",
      pt: "Modo de leitura",
    }),
    fontScale: getLocalizedCopy(locale, {
      en: "Font scale",
      es: "Escala tipográfica",
      pt: "Escala tipografica",
    }),
    lineHeight: getLocalizedCopy(locale, {
      en: "Line height",
      es: "Altura de línea",
      pt: "Altura da linha",
    }),
    speed: getLocalizedCopy(locale, {
      en: "Speed",
      es: "Velocidad",
      pt: "Velocidade",
    }),
    naturalPauses: getLocalizedCopy(locale, {
      en: "Natural pauses",
      es: "Pausas naturales",
      pt: "Pausas naturais",
    }),
    reduceMotion: getLocalizedCopy(locale, {
      en: "Reduce motion",
      es: "Reducir movimiento",
      pt: "Reduzir movimento",
    }),
    more: getLocalizedCopy(locale, {
      en: "More",
      es: "Más",
      pt: "Mais",
    }),
    tools: getLocalizedCopy(locale, {
      en: "Tools",
      es: "Herramientas",
      pt: "Ferramentas",
    }),
    readingTools: getLocalizedCopy(locale, {
      en: "Reading tools",
      es: "Herramientas de lectura",
      pt: "Ferramentas de leitura",
    }),
    closeTools: getLocalizedCopy(locale, {
      en: "Close tools",
      es: "Cerrar herramientas",
      pt: "Fechar ferramentas",
    }),
    controls: getLocalizedCopy(locale, {
      en: "Controls",
      es: "Controles",
      pt: "Controles",
    }),
    hideControls: getLocalizedCopy(locale, {
      en: "Hide controls",
      es: "Ocultar controles",
      pt: "Ocultar controles",
    }),
    moreActions: getLocalizedCopy(locale, {
      en: "More actions",
      es: "Más acciones",
      pt: "Mais acoes",
    }),
    decreaseFontScale: getLocalizedCopy(locale, {
      en: "Decrease font scale",
      es: "Reducir escala tipográfica",
      pt: "Reduzir escala tipografica",
    }),
    increaseFontScale: getLocalizedCopy(locale, {
      en: "Increase font scale",
      es: "Aumentar escala tipográfica",
      pt: "Aumentar escala tipografica",
    }),
    decreaseLineHeight: getLocalizedCopy(locale, {
      en: "Decrease line height",
      es: "Reducir altura de línea",
      pt: "Reduzir altura da linha",
    }),
    increaseLineHeight: getLocalizedCopy(locale, {
      en: "Increase line height",
      es: "Aumentar altura de línea",
      pt: "Aumentar altura da linha",
    }),
    decreaseReadingSpeed: getLocalizedCopy(locale, {
      en: "Decrease reading speed",
      es: "Reducir velocidad de lectura",
      pt: "Reduzir velocidade de leitura",
    }),
    increaseReadingSpeed: getLocalizedCopy(locale, {
      en: "Increase reading speed",
      es: "Aumentar velocidad de lectura",
      pt: "Aumentar velocidade de leitura",
    }),
    readingModeHelp: activeGoalLabel
      ? getLocalizedCopy(locale, {
          en: `Current goal: ${activeGoalLabel}. You can customize the controls below without losing saved progress.`,
          es: `Objetivo actual: ${activeGoalLabel}. Puedes ajustar los controles sin perder el progreso guardado.`,
          pt: `Objetivo atual: ${activeGoalLabel}. Voce pode ajustar os controles sem perder o progresso salvo.`,
        })
      : getLocalizedCopy(locale, {
          en: "This session is currently customized beyond a saved onboarding goal.",
          es: "Esta sesión ya tiene ajustes propios, más allá del objetivo guardado.",
          pt: "Esta sessao esta personalizada alem de um objetivo salvo.",
        }),
  };
}

export const pdfViewModeLabels: Record<
  (typeof pdfScrollModes)[number],
  Record<"en" | "es" | "pt", string>
> = {
  continuous: {
    en: "Continuous",
    es: "Continuo",
    pt: "Continuo",
  },
  "single-page": {
    en: "Single page",
    es: "Pagina unica",
    pt: "Pagina unica",
  },
};

export type ReaderCanvasCopy = ReturnType<typeof getReaderCanvasCopy>;
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BookmarkPlus,
  Clock3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  SkipBack,
  SkipForward,
  Undo2,
  X,
} from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";
import { cn } from "@/lib/utils";
import {
  readerModes,
  readerPresets,
  type ReaderPreferences,
} from "@/types/reader";

interface ReaderCanvasProps {
  activeGoalLabel?: string;
  availableModes?: (typeof readerModes)[number][];
  className?: string;
  chunkSize: number;
  currentParagraphNumber: number;
  isPlaying: boolean;
  modeLabel: string;
  modeView: React.ReactNode;
  remainingTimeLabel: string;
  preferences: ReaderPreferences;
  sentenceCount: number;
  onAnnounceRemainingTime: () => void;
  onChangeFontScale: (delta: number) => void;
  onChangeLineHeight: (delta: number) => void;
  onChangeWordsPerMinute: (delta: number) => void;
  onDecreaseChunkSize: () => void;
  onIncreaseChunkSize: () => void;
  onMoveBackward: () => void;
  onMoveBackwardFive: () => void;
  onMoveForward: () => void;
  onMoveForwardFive: () => void;
  onRepeatChunk: () => void;
  onRestart: () => void;
  onRestartParagraph: () => void;
  onSaveBookmark: () => void;
  onSaveHighlight: () => void;
  onSelectMode: (mode: (typeof readerModes)[number]) => void;
  onSelectPreset: (presetId: (typeof readerPresets)[number]["id"]) => void;
  onSelectTheme: (theme: ReaderPreferences["theme"]) => void;
  onToggleNaturalPauses: () => void;
  onTogglePlayback: () => void;
  onToggleReduceMotion: () => void;
  progress: number;
}

const themeLabels: Record<
  ReaderPreferences["theme"],
  Record<"en" | "es" | "pt", string>
> = {
  midnight: { en: "Midnight", es: "Medianoche", pt: "Meia-noite" },
  ember: { en: "Ember", es: "Ascuas", pt: "Brasa" },
  indigo: { en: "Indigo", es: "Indigo", pt: "Indigo" },
  "high-contrast": {
    en: "High Contrast",
    es: "Alto contraste",
    pt: "Alto contraste",
  },
};

const modeLabels: Record<
  (typeof readerModes)[number],
  Record<"en" | "es" | "pt", string>
> = {
  "pdf-page": {
    en: "Standard",
    es: "Standard",
    pt: "Standard",
  },
  "focus-word": { en: "Focus Word", es: "Palabra foco", pt: "Palavra foco" },
  "phrase-chunk": {
    en: "Phrase Chunk",
    es: "Bloques de frases",
    pt: "Blocos de frases",
  },
  "guided-line": { en: "Guided Line", es: "Linea guiada", pt: "Linha guiada" },
  "classic-reader": {
    en: "Classic Reader",
    es: "Lector clasico",
    pt: "Leitor classico",
  },
};

const presetCopy: Record<
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
      es: "Ritmo calmado con mas espacio para comprender.",
      pt: "Ritmo calmo com mais espaco para compreender.",
    },
  },
  comfortable: {
    label: { en: "Comfortable", es: "Comodo", pt: "Confortavel" },
    summary: {
      en: "A balanced default for everyday reading practice.",
      es: "Un punto medio equilibrado para leer todos los dias.",
      pt: "Um equilibrio pratico para a leitura do dia a dia.",
    },
  },
  "push-me": {
    label: { en: "Push Me", es: "Exigeme", pt: "Me desafie" },
    summary: {
      en: "Faster pacing with small phrase groups and light assist.",
      es: "Mas velocidad con grupos cortos y una ayuda ligera.",
      pt: "Mais velocidade com grupos curtos e ajuda leve.",
    },
  },
  challenge: {
    label: { en: "Challenge", es: "Desafio", pt: "Desafio" },
    summary: {
      en: "A sharper training preset for strong focus sessions.",
      es: "Un ajuste mas exigente para sesiones de foco fuerte.",
      pt: "Um ajuste mais intenso para sessoes de foco forte.",
    },
  },
};

export function ReaderCanvas({
  activeGoalLabel,
  availableModes = [...readerModes],
  className,
  chunkSize,
  currentParagraphNumber,
  isPlaying,
  modeLabel,
  modeView,
  remainingTimeLabel,
  preferences,
  sentenceCount,
  onAnnounceRemainingTime,
  onChangeFontScale,
  onChangeLineHeight,
  onChangeWordsPerMinute,
  onDecreaseChunkSize,
  onIncreaseChunkSize,
  onMoveBackward,
  onMoveBackwardFive,
  onMoveForward,
  onMoveForwardFive,
  onRepeatChunk,
  onRestart,
  onRestartParagraph,
  onSaveBookmark,
  onSaveHighlight,
  onSelectMode,
  onSelectPreset,
  onSelectTheme,
  onToggleNaturalPauses,
  onTogglePlayback,
  onToggleReduceMotion,
  progress,
}: ReaderCanvasProps) {
  const { locale } = useLocale();
  const canvasRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<
    | "mode"
    | "preset"
    | "theme"
    | "save"
    | "font-scale"
    | "line-height"
    | "playback"
    | "more"
    | null
  >(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileChromeVisible, setIsMobileChromeVisible] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const fontScaleMenuRef = useRef<HTMLDivElement>(null);
  const lineHeightMenuRef = useRef<HTMLDivElement>(null);
  const playbackMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const transportButtonClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:w-auto sm:rounded-full sm:px-3.5";
  const compactStepButtonClass =
    "rounded-full border border-(--border-soft) bg-(--surface-chip) px-2.5 py-1.5 text-xs text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-strong)";
  const settingsTriggerClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:w-auto sm:rounded-full sm:px-3.5";
  const desktopBottomMenuPositionClass = isFullscreen
    ? "bottom-full top-auto mb-3 mt-0"
    : "top-full mt-3";
  const settingsPanelClass = cn(
    "reader-dropdown-panel absolute left-0 z-60 w-[19rem] max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
    desktopBottomMenuPositionClass,
  );
  const settingsRowClass =
    "rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-3";
  const topControlButtonClass =
    "min-h-10 items-center justify-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-sm";
  const statusChipClass =
    "inline-flex min-h-10 items-center justify-center rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-center text-xs text-(--text-strong) sm:min-h-auto sm:rounded-full sm:px-3 sm:py-1.5 sm:text-sm";
  const mobileStatCardClass =
    "rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-left";
  const mobilePrimaryButtonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)";
  const mobileToolsSectionClass =
    "rounded-[1.2rem] border border-(--border-soft) bg-(--surface-strong) p-3";
  const sheetActionButtonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)";

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        modeMenuRef.current?.contains(target) ||
        presetMenuRef.current?.contains(target) ||
        saveMenuRef.current?.contains(target) ||
        themeMenuRef.current?.contains(target) ||
        fontScaleMenuRef.current?.contains(target) ||
        lineHeightMenuRef.current?.contains(target) ||
        playbackMenuRef.current?.contains(target) ||
        moreMenuRef.current?.contains(target)
      ) {
        return;
      }

      setOpenMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenu]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === canvasRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileToolsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileToolsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileToolsOpen]);

  const activePreset = readerPresets.find((preset) => {
    return (
      preset.mode === preferences.mode &&
      preset.wordsPerMinute === preferences.wordsPerMinute &&
      preset.chunkSize === chunkSize &&
      preset.focusWindow === preferences.focusWindow &&
      preset.naturalPauses === preferences.naturalPauses &&
      preset.smartPacing === preferences.smartPacing &&
      preset.reduceMotion === preferences.reduceMotion
    );
  });
  const activePresetSummary = activePreset
    ? getLocalizedCopy(locale, presetCopy[activePreset.id].summary)
    : null;

  const copy = {
    readerCanvas: getLocalizedCopy(locale, {
      en: "Reader canvas",
      es: "Lienzo de lectura",
      pt: "Painel de leitura",
    }),
    paragraph: getLocalizedCopy(locale, {
      en: "Paragraph",
      es: "Parrafo",
      pt: "Paragrafo",
    }),
    complete: getLocalizedCopy(locale, {
      en: "complete",
      es: "completado",
      pt: "concluido",
    }),
    sentenceCount: getLocalizedCopy(locale, {
      en: "sentences",
      es: "oraciones",
      pt: "frases",
    }),
    playbackRunning: getLocalizedCopy(locale, {
      en: "Playback running",
      es: "Reproduccion activa",
      pt: "Reproducao ativa",
    }),
    playbackPaused: getLocalizedCopy(locale, {
      en: "Playback paused",
      es: "Reproduccion pausada",
      pt: "Reproducao pausada",
    }),
    timeLeft: getLocalizedCopy(locale, {
      en: "Time left",
      es: "Tiempo restante",
      pt: "Tempo restante",
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
      es: "Reiniciar parrafo",
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
      es: "Tamano del bloque",
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
      es: "Reducir tamano del bloque",
      pt: "Reduzir tamanho do bloco",
    }),
    increaseChunkSize: getLocalizedCopy(locale, {
      en: "Increase chunk size",
      es: "Aumentar tamano del bloque",
      pt: "Aumentar tamanho do bloco",
    }),
    presets: getLocalizedCopy(locale, {
      en: "Presets",
      es: "Ajustes rapidos",
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
    playbackSettings: getLocalizedCopy(locale, {
      en: "Playback settings",
      es: "Ajustes de reproduccion",
      pt: "Ajustes de reproducao",
    }),
    fontScaleSettings: getLocalizedCopy(locale, {
      en: "Font scale settings",
      es: "Ajustes de escala tipografica",
      pt: "Ajustes de escala tipografica",
    }),
    lineHeightSettings: getLocalizedCopy(locale, {
      en: "Line height settings",
      es: "Ajustes de altura de linea",
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
      es: "Reproduccion",
      pt: "Reproducao",
    }),
    readingMode: getLocalizedCopy(locale, {
      en: "Reading mode",
      es: "Modo de lectura",
      pt: "Modo de leitura",
    }),
    fontScale: getLocalizedCopy(locale, {
      en: "Font scale",
      es: "Escala tipografica",
      pt: "Escala tipografica",
    }),
    lineHeight: getLocalizedCopy(locale, {
      en: "Line height",
      es: "Altura de linea",
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
      es: "Mas",
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
    showControlsHint: getLocalizedCopy(locale, {
      en: "Tap the text to show controls",
      es: "Toca el texto para mostrar controles",
      pt: "Toque o texto para mostrar os controles",
    }),
    hideControlsHint: getLocalizedCopy(locale, {
      en: "Tap the text again to hide controls",
      es: "Toca el texto otra vez para ocultar controles",
      pt: "Toque o texto novamente para ocultar os controles",
    }),
    moreActions: getLocalizedCopy(locale, {
      en: "More actions",
      es: "Mas acciones",
      pt: "Mais acoes",
    }),
    decreaseFontScale: getLocalizedCopy(locale, {
      en: "Decrease font scale",
      es: "Reducir escala tipografica",
      pt: "Reduzir escala tipografica",
    }),
    increaseFontScale: getLocalizedCopy(locale, {
      en: "Increase font scale",
      es: "Aumentar escala tipografica",
      pt: "Aumentar escala tipografica",
    }),
    decreaseLineHeight: getLocalizedCopy(locale, {
      en: "Decrease line height",
      es: "Reducir altura de linea",
      pt: "Reduzir altura da linha",
    }),
    increaseLineHeight: getLocalizedCopy(locale, {
      en: "Increase line height",
      es: "Aumentar altura de linea",
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
          es: "Esta sesion ya esta personalizada mas alla de un objetivo guardado.",
          pt: "Esta sessao esta personalizada alem de um objetivo salvo.",
        }),
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenEnabled) {
      return;
    }

    if (document.fullscreenElement === canvasRef.current) {
      await document.exitFullscreen();
      return;
    }

    await canvasRef.current?.requestFullscreen();
  };

  const toggleMobileChrome = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.matchMedia?.("(min-width: 640px)").matches ?? false) {
      return;
    }

    if (isMobileToolsOpen) {
      return;
    }

    setOpenMenu(null);
    setIsMobileChromeVisible((current) => !current);
  }, [isMobileToolsOpen]);

  return (
    <section
      ref={canvasRef}
      id="reader-canvas"
      aria-labelledby="reader-canvas-title"
      tabIndex={-1}
      className={cn(
        "reader-canvas relative isolate flex h-[calc(100svh-6.75rem)] min-h-120 w-full flex-col gap-3 overflow-visible rounded-[1.5rem] border border-(--border-soft) bg-(--surface-strong) px-3 py-3 text-left sm:h-[calc(100svh-8.5rem)] sm:min-h-136 sm:gap-6 sm:rounded-[1.75rem] sm:px-6 sm:py-5 lg:h-[86vh] lg:min-h-176 lg:px-8 lg:py-6",
        className,
      )}
    >
      <h2 id="reader-canvas-title" className="sr-only">
        {copy.readerCanvas}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "space-y-3 sm:space-y-4",
            !isMobileChromeVisible && "hidden sm:block",
          )}
        >
          <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <div ref={modeMenuRef} className="relative z-40">
              <button
                type="button"
                aria-label={copy.changeReadingMode}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "mode" ? null : "mode",
                  );
                }}
                className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs tracking-[0.16em] text-(--accent-sky) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:w-auto sm:justify-center sm:px-4 sm:py-2.5 sm:text-sm sm:tracking-[0.22em]"
              >
                {modeLabel}
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "mode" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "mode" ? (
                <div className="reader-dropdown-panel absolute top-full left-0 z-60 mt-3 w-64 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl">
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.readingMode}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {availableModes.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          onSelectMode(value as (typeof readerModes)[number]);
                          setOpenMenu(null);
                        }}
                        className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                          preferences.mode === value
                            ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                            : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                        }`}
                      >
                        {getLocalizedCopy(locale, modeLabels[value])}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={presetMenuRef} className="relative z-40">
              <button
                type="button"
                aria-label={copy.changePreset}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "preset" ? null : "preset",
                  );
                }}
                className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs tracking-widest text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:w-auto sm:justify-center sm:px-4 sm:py-2.5 sm:text-sm sm:tracking-[0.14em]"
              >
                {activePreset
                  ? getLocalizedCopy(locale, presetCopy[activePreset.id].label)
                  : copy.customPreset}
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "preset" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "preset" ? (
                <div className="reader-dropdown-panel absolute top-full left-0 z-60 mt-3 w-80 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl">
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.presetMenu}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {readerPresets.map((preset) => {
                      const isActive = activePreset?.id === preset.id;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            onSelectPreset(preset.id);
                            setOpenMenu(null);
                          }}
                          className={`rounded-[1rem] border px-3 py-3 text-left transition ${
                            isActive
                              ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                              : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">
                              {getLocalizedCopy(
                                locale,
                                presetCopy[preset.id].label,
                              )}
                            </p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                isActive
                                  ? "border-white/20 bg-white/10 text-white/80"
                                  : "border-(--border-soft) bg-(--surface-chip) text-(--text-muted)"
                              }`}
                            >
                              {preset.wordsPerMinute} WPM
                            </span>
                          </div>
                          <p
                            className={`mt-1.5 text-xs leading-5 ${isActive ? "text-white/80" : "text-(--text-muted)"}`}
                          >
                            {getLocalizedCopy(
                              locale,
                              presetCopy[preset.id].summary,
                            )}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={themeMenuRef} className="relative z-40">
              <button
                type="button"
                aria-label={copy.changeTheme}
                onClick={() => {
                  setOpenMenu((current) =>
                    current === "theme" ? null : "theme",
                  );
                }}
                className={`hidden ${topControlButtonClass} sm:inline-flex`}
              >
                {getLocalizedCopy(locale, themeLabels[preferences.theme])}
                <ChevronDown
                  className={`h-4 w-4 transition ${openMenu === "theme" ? "rotate-180" : ""}`}
                />
              </button>
              {openMenu === "theme" ? (
                <div className="reader-dropdown-panel absolute top-full right-0 z-60 mt-3 w-56 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl">
                  <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                    {copy.themeMenu}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {Object.entries(themeLabels).map(([value, labels]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          onSelectTheme(value as ReaderPreferences["theme"]);
                          setOpenMenu(null);
                        }}
                        className={`rounded-full border px-3 py-2 text-left text-sm transition ${
                          preferences.theme === value
                            ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                            : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                        }`}
                      >
                        {getLocalizedCopy(locale, labels)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {isFullscreen ? (
              <>
                <span className={`hidden ${statusChipClass} sm:inline-flex`}>
                  {progress}% {copy.complete}
                </span>
                <span className={`hidden ${statusChipClass} sm:inline-flex`}>
                  {sentenceCount} {copy.sentenceCount}
                </span>
                <button
                  type="button"
                  aria-label={`${copy.timeLeft}: ${remainingTimeLabel}`}
                  onClick={onAnnounceRemainingTime}
                  className={`hidden ${statusChipClass} gap-2 transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:inline-flex`}
                >
                  <Clock3 className="h-4 w-4 text-(--accent-amber)" />
                  {remainingTimeLabel}
                </button>
              </>
            ) : null}
            <button
              type="button"
              aria-label={
                isFullscreen ? copy.exitFullscreen : copy.enterFullscreen
              }
              onClick={() => {
                void toggleFullscreen();
              }}
              className={`hidden ${topControlButtonClass} sm:inline-flex`}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              {isFullscreen ? copy.collapse : copy.expand}
            </button>
          </div>
          <div className="grid gap-2 text-sm sm:hidden">
            <div className="flex flex-wrap gap-2">
              <span className={statusChipClass}>
                {copy.paragraph} {currentParagraphNumber} · {progress}%
              </span>
              <span className={statusChipClass}>
                {sentenceCount} {copy.sentenceCount}
              </span>
              <button
                type="button"
                aria-label={`${copy.timeLeft}: ${remainingTimeLabel}`}
                onClick={onAnnounceRemainingTime}
                className={`${statusChipClass} gap-2 transition hover:border-(--border-strong) hover:bg-(--surface-chip)`}
              >
                <Clock3 className="h-4 w-4 text-(--accent-amber)" />
                {remainingTimeLabel}
              </button>
            </div>
            <p className="text-xs leading-6 text-(--text-muted)">
              {copy.hideControlsHint}
            </p>
          </div>
          <div
            className={cn(
              "hidden grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-3",
              isFullscreen && "sm:hidden",
            )}
          >
            <span className={statusChipClass}>
              {progress}% {copy.complete}
            </span>
            <span className={statusChipClass}>
              {sentenceCount} {copy.sentenceCount}
            </span>
            <button
              type="button"
              aria-label={`${copy.timeLeft}: ${remainingTimeLabel}`}
              onClick={onAnnounceRemainingTime}
              className={`${statusChipClass} gap-2 transition hover:border-(--border-strong) hover:bg-(--surface-chip)`}
            >
              <Clock3 className="h-4 w-4 text-(--accent-amber)" />
              {remainingTimeLabel}
            </button>
          </div>
          <p className="hidden text-sm leading-6 text-(--text-muted) sm:block sm:leading-7">
            {copy.readingModeHelp}
          </p>
          {activePresetSummary ? (
            <p className="hidden text-sm leading-6 text-(--text-muted) sm:block">
              <span className="mr-2 inline-flex rounded-full border border-(--border-soft) bg-(--surface-soft) px-2.5 py-1 text-[11px] tracking-[0.18em] text-(--accent-amber) uppercase">
                {activePreset
                  ? getLocalizedCopy(locale, presetCopy[activePreset.id].label)
                  : copy.customPreset}
              </span>
              {activePresetSummary}
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex min-h-0 flex-1 sm:mt-6">
          <div
            className="relative flex min-h-0 flex-1 items-stretch *:h-full"
            onClick={toggleMobileChrome}
          >
            {modeView}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center sm:hidden">
              {!isMobileChromeVisible ? (
                <span className="rounded-full border border-(--border-soft) bg-slate-950/66 px-3 py-1.5 text-xs tracking-[0.16em] text-white/88 uppercase shadow-[0_10px_26px_rgba(12,18,36,0.28)] backdrop-blur-md">
                  {copy.showControlsHint}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 space-y-3 border-t border-(--border-soft) pt-4 sm:pt-5",
          !isMobileChromeVisible && "hidden sm:block",
        )}
        aria-label="Reader transport and annotation controls"
      >
        <div className="grid grid-cols-4 gap-2 sm:hidden">
          <button
            type="button"
            aria-label={copy.previous}
            onClick={onMoveBackward}
            className={mobilePrimaryButtonClass}
          >
            <ChevronLeft className="h-4 w-4" />
            {copy.previous}
          </button>
          <button
            type="button"
            aria-label={isPlaying ? copy.pause : copy.play}
            onClick={onTogglePlayback}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-(--accent-sky)/35 bg-(--accent-sky)/16 px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--accent-sky)/55 hover:bg-(--accent-sky)/24"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isPlaying ? copy.pause : copy.play}
          </button>
          <button
            type="button"
            aria-label={copy.next}
            onClick={onMoveForward}
            className={mobilePrimaryButtonClass}
          >
            {copy.next}
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={copy.readingTools}
            onClick={() => {
              setOpenMenu(null);
              setIsMobileToolsOpen(true);
            }}
            className={mobilePrimaryButtonClass}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {copy.tools}
          </button>
        </div>
        <div className="hidden grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <div ref={saveMenuRef} className="relative z-30">
            <button
              type="button"
              aria-label={copy.save}
              onClick={() => {
                setOpenMenu((current) => (current === "save" ? null : "save"));
              }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--accent-amber)/35 bg-(--accent-amber)/16 px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--accent-amber)/55 hover:bg-(--accent-amber)/24 sm:w-auto sm:rounded-full sm:px-3.5"
            >
              <BookmarkPlus className="h-4 w-4" />
              {copy.save}
              <ChevronDown
                className={`h-4 w-4 transition ${openMenu === "save" ? "rotate-180" : ""}`}
              />
            </button>
            {openMenu === "save" ? (
              <div
                className={cn(
                  "reader-dropdown-panel absolute left-0 z-60 w-56 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
                  desktopBottomMenuPositionClass,
                )}
              >
                <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                  {copy.saveMenu}
                </p>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSaveBookmark();
                      setOpenMenu(null);
                    }}
                    className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    {copy.saveBookmark}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveHighlight();
                      setOpenMenu(null);
                    }}
                    className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    {copy.saveHighlight}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={isPlaying ? copy.pause : copy.play}
            onClick={onTogglePlayback}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[1rem] border border-(--accent-sky)/35 bg-(--accent-sky)/16 px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--accent-sky)/55 hover:bg-(--accent-sky)/24 sm:w-auto sm:rounded-full sm:px-3.5"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isPlaying ? copy.pause : copy.play}
          </button>
          <button
            type="button"
            aria-label={copy.previous}
            onClick={onMoveBackward}
            className={transportButtonClass}
          >
            <ChevronLeft className="h-4 w-4" />
            {copy.previous}
          </button>
          <button
            type="button"
            aria-label={copy.next}
            onClick={onMoveForward}
            className={transportButtonClass}
          >
            {copy.next}
            <ChevronRight className="h-4 w-4" />
          </button>
          <div ref={fontScaleMenuRef} className="relative z-30">
            <button
              type="button"
              aria-label={copy.fontScaleSettings}
              onClick={() => {
                setOpenMenu((current) =>
                  current === "font-scale" ? null : "font-scale",
                );
              }}
              className={settingsTriggerClass}
            >
              {copy.fontScale}
              <span className="text-(--text-muted)">
                {preferences.fontScale.toFixed(1)}x
              </span>
              <ChevronDown
                className={`h-4 w-4 transition ${openMenu === "font-scale" ? "rotate-180" : ""}`}
              />
            </button>
            {openMenu === "font-scale" ? (
              <div className={settingsPanelClass}>
                <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                  {copy.fontScale}
                </p>
                <div className={`${settingsRowClass} mt-3`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                        {copy.currentValue}
                      </p>
                      <p className="mt-1 text-sm text-(--text-strong)">
                        {preferences.fontScale.toFixed(1)}x
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={copy.decreaseFontScale}
                        onClick={() => {
                          onChangeFontScale(-0.1);
                        }}
                        className={compactStepButtonClass}
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        aria-label={copy.increaseFontScale}
                        onClick={() => {
                          onChangeFontScale(0.1);
                        }}
                        className={compactStepButtonClass}
                      >
                        +0.1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div ref={lineHeightMenuRef} className="relative z-30">
            <button
              type="button"
              aria-label={copy.lineHeightSettings}
              onClick={() => {
                setOpenMenu((current) =>
                  current === "line-height" ? null : "line-height",
                );
              }}
              className={settingsTriggerClass}
            >
              {copy.lineHeight}
              <span className="text-(--text-muted)">
                {preferences.lineHeight.toFixed(1)}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition ${openMenu === "line-height" ? "rotate-180" : ""}`}
              />
            </button>
            {openMenu === "line-height" ? (
              <div className={settingsPanelClass}>
                <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                  {copy.lineHeight}
                </p>
                <div className={`${settingsRowClass} mt-3`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                        {copy.currentValue}
                      </p>
                      <p className="mt-1 text-sm text-(--text-strong)">
                        {preferences.lineHeight.toFixed(1)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={copy.decreaseLineHeight}
                        onClick={() => {
                          onChangeLineHeight(-0.1);
                        }}
                        className={compactStepButtonClass}
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        aria-label={copy.increaseLineHeight}
                        onClick={() => {
                          onChangeLineHeight(0.1);
                        }}
                        className={compactStepButtonClass}
                      >
                        +0.1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div ref={playbackMenuRef} className="relative z-30">
            <button
              type="button"
              aria-label={copy.playbackSettings}
              onClick={() => {
                setOpenMenu((current) =>
                  current === "playback" ? null : "playback",
                );
              }}
              className={`${settingsTriggerClass} justify-between text-left sm:justify-center`}
            >
              <span className="flex flex-col items-start sm:contents">
                <span>{copy.playback}</span>
                <span className="text-xs text-(--text-muted) sm:hidden">
                  {preferences.wordsPerMinute} WPM · {chunkSize}{" "}
                  {chunkSize === 1 ? copy.word : copy.words}
                </span>
              </span>
              <span className="hidden text-(--text-muted) sm:inline">
                {preferences.wordsPerMinute} WPM
              </span>
              <span className="hidden text-(--text-muted)/60 sm:inline">•</span>
              <span className="hidden text-(--text-muted) sm:inline">
                {chunkSize} {chunkSize === 1 ? copy.word : copy.words}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition ${openMenu === "playback" ? "rotate-180" : ""}`}
              />
            </button>
            {openMenu === "playback" ? (
              <div className={settingsPanelClass}>
                <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                  {copy.playback}
                </p>
                <div className="mt-3 grid gap-2">
                  <div className={settingsRowClass}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                          {copy.speed}
                        </p>
                        <p className="mt-1 text-sm text-(--text-strong)">
                          {preferences.wordsPerMinute} WPM
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onChangeWordsPerMinute(-20);
                          }}
                          aria-label={copy.decreaseReadingSpeed}
                          className={compactStepButtonClass}
                        >
                          -20
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeWordsPerMinute(20);
                          }}
                          aria-label={copy.increaseReadingSpeed}
                          className={compactStepButtonClass}
                        >
                          +20
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={settingsRowClass}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                          {copy.chunkSize}
                        </p>
                        <p className="mt-1 text-sm text-(--text-strong)">
                          {chunkSize} {chunkSize === 1 ? copy.word : copy.words}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onDecreaseChunkSize}
                          aria-label={copy.decreaseChunkSize}
                          className={compactStepButtonClass}
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={onIncreaseChunkSize}
                          aria-label={copy.increaseChunkSize}
                          className={compactStepButtonClass}
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={onToggleNaturalPauses}
                      className={`rounded-[1rem] border px-3 py-3 text-left text-sm transition ${
                        preferences.naturalPauses
                          ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                          : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      }`}
                    >
                      {copy.naturalPauses}
                    </button>
                    <button
                      type="button"
                      onClick={onToggleReduceMotion}
                      className={`rounded-[1rem] border px-3 py-3 text-left text-sm transition ${
                        preferences.reduceMotion
                          ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                          : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      }`}
                    >
                      {copy.reduceMotion}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div ref={moreMenuRef} className="relative z-30">
            <button
              type="button"
              aria-label={copy.moreActions}
              onClick={() => {
                setOpenMenu((current) => (current === "more" ? null : "more"));
              }}
              className={settingsTriggerClass}
            >
              {copy.more}
              <ChevronDown
                className={`h-4 w-4 transition ${openMenu === "more" ? "rotate-180" : ""}`}
              />
            </button>
            {openMenu === "more" ? (
              <div
                className={cn(
                  "reader-dropdown-panel absolute right-0 z-60 w-56 max-w-[calc(100vw-2.5rem)] rounded-[1.25rem] border border-(--border-strong) p-3 shadow-[0_18px_60px_rgba(20,26,56,0.24)] backdrop-blur-xl",
                  desktopBottomMenuPositionClass,
                )}
              >
                <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                  {copy.moreActions}
                </p>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onMoveBackwardFive();
                      setOpenMenu(null);
                    }}
                    className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <span className="inline-flex items-center gap-2">
                      <SkipBack className="h-4 w-4" />
                      {copy.backFive}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRestart();
                      setOpenMenu(null);
                    }}
                    className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <span className="inline-flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      {copy.restart}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRestartParagraph();
                      setOpenMenu(null);
                    }}
                    className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Undo2 className="h-4 w-4" />
                      {copy.restartParagraph}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRepeatChunk();
                      setOpenMenu(null);
                    }}
                    className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <span className="inline-flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      {copy.repeatChunk}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onMoveForwardFive();
                      setOpenMenu(null);
                    }}
                    className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-left text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <span className="inline-flex items-center gap-2">
                      <SkipForward className="h-4 w-4" />
                      {copy.forwardFive}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isMobileToolsOpen ? (
        <div className="fixed inset-0 z-80 bg-slate-950/55 backdrop-blur-sm sm:hidden">
          <button
            type="button"
            aria-label={copy.closeTools}
            onClick={() => {
              setIsMobileChromeVisible(false);
              setIsMobileToolsOpen(false);
            }}
            className="absolute inset-0"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={copy.readingTools}
            className="absolute inset-x-0 bottom-0 max-h-[82svh] overflow-y-auto rounded-t-[1.6rem] border border-(--border-strong) bg-(--surface-card) p-4 shadow-[0_-20px_80px_rgba(20,26,56,0.28)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                  {copy.tools}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-(--text-strong)">
                  {copy.readingTools}
                </h3>
              </div>
              <button
                type="button"
                aria-label={copy.closeTools}
                onClick={() => {
                  setIsMobileChromeVisible(false);
                  setIsMobileToolsOpen(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <section className={mobileToolsSectionClass}>
                <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                  {copy.saveMenu}
                </p>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSaveBookmark();
                      setIsMobileChromeVisible(false);
                      setIsMobileToolsOpen(false);
                    }}
                    className={sheetActionButtonClass}
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    {copy.saveBookmark}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveHighlight();
                      setIsMobileChromeVisible(false);
                      setIsMobileToolsOpen(false);
                    }}
                    className={sheetActionButtonClass}
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    {copy.saveHighlight}
                  </button>
                </div>
              </section>

              <section className={mobileToolsSectionClass}>
                <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                  {copy.appearance}
                </p>
                <div className="mt-3 grid gap-2">
                  <div className={settingsRowClass}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                          {copy.fontScale}
                        </p>
                        <p className="mt-1 text-sm text-(--text-strong)">
                          {preferences.fontScale.toFixed(1)}x
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={copy.decreaseFontScale}
                          onClick={() => {
                            onChangeFontScale(-0.1);
                          }}
                          className={compactStepButtonClass}
                        >
                          -0.1
                        </button>
                        <button
                          type="button"
                          aria-label={copy.increaseFontScale}
                          onClick={() => {
                            onChangeFontScale(0.1);
                          }}
                          className={compactStepButtonClass}
                        >
                          +0.1
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={settingsRowClass}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                          {copy.lineHeight}
                        </p>
                        <p className="mt-1 text-sm text-(--text-strong)">
                          {preferences.lineHeight.toFixed(1)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={copy.decreaseLineHeight}
                          onClick={() => {
                            onChangeLineHeight(-0.1);
                          }}
                          className={compactStepButtonClass}
                        >
                          -0.1
                        </button>
                        <button
                          type="button"
                          aria-label={copy.increaseLineHeight}
                          onClick={() => {
                            onChangeLineHeight(0.1);
                          }}
                          className={compactStepButtonClass}
                        >
                          +0.1
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      isFullscreen ? copy.exitFullscreen : copy.enterFullscreen
                    }
                    onClick={() => {
                      void toggleFullscreen();
                      setIsMobileChromeVisible(false);
                      setIsMobileToolsOpen(false);
                    }}
                    className={sheetActionButtonClass}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                    {isFullscreen ? copy.collapse : copy.expand}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(themeLabels).map(([value, labels]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          onSelectTheme(value as ReaderPreferences["theme"]);
                        }}
                        className={`rounded-[1rem] border px-3 py-3 text-left text-sm transition ${
                          preferences.theme === value
                            ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                            : "border-(--border-soft) bg-(--surface-soft) text-(--text-strong) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                        }`}
                      >
                        {getLocalizedCopy(locale, labels)}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className={mobileToolsSectionClass}>
                <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                  {copy.playback}
                </p>
                <div className="mt-3 grid gap-2">
                  <div className={settingsRowClass}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                          {copy.speed}
                        </p>
                        <p className="mt-1 text-sm text-(--text-strong)">
                          {preferences.wordsPerMinute} WPM
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onChangeWordsPerMinute(-20);
                          }}
                          aria-label={copy.decreaseReadingSpeed}
                          className={compactStepButtonClass}
                        >
                          -20
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeWordsPerMinute(20);
                          }}
                          aria-label={copy.increaseReadingSpeed}
                          className={compactStepButtonClass}
                        >
                          +20
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={settingsRowClass}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                          {copy.chunkSize}
                        </p>
                        <p className="mt-1 text-sm text-(--text-strong)">
                          {chunkSize} {chunkSize === 1 ? copy.word : copy.words}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onDecreaseChunkSize}
                          aria-label={copy.decreaseChunkSize}
                          className={compactStepButtonClass}
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={onIncreaseChunkSize}
                          aria-label={copy.increaseChunkSize}
                          className={compactStepButtonClass}
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={onToggleNaturalPauses}
                      className={`rounded-[1rem] border px-3 py-3 text-left text-sm transition ${
                        preferences.naturalPauses
                          ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                          : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      }`}
                    >
                      {copy.naturalPauses}
                    </button>
                    <button
                      type="button"
                      onClick={onToggleReduceMotion}
                      className={`rounded-[1rem] border px-3 py-3 text-left text-sm transition ${
                        preferences.reduceMotion
                          ? "border-(--border-strong) bg-(--text-strong) text-(--text-on-accent)"
                          : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      }`}
                    >
                      {copy.reduceMotion}
                    </button>
                  </div>
                </div>
              </section>

              <section className={mobileToolsSectionClass}>
                <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                  {copy.moreActions}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onMoveBackwardFive();
                      setIsMobileChromeVisible(false);
                      setIsMobileToolsOpen(false);
                    }}
                    className={sheetActionButtonClass}
                  >
                    <SkipBack className="h-4 w-4" />
                    {copy.backFive}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onMoveForwardFive();
                      setIsMobileChromeVisible(false);
                      setIsMobileToolsOpen(false);
                    }}
                    className={sheetActionButtonClass}
                  >
                    <SkipForward className="h-4 w-4" />
                    {copy.forwardFive}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRestart();
                      setIsMobileChromeVisible(false);
                      setIsMobileToolsOpen(false);
                    }}
                    className={sheetActionButtonClass}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {copy.restart}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRestartParagraph();
                      setIsMobileChromeVisible(false);
                      setIsMobileToolsOpen(false);
                    }}
                    className={sheetActionButtonClass}
                  >
                    <Undo2 className="h-4 w-4" />
                    {copy.restartParagraph}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRepeatChunk();
                      setIsMobileChromeVisible(false);
                      setIsMobileToolsOpen(false);
                    }}
                    className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-3 py-2.5 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {copy.repeatChunk}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

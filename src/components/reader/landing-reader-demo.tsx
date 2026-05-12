"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { ArrowRight, NotebookPen, Sparkles } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { ClassicReaderView } from "@/components/reader/classic-reader-view";
import { FocusWordView } from "@/components/reader/focus-word-view";
import { GuidedLineView } from "@/components/reader/guided-line-view";
import { PhraseChunkView } from "@/components/reader/phrase-chunk-view";
import { ReaderCanvas } from "@/components/reader/canvas/reader-canvas";
import { buildDocumentModel } from "@/features/ingest/build/document-model";
import {
  clampChunkIndex,
  deriveReaderProgress,
  deriveRuntimeChunks,
  findChunkIndexByToken,
  jumpChunkIndex,
  repeatChunkIndex,
  resolveSessionChunkIndex,
  restartParagraphChunkIndex,
} from "@/features/reader/engine/navigation";
import { getRecommendedPreferences } from "@/features/reader/engine/presets";
import {
  deriveChunkDurationMs,
  deriveRemainingPlaybackMs,
} from "@/features/reader/engine/timing";
import { getLocalizedCopy } from "@/lib/locale";
import { useReaderStore } from "@/state/reader-store";
import {
  MAX_READER_WORDS_PER_MINUTE,
  MIN_READER_WORDS_PER_MINUTE,
  readerPresets,
  type ReaderMode,
  type ReaderPreferences,
} from "@/types/reader";

function formatRemainingTimeLabel(ms: number, locale: "en" | "es" | "pt") {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  switch (locale) {
    case "es":
      if (hours > 0) {
        return `Quedan ${hours}h ${minutes}m`;
      }

      if (minutes > 0) {
        return `Quedan ${minutes}m ${seconds}s`;
      }

      return `Quedan ${seconds}s`;
    case "pt":
      if (hours > 0) {
        return `Faltam ${hours}h ${minutes}m`;
      }

      if (minutes > 0) {
        return `Faltam ${minutes}m ${seconds}s`;
      }

      return `Faltam ${seconds}s`;
    default:
      if (hours > 0) {
        return `${hours}h ${minutes}m left`;
      }

      if (minutes > 0) {
        return `${minutes}m ${seconds}s left`;
      }

      return `${seconds}s left`;
  }
}

const demoIntroEyebrow = {
  en: "Try the reader first",
  es: "Prueba el lector primero",
  pt: "Teste o leitor primeiro",
};

const demoTitle = {
  en: "Use a live sample before you import your own document.",
  es: "Usa una muestra real antes de importar tu propio documento.",
  pt: "Use uma amostra real antes de importar seu proprio documento.",
};

const demoDescription = {
  en: "This built-in demo opens immediately, so you can test the assistive text modes before committing your own material. The saved reading goal above also changes the recommended starting setup here.",
  es: "Esta demo se abre al instante para que pruebes los modos asistidos antes de usar tu propio material. El objetivo guardado arriba también cambia el inicio recomendado aquí.",
  pt: "Esta demonstracao integrada abre na hora para que voce teste os modos assistidos de texto antes de usar seu proprio material. O objetivo de leitura salvo acima tambem muda o inicio recomendado aqui.",
};

const demoTipsTitle = {
  en: "What to test in sixty seconds",
  es: "Qué probar en sesenta segundos",
  pt: "O que testar em sessenta segundos",
};

const demoTips = {
  en: [
    "Switch modes to feel how pace changes when you move from focus to phrase groups.",
    "Use the playback controls to see whether a slightly higher speed improves attention instead of hurting it.",
    "Open Classic Reader to confirm the same passage stays understandable when you need full context back.",
  ],
  es: [
    "Cambia de modo para notar cómo cambia el ritmo al pasar del foco a los grupos de frases.",
    "Usa los controles de reproducción para ver si una velocidad algo mayor mejora la atención sin romper la comprensión.",
    "Abre el Lector clásico para confirmar que el mismo pasaje sigue claro cuando necesitas recuperar todo el contexto.",
  ],
  pt: [
    "Troque de modo para sentir como o ritmo muda quando voce sai do foco para grupos de frases.",
    "Use os controles de reproducao para ver se uma velocidade um pouco maior melhora a atencao em vez de quebrar a compreensao.",
    "Abra o Leitor classico para confirmar que o mesmo trecho continua claro quando voce precisa recuperar todo o contexto.",
  ],
};

const demoPdfNote = {
  en: "Standard PDF mode is not part of this sample because it needs the original PDF file and page assets. After import, that mode keeps the page layout, while the text modes trade layout fidelity for more pacing help.",
  es: "El modo PDF estándar no forma parte de esta muestra porque necesita el archivo original y sus páginas. Después de importar, ese modo conserva el diseño de la página, mientras los modos de texto cambian fidelidad visual por ayuda de ritmo.",
  pt: "O modo Standard PDF nao faz parte desta amostra porque precisa do arquivo PDF original e de suas paginas. Depois da importacao, esse modo preserva a pagina, enquanto os modos de texto trocam fidelidade de layout por mais ajuda de ritmo.",
};

const demoStatusIdle = {
  en: "Demo reader ready.",
  es: "Demo del lector lista.",
  pt: "Demo do leitor pronta.",
};

const demoRecommendedStart = {
  en: "Recommended start",
  es: "Inicio recomendado",
  pt: "Inicio recomendado",
};

const demoGoalLabel = {
  en: "Goal shaping this demo",
  es: "Objetivo que guía esta demo",
  pt: "Objetivo que guia esta demo",
};

const demoStructureSummary = {
  en: (sectionCount: number, sentenceCount: number) =>
    `${sectionCount} sections, ${sentenceCount} sentences`,
  es: (sectionCount: number, sentenceCount: number) =>
    `${sectionCount} secciones, ${sentenceCount} frases`,
  pt: (sectionCount: number, sentenceCount: number) =>
    `${sectionCount} secoes, ${sentenceCount} frases`,
};

const demoSaveMessage = {
  en: "This homepage demo does not save bookmarks or highlights. Import your own document to keep anchors.",
  es: "Esta demo de la página inicial no guarda marcadores ni destacados. Importa tu propio documento para conservar esos puntos.",
  pt: "Esta demonstracao da pagina inicial nao salva marcadores nem destaques. Importe seu proprio documento para manter esses pontos.",
};

const demoArticleTitle = {
  en: "Why reading deeply and reading faster can work together",
  es: "Por qué leer con profundidad y leer más rápido pueden funcionar juntos",
  pt: "Por que ler com profundidade e ler mais rapido podem funcionar juntos",
};

const demoArticle = {
  en: `# Why reading deeply and reading faster can work together

Reading is one of the few habits that improves vocabulary, background knowledge, pattern recognition, and long-term memory at the same time. When you read every day, you build a wider mental library, which makes future material easier to understand because fewer ideas arrive in isolation.

## What steady reading changes

People who read often usually notice three gains. First, comprehension improves because the brain sees more sentence structures, arguments, and transitions. Second, recall improves because repeated exposure helps the mind organize new information into stronger categories. Third, attention becomes more durable because reading trains you to stay with a thread instead of reacting to constant interruptions.

## Why a faster pace can help

Reading faster is useful when it is guided by comprehension instead of ego. A slightly higher pace often reduces the urge to reread every line, which keeps attention moving forward. That forward momentum can make articles, essays, and reports feel less heavy because you stop treating every sentence like a stopping point and start seeing the structure of the whole passage.

## How to increase speed without losing meaning

- Start with a calm pace that still feels easy to understand.
- Use phrase groups instead of sounding out each individual word.
- Let punctuation create natural pauses instead of braking after every chunk.
- Return to classic full-context reading when a paragraph deserves slower review.

## The practical payoff

Better reading speed is not only about finishing faster. It gives you more room to review difficult sections, compare sources, and stay engaged long enough to turn information into judgment. The goal is not to rush. The goal is to make focused reading sustainable.
`,
  es: `# Por qué leer con profundidad y leer más rápido pueden funcionar juntos

Leer es uno de los pocos hábitos que mejora al mismo tiempo el vocabulario, el conocimiento general, el reconocimiento de patrones y la memoria a largo plazo. Cuando lees cada día, construyes una biblioteca mental más amplia y el material futuro resulta más fácil de entender porque llegan menos ideas aisladas.

## Lo que cambia con una lectura constante

Quien lee con frecuencia suele notar tres mejoras. Primero, la comprensión mejora porque el cerebro reconoce más estructuras de frases, argumentos y transiciones. Segundo, el recuerdo mejora porque la exposición repetida ayuda a organizar la información nueva en categorías más firmes. Tercero, la atención dura más porque la lectura entrena a seguir un hilo en vez de reaccionar a interrupciones constantes.

## Por qué una velocidad mayor puede ayudar

Leer más rápido es útil cuando la comprensión guía el ritmo en lugar del ego. Un ritmo algo mayor suele reducir la tentación de releer cada línea y mantiene la atención avanzando. Ese impulso puede hacer que artículos, ensayos e informes pesen menos porque dejas de tratar cada frase como un punto de frenado y empiezas a ver la estructura completa del pasaje.

## Cómo ganar velocidad sin perder sentido

- Empieza con un ritmo sereno que siga siendo fácil de entender.
- Usa grupos de frases en lugar de pronunciar mentalmente cada palabra.
- Deja que la puntuación marque pausas naturales en vez de frenar después de cada bloque.
- Vuelve al Lector clásico cuando un párrafo merezca una revisión más lenta.

## El beneficio práctico

Una mejor velocidad de lectura no sirve solo para terminar antes. También te da más espacio para revisar secciones difíciles, comparar fuentes y mantener la atención el tiempo suficiente para convertir información en criterio. La meta no es correr. La meta es hacer sostenible la lectura enfocada.
`,
  pt: `# Por que ler com profundidade e ler mais rapido podem funcionar juntos

Ler e um dos poucos habitos que melhora ao mesmo tempo vocabulario, repertorio, reconhecimento de padroes e memoria de longo prazo. Quando voce le todos os dias, constroi uma biblioteca mental mais ampla e o material futuro fica mais facil de entender porque menos ideias chegam isoladas.

## O que muda com uma leitura constante

Quem le com frequencia costuma perceber tres ganhos. Primeiro, a compreensao melhora porque o cerebro passa a reconhecer mais estruturas de frases, argumentos e transicoes. Segundo, a lembranca melhora porque a exposicao repetida ajuda a organizar informacoes novas em categorias mais firmes. Terceiro, a atencao dura mais porque a leitura treina voce a seguir um fio em vez de reagir a interrupcoes o tempo todo.

## Por que um ritmo mais rapido pode ajudar

Ler mais rapido e util quando a compreensao guia o ritmo em vez do ego. Uma velocidade um pouco maior costuma reduzir a vontade de reler cada linha e mantem a atencao seguindo em frente. Esse impulso pode deixar artigos, ensaios e relatorios menos pesados porque voce para de tratar cada frase como um ponto de freio e comeca a enxergar a estrutura do trecho inteiro.

## Como ganhar velocidade sem perder sentido

- Comece com um ritmo calmo que ainda pareca facil de entender.
- Use grupos de frases em vez de processar cada palavra isoladamente.
- Deixe a pontuacao criar pausas naturais em vez de frear depois de cada bloco.
- Volte ao leitor classico quando um paragrafo merecer uma revisao mais lenta.

## O ganho pratico

Ler melhor e mais rapido nao serve apenas para terminar antes. Isso tambem abre mais espaco para revisar trechos dificeis, comparar fontes e manter a atencao tempo suficiente para transformar informacao em criterio. O objetivo nao e correr. O objetivo e tornar a leitura focada sustentavel.
`,
};

export function LandingReaderDemo() {
  const { locale } = useLocale();
  const savedReadingGoal = useReaderStore(
    (state) => state.preferences.readingGoal,
  );
  const demoGoal = savedReadingGoal ?? "read-faster";
  const recommendedDemoPreferences = useMemo(
    () => getRecommendedPreferences(demoGoal),
    [demoGoal],
  );
  const localizedDemoGoalLabel = getLocalizedCopy(locale, {
    en:
      demoGoal === "study-carefully"
        ? "Study carefully"
        : demoGoal === "read-faster"
          ? "Read faster"
          : demoGoal === "skim-overview"
            ? "Skim for overview"
            : "Practice focus",
    es:
      demoGoal === "study-carefully"
        ? "Estudiar con calma"
        : demoGoal === "read-faster"
          ? "Leer más rápido"
          : demoGoal === "skim-overview"
            ? "Vista general"
            : "Practicar concentración",
    pt:
      demoGoal === "study-carefully"
        ? "Estudar com calma"
        : demoGoal === "read-faster"
          ? "Ler mais rapido"
          : demoGoal === "skim-overview"
            ? "Ler por panorama"
            : "Praticar foco",
  });
  const [preferences, setPreferences] = useState<ReaderPreferences>(() => ({
    ...recommendedDemoPreferences,
    fontScale: 1,
    lineHeight: 1.6,
    readingGoal: demoGoal,
    theme: "ember" as const,
  }));
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    getLocalizedCopy(locale, demoStatusIdle),
  );
  const lastAnchorTokenRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setStatusMessage(getLocalizedCopy(locale, demoStatusIdle));
  }, [locale]);

  useEffect(() => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      ...recommendedDemoPreferences,
      readingGoal: demoGoal,
    }));
    setCurrentChunkIndex(0);
    setIsPlaying(false);
  }, [demoGoal, recommendedDemoPreferences]);

  const document = useMemo(
    () =>
      buildDocumentModel({
        rawText: getLocalizedCopy(locale, demoArticle),
        sourceKind: "markdown",
        title: getLocalizedCopy(locale, demoArticleTitle),
      }),
    [locale],
  );

  const runtimeChunks = useMemo(
    () =>
      deriveRuntimeChunks(document, {
        chunkSize: preferences.chunkSize,
        focusWindow: preferences.focusWindow,
        mode: preferences.mode,
      }),
    [
      document,
      preferences.chunkSize,
      preferences.focusWindow,
      preferences.mode,
    ],
  );
  const resolvedChunkIndex = runtimeChunks.length
    ? clampChunkIndex(runtimeChunks.length, currentChunkIndex)
    : 0;
  const activeChunk = runtimeChunks[resolvedChunkIndex];

  useEffect(() => {
    if (!activeChunk) {
      return;
    }

    lastAnchorTokenRef.current = activeChunk.anchorTokenIndex;
  }, [activeChunk]);

  useEffect(() => {
    if (runtimeChunks.length === 0) {
      return;
    }

    const currentTokenIndex = lastAnchorTokenRef.current;
    if (currentTokenIndex === undefined) {
      return;
    }

    const nextIndex = resolveSessionChunkIndex(runtimeChunks, {
      currentChunkIndex: resolvedChunkIndex,
      currentTokenIndex,
    });

    if (nextIndex === resolvedChunkIndex) {
      return;
    }

    startTransition(() => {
      setCurrentChunkIndex(nextIndex);
    });
  }, [resolvedChunkIndex, runtimeChunks]);

  useEffect(() => {
    if (!isPlaying || !activeChunk) {
      return;
    }

    const durationMs = deriveChunkDurationMs(activeChunk, preferences);
    const timeoutId = window.setTimeout(() => {
      setCurrentChunkIndex((currentIndex) => {
        const nextIndex = jumpChunkIndex(runtimeChunks.length, currentIndex, 1);

        if (nextIndex === currentIndex) {
          setIsPlaying(false);
          return currentIndex;
        }

        return nextIndex;
      });
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeChunk, isPlaying, preferences, runtimeChunks.length]);

  const remainingTimeLabel = useMemo(() => {
    return formatRemainingTimeLabel(
      deriveRemainingPlaybackMs(runtimeChunks, resolvedChunkIndex, preferences),
      locale,
    );
  }, [locale, preferences, resolvedChunkIndex, runtimeChunks]);

  const modeLabel = getLocalizedCopy(locale, {
    en:
      preferences.mode === "focus-word"
        ? "Focus Word"
        : preferences.mode === "phrase-chunk"
          ? "Phrase Chunk"
          : preferences.mode === "guided-line"
            ? "Guided Line"
            : "Classic Reader",
    es:
      preferences.mode === "focus-word"
        ? "Foco por palabra"
        : preferences.mode === "phrase-chunk"
          ? "Bloques de frases"
          : preferences.mode === "guided-line"
            ? "Línea guiada"
            : "Lector clásico",
    pt:
      preferences.mode === "focus-word"
        ? "Palavra foco"
        : preferences.mode === "phrase-chunk"
          ? "Blocos de frases"
          : preferences.mode === "guided-line"
            ? "Linha guiada"
            : "Leitor classico",
  });
  const recommendedStartLabel = useMemo(() => {
    const recommendedModeLabel = getLocalizedCopy(locale, {
      en:
        recommendedDemoPreferences.mode === "focus-word"
          ? "Focus Word"
          : recommendedDemoPreferences.mode === "phrase-chunk"
            ? "Phrase Chunk"
            : recommendedDemoPreferences.mode === "guided-line"
              ? "Guided Line"
              : "Classic Reader",
      es:
        recommendedDemoPreferences.mode === "focus-word"
          ? "Foco por palabra"
          : recommendedDemoPreferences.mode === "phrase-chunk"
            ? "Bloques de frases"
            : recommendedDemoPreferences.mode === "guided-line"
              ? "Línea guiada"
              : "Lector clásico",
      pt:
        recommendedDemoPreferences.mode === "focus-word"
          ? "Palavra foco"
          : recommendedDemoPreferences.mode === "phrase-chunk"
            ? "Blocos de frases"
            : recommendedDemoPreferences.mode === "guided-line"
              ? "Linha guiada"
              : "Leitor classico",
    });

    return locale === "en"
      ? `${recommendedModeLabel} at ${recommendedDemoPreferences.wordsPerMinute} WPM`
      : locale === "es"
        ? `${recommendedModeLabel} a ${recommendedDemoPreferences.wordsPerMinute} WPM`
        : `${recommendedModeLabel} a ${recommendedDemoPreferences.wordsPerMinute} WPM`;
  }, [locale, recommendedDemoPreferences.mode, recommendedDemoPreferences.wordsPerMinute]);

  const modeView = useMemo(() => {
    if (!activeChunk) {
      return null;
    }

    const handleJumpToToken = (tokenIndex: number) => {
      setCurrentChunkIndex(findChunkIndexByToken(runtimeChunks, tokenIndex));
    };

    switch (preferences.mode) {
      case "focus-word":
        return <FocusWordView document={document} chunk={activeChunk} />;
      case "phrase-chunk":
        return (
          <PhraseChunkView
            document={document}
            chunk={activeChunk}
            chunks={runtimeChunks}
          />
        );
      case "guided-line":
        return (
          <GuidedLineView
            document={document}
            chunk={activeChunk}
            chunks={runtimeChunks}
            focusWindow={preferences.focusWindow}
            onJumpToToken={handleJumpToToken}
          />
        );
      default:
        return (
          <ClassicReaderView
            document={document}
            chunk={activeChunk}
            onJumpToToken={handleJumpToToken}
            reduceMotion={preferences.reduceMotion}
            useMarkdownPreview={false}
          />
        );
    }
  }, [
    activeChunk,
    document,
    preferences.focusWindow,
    preferences.mode,
    preferences.reduceMotion,
    runtimeChunks,
  ]);

  if (!activeChunk || !modeView) {
    return null;
  }

  const canvasClassName = "min-h-176 md:min-h-232 lg:min-h-248";

  return (
    <section className="fade-rise-delayed grid gap-6 xl:grid-cols-[0.7fr_minmax(0,1fr)] xl:items-start">
      <div
        data-testid="landing-reader-demo-copy"
        className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-7 shadow-[0_20px_80px_rgba(20,26,56,0.1)] backdrop-blur-xl xl:min-h-[86vh]"
      >
        <p className="editorial-kicker text-(--accent-amber)">
          {getLocalizedCopy(locale, demoIntroEyebrow)}
        </p>
        <h2 className="font-heading mt-4 text-3xl leading-tight font-semibold text-(--text-strong) sm:text-4xl">
          {getLocalizedCopy(locale, demoTitle)}
        </h2>
        <p className="mt-4 text-base leading-8 text-(--text-muted)">
          {getLocalizedCopy(locale, demoDescription)}
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-5">
          <div className="flex items-center gap-3 text-(--text-strong)">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-(--surface-chip) text-(--accent-sky)">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm tracking-[0.18em] text-(--text-muted) uppercase">
                {getLocalizedCopy(locale, {
                  en: "Demo article",
                  es: "Artículo de prueba",
                  pt: "Artigo de teste",
                })}
              </p>
              <p className="mt-1 font-medium text-(--text-strong)">
                {getLocalizedCopy(locale, demoArticleTitle)}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-(--border-soft) bg-(--surface-card) px-4 py-4">
              <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                {getLocalizedCopy(locale, demoRecommendedStart)}
              </p>
              <p className="mt-2 text-lg font-semibold text-(--text-strong)">
                {recommendedStartLabel}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-(--border-soft) bg-(--surface-card) px-4 py-4">
              <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                {getLocalizedCopy(locale, demoGoalLabel)}
              </p>
              <p className="mt-2 text-lg font-semibold text-(--text-strong)">
                {localizedDemoGoalLabel}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-(--border-soft) bg-(--surface-card) px-4 py-4">
              <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                {getLocalizedCopy(locale, {
                  en: "Structure",
                  es: "Estructura",
                  pt: "Estrutura",
                })}
              </p>
              <p className="mt-2 text-lg font-semibold text-(--text-strong)">
                {demoStructureSummary[locale](
                  document.sections.length,
                  document.sentences.length,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-5">
          <div className="flex items-center gap-3 text-(--text-strong)">
            <NotebookPen className="h-5 w-5 text-(--accent-sky)" />
            <h3 className="text-lg font-semibold">
              {getLocalizedCopy(locale, demoTipsTitle)}
            </h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-(--text-muted)">
            {demoTips[locale].map((tip) => (
              <li key={tip} className="flex gap-3">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-(--accent-amber)" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4 text-sm leading-7 text-(--text-muted)">
          {getLocalizedCopy(locale, demoPdfNote)}
        </div>
      </div>

      <div
        className="relative z-20 flex min-h-0 flex-col space-y-4 xl:self-stretch"
        data-reader-theme={preferences.theme}
        data-reader-font-scale={preferences.fontScale.toFixed(1)}
        data-reader-line-height={preferences.lineHeight.toFixed(1)}
      >
        <p className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </p>
        <ReaderCanvas
          activeGoalLabel={localizedDemoGoalLabel}
          availableModes={[
            "focus-word",
            "phrase-chunk",
            "guided-line",
            "classic-reader",
          ]}
          className={canvasClassName}
          chunkSize={preferences.chunkSize}
          currentParagraphNumber={activeChunk.paragraphIndex + 1}
          isPlaying={isPlaying}
          modeLabel={modeLabel}
          modeView={modeView}
          remainingTimeLabel={remainingTimeLabel}
          preferences={preferences}
          sentenceCount={document.sentences.length}
          onAnnounceRemainingTime={() => {
            setStatusMessage(remainingTimeLabel);
          }}
          onChangeFontScale={(delta) => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              fontScale: Math.max(
                0.9,
                Math.min(
                  1.6,
                  Number((currentPreferences.fontScale + delta).toFixed(1)),
                ),
              ),
            }));
          }}
          onChangeLineHeight={(delta) => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              lineHeight: Math.max(
                1.3,
                Math.min(
                  2.2,
                  Number((currentPreferences.lineHeight + delta).toFixed(1)),
                ),
              ),
            }));
          }}
          onChangeWordsPerMinute={(delta) => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              wordsPerMinute: Math.max(
                MIN_READER_WORDS_PER_MINUTE,
                Math.min(
                  MAX_READER_WORDS_PER_MINUTE,
                  currentPreferences.wordsPerMinute + delta,
                ),
              ),
            }));
          }}
          onDecreaseChunkSize={() => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              chunkSize: Math.max(1, currentPreferences.chunkSize - 1),
            }));
          }}
          onIncreaseChunkSize={() => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              chunkSize: Math.min(6, currentPreferences.chunkSize + 1),
            }));
          }}
          onMoveBackward={() => {
            setCurrentChunkIndex((currentIndex) =>
              jumpChunkIndex(runtimeChunks.length, currentIndex, -1),
            );
          }}
          onMoveBackwardFive={() => {
            setCurrentChunkIndex((currentIndex) =>
              jumpChunkIndex(runtimeChunks.length, currentIndex, -5),
            );
          }}
          onMoveForward={() => {
            setCurrentChunkIndex((currentIndex) =>
              jumpChunkIndex(runtimeChunks.length, currentIndex, 1),
            );
          }}
          onMoveForwardFive={() => {
            setCurrentChunkIndex((currentIndex) =>
              jumpChunkIndex(runtimeChunks.length, currentIndex, 5),
            );
          }}
          onRepeatChunk={() => {
            setCurrentChunkIndex((currentIndex) =>
              repeatChunkIndex(currentIndex),
            );
          }}
          onRestart={() => {
            setIsPlaying(false);
            setCurrentChunkIndex(0);
          }}
          onRestartParagraph={() => {
            setCurrentChunkIndex((currentIndex) =>
              restartParagraphChunkIndex(runtimeChunks, currentIndex),
            );
          }}
          onSaveBookmark={() => {
            setStatusMessage(getLocalizedCopy(locale, demoSaveMessage));
          }}
          onSaveHighlight={() => {
            setStatusMessage(getLocalizedCopy(locale, demoSaveMessage));
          }}
          onSelectMode={(mode) => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              mode,
            }));
          }}
          onSelectPreset={(presetId) => {
            const preset = readerPresets.find(
              (candidate) => candidate.id === presetId,
            );
            if (!preset) {
              return;
            }

            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              chunkSize: preset.chunkSize,
              focusWindow: preset.focusWindow,
              mode: preset.mode,
              naturalPauses: preset.naturalPauses,
              reduceMotion: preset.reduceMotion,
              smartPacing: preset.smartPacing,
              wordsPerMinute: preset.wordsPerMinute,
            }));
          }}
          onSelectTheme={(theme) => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              theme,
            }));
          }}
          onToggleNaturalPauses={() => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              naturalPauses: !currentPreferences.naturalPauses,
            }));
          }}
          onTogglePlayback={() => {
            setIsPlaying((currentValue) => !currentValue);
          }}
          onToggleReduceMotion={() => {
            setPreferences((currentPreferences) => ({
              ...currentPreferences,
              reduceMotion: !currentPreferences.reduceMotion,
            }));
          }}
          progress={deriveReaderProgress(
            { chunks: runtimeChunks },
            resolvedChunkIndex,
          )}
        />
      </div>
    </section>
  );
}

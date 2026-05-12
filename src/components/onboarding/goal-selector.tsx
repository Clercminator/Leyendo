"use client";

import { useEffect, useRef, useState } from "react";

import { Brain, Gauge, Search, Sparkle } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import {
  getStoredReaderPreferences,
  saveReaderPreferences,
} from "@/db/repositories";
import {
  getRecommendedPreferences,
} from "@/features/reader/engine/presets";
import { useReaderStore } from "@/state/reader-store";
import type { ReadingGoal } from "@/types/reader";
import { getLocalizedCopy } from "@/lib/locale";

const goals = [
  {
    value: "study-carefully" as const,
    title: {
      en: "Study carefully",
      es: "Estudiar con calma",
      pt: "Estudar com calma",
    },
    description: {
      en: "Slow down a little and keep comprehension first.",
      es: "Reduce un poco el ritmo y prioriza la comprensión.",
      pt: "Diminua um pouco o ritmo e priorize a compreensao.",
    },
    icon: Brain,
  },
  {
    value: "read-faster" as const,
    title: {
      en: "Read faster",
      es: "Leer más rápido",
      pt: "Ler mais rapido",
    },
    description: {
      en: "Increase pace while keeping forgiving controls nearby.",
      es: "Aumenta el ritmo sin perder controles útiles cerca.",
      pt: "Aumente o ritmo sem perder controles uteis por perto.",
    },
    icon: Gauge,
  },
  {
    value: "skim-overview" as const,
    title: {
      en: "Skim for overview",
      es: "Vista general",
      pt: "Ler por panorama",
    },
    description: {
      en: "Move quickly across the document to get the structure.",
      es: "Recorre el documento rápido para captar la estructura.",
      pt: "Percorra o documento rapidamente para entender a estrutura.",
    },
    icon: Search,
  },
  {
    value: "practice-focus" as const,
    title: {
      en: "Practice focus",
      es: "Practicar concentración",
      pt: "Praticar foco",
    },
    description: {
      en: "Reduce visual noise and stay locked into the text.",
      es: "Reduce el ruido visual y mantén la atención dentro del texto.",
      pt: "Reduza o ruido visual e mantenha-se dentro do texto.",
    },
    icon: Sparkle,
  },
];

interface GoalSelectorProps {
  compact?: boolean;
}

export function GoalSelector({ compact = false }: GoalSelectorProps) {
  const { locale } = useLocale();
  const { preferences, updatePreferences } = useReaderStore();
  const [selectedGoal, setSelectedGoal] = useState<ReadingGoal | undefined>(
    preferences.readingGoal,
  );
  const hasUserSelectionRef = useRef(false);
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const storedPreferences = await getStoredReaderPreferences();

      if (cancelled || hasUserSelectionRef.current) {
        return;
      }

      updatePreferences(storedPreferences);
      setSelectedGoal(storedPreferences.readingGoal);
    })();

    return () => {
      cancelled = true;
    };
  }, [updatePreferences]);

  const handleGoalSelection = async (goal: ReadingGoal) => {
    hasUserSelectionRef.current = true;

    const nextPreferences = {
      ...preferences,
      ...getRecommendedPreferences(goal),
      readingGoal: goal,
    };

    setSelectedGoal(goal);
    updatePreferences(nextPreferences);
    await saveReaderPreferences(nextPreferences);
  };

  const moveSelection = (currentValue: ReadingGoal, delta: number) => {
    const currentIndex = goals.findIndex((goal) => goal.value === currentValue);
    const nextIndex = (currentIndex + delta + goals.length) % goals.length;
    const nextGoal = goals[nextIndex];
    if (!nextGoal) {
      return;
    }

    optionRefs.current[nextIndex]?.focus();
    void handleGoalSelection(nextGoal.value);
  };

  const selectedGoalOption = goals.find((goal) => goal.value === selectedGoal);
  const selectedGoalLabel = selectedGoalOption
    ? getLocalizedCopy(locale, selectedGoalOption.title)
    : undefined;
  const HeadingTag = compact ? "h3" : "h2";

  return (
    <section
      aria-labelledby="goal-selector-title"
      className={
        compact
          ? ""
          : "rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl sm:p-8"
      }
    >
      <div className={compact ? "max-w-xl" : "max-w-2xl"}>
        <p
          className={
            compact
              ? "text-xs tracking-[0.22em] text-(--accent-amber) uppercase"
              : "text-sm tracking-[0.28em] text-(--accent-amber) uppercase"
          }
        >
          {locale === "en"
            ? "Reading setup"
            : locale === "es"
              ? "Preparación de lectura"
              : "Preparacao de leitura"}
        </p>
        <HeadingTag
          id="goal-selector-title"
          className={
            compact
              ? "font-heading mt-3 text-2xl font-semibold text-(--text-strong)"
              : "font-heading mt-3 text-3xl font-semibold text-(--text-strong)"
          }
        >
          {locale === "en"
            ? "Start by choosing how you want this session to feel."
            : locale === "es"
              ? "Empieza eligiendo cómo quieres que se sienta esta sesión."
              : "Comece escolhendo como voce quer que esta sessao se comporte."}
        </HeadingTag>
        {compact ? null : (
          <p
            id="goal-selector-help"
            className="mt-3 text-base leading-8 text-(--text-muted) [text-align:justify]"
          >
            {locale === "en"
              ? "This keeps setup approachable and lets Leyendo recommend a mode instead of forcing you through a dense settings screen."
              : locale === "es"
                ? "Así todo arranca simple y Leyendo puede recomendar un modo sin llevarte a una pantalla cargada de ajustes."
                : "Assim o inicio continua simples e o Leyendo pode recomendar um modo sem jogar voce em uma tela densa de ajustes."}
          </p>
        )}
      </div>
      <div
        className={
          compact
            ? "mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            : "mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        }
        role="radiogroup"
        aria-labelledby="goal-selector-title"
        aria-describedby={compact ? undefined : "goal-selector-help"}
      >
        {goals.map(({ value, title, description, icon: Icon }, index) => (
          <label
            key={value}
            className={`relative cursor-pointer border text-left transition hover:-translate-y-0.5 ${
              compact ? "rounded-[1.35rem] p-4" : "rounded-[1.5rem] p-5"
            } ${
              selectedGoal === value
                ? "border-(--border-strong) bg-(--surface-soft) shadow-[0_0_0_1px_rgba(20,26,56,0.04)]"
                : "border-(--border-soft) bg-(--surface-strong) hover:border-(--border-strong)"
            }`}
          >
            <input
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="radio"
              name="reading-goal"
              value={value}
              checked={selectedGoal === value}
              aria-describedby={`goal-description-${value}`}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={() => {
                void handleGoalSelection(value);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveSelection(value, 1);
                }

                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveSelection(value, -1);
                }

                if (event.key === "Home") {
                  event.preventDefault();
                  optionRefs.current[0]?.focus();
                  void handleGoalSelection(goals[0].value);
                }

                if (event.key === "End") {
                  event.preventDefault();
                  const lastGoal = goals.at(-1);
                  if (!lastGoal) {
                    return;
                  }

                  optionRefs.current[goals.length - 1]?.focus();
                  void handleGoalSelection(lastGoal.value);
                }
              }}
            />
            <div
              className={
                compact
                  ? "flex h-10 w-10 items-center justify-center rounded-[1.1rem] bg-(--surface-chip) text-(--accent-sky)"
                  : "flex h-12 w-12 items-center justify-center rounded-2xl bg-(--surface-chip) text-(--accent-sky)"
              }
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <h3
                className={
                  compact
                    ? "text-base font-medium text-(--text-strong)"
                    : "text-lg font-medium text-(--text-strong)"
                }
              >
                {getLocalizedCopy(locale, title)}
              </h3>
              {selectedGoal === value ? (
                <span
                  className={
                    compact
                      ? "rounded-full border border-(--border-soft) bg-(--text-strong) px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] text-(--text-on-accent) uppercase"
                      : "rounded-full border border-(--border-soft) bg-(--text-strong) px-2.5 py-1 text-xs font-medium text-(--text-on-accent)"
                  }
                >
                  {locale === "en"
                    ? "Selected"
                    : locale === "es"
                      ? "Elegido"
                      : "Selecionado"}
                </span>
              ) : null}
            </div>
            <p
              id={`goal-description-${value}`}
              className={
                compact
                  ? "mt-2 text-sm leading-6 text-(--text-muted) [text-align:justify]"
                  : "mt-2 text-sm leading-7 text-(--text-muted) [text-align:justify]"
              }
            >
              {getLocalizedCopy(locale, description)}
            </p>
          </label>
        ))}
      </div>
      {compact ? null : (
        <p className="mt-4 text-sm leading-7 text-(--text-muted) [text-align:justify]">
          {selectedGoal
            ? locale === "en"
              ? `${selectedGoalLabel} is saved as your current onboarding goal and will shape the next reader session.`
              : locale === "es"
                ? `${selectedGoalLabel} se guarda como tu objetivo actual y orienta la siguiente sesión.`
                : `${selectedGoalLabel} foi salvo como seu objetivo atual e vai orientar a proxima sessao.`
            : locale === "en"
              ? "Choosing a goal updates the recommended reader mode and pacing for your next session, while keeping your theme and typography settings intact."
              : locale === "es"
                ? "Elegir un objetivo actualiza el modo recomendado y el ritmo de tu próxima sesión, sin cambiar el tema ni la tipografía."
                : "Escolher um objetivo atualiza o modo recomendado e o ritmo da proxima sessao, sem perder tema nem tipografia."}
        </p>
      )}
    </section>
  );
}

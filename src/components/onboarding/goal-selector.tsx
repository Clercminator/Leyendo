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
  getReadingGoalLabel,
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
      es: "Reduce un poco el ritmo y prioriza la comprension.",
      pt: "Diminua um pouco o ritmo e priorize a compreensao.",
    },
    icon: Brain,
  },
  {
    value: "read-faster" as const,
    title: {
      en: "Read faster",
      es: "Leer mas rapido",
      pt: "Ler mais rapido",
    },
    description: {
      en: "Increase pace while keeping forgiving controls nearby.",
      es: "Aumenta el ritmo sin perder controles utiles cerca.",
      pt: "Aumente o ritmo sem perder controles uteis por perto.",
    },
    icon: Gauge,
  },
  {
    value: "skim-overview" as const,
    title: {
      en: "Skim for overview",
      es: "Explorar panorama",
      pt: "Ler por panorama",
    },
    description: {
      en: "Move quickly across the document to get the structure.",
      es: "Recorre el documento con rapidez para entender la estructura.",
      pt: "Percorra o documento rapidamente para entender a estrutura.",
    },
    icon: Search,
  },
  {
    value: "practice-focus" as const,
    title: {
      en: "Practice focus",
      es: "Practicar enfoque",
      pt: "Praticar foco",
    },
    description: {
      en: "Reduce visual noise and stay locked into the text.",
      es: "Reduce el ruido visual y mantente dentro del texto.",
      pt: "Reduza o ruido visual e mantenha-se dentro do texto.",
    },
    icon: Sparkle,
  },
];

export function GoalSelector() {
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

  return (
    <section
      aria-labelledby="goal-selector-title"
      className="rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl sm:p-8"
    >
      <div className="max-w-2xl">
        <p className="text-sm tracking-[0.28em] text-(--accent-amber) uppercase">
          {locale === "en"
            ? "Reading setup"
            : locale === "es"
              ? "Preparacion de lectura"
              : "Preparacao de leitura"}
        </p>
        <h2
          id="goal-selector-title"
          className="font-heading mt-3 text-3xl font-semibold text-(--text-strong)"
        >
          {locale === "en"
            ? "Start by choosing how you want this session to feel."
            : locale === "es"
              ? "Empieza eligiendo como quieres que se sienta esta sesion."
              : "Comece escolhendo como voce quer que esta sessao se comporte."}
        </h2>
        <p
          id="goal-selector-help"
          className="mt-3 text-base leading-8 text-(--text-muted)"
        >
          {locale === "en"
            ? "This keeps setup approachable and lets Leyendo recommend a mode instead of forcing you through a dense settings screen."
            : locale === "es"
              ? "Asi el inicio se mantiene simple y Leyendo puede recomendar un modo sin enviarte a una pantalla densa de ajustes."
              : "Assim o inicio continua simples e o Leyendo pode recomendar um modo sem jogar voce em uma tela densa de ajustes."}
        </p>
      </div>
      <div
        className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        role="radiogroup"
        aria-labelledby="goal-selector-title"
        aria-describedby="goal-selector-help"
      >
        {goals.map(({ value, title, description, icon: Icon }, index) => (
          <label
            key={value}
            className={`relative cursor-pointer rounded-[1.5rem] border p-5 text-left transition hover:-translate-y-0.5 ${
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--surface-chip) text-(--accent-sky)">
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium text-(--text-strong)">
                {getLocalizedCopy(locale, title)}
              </h3>
              {selectedGoal === value ? (
                <span className="rounded-full border border-(--border-soft) bg-(--text-strong) px-2.5 py-1 text-xs font-medium text-(--text-on-accent)">
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
              className="mt-2 text-sm leading-7 text-(--text-muted)"
            >
              {getLocalizedCopy(locale, description)}
            </p>
          </label>
        ))}
      </div>
      <p className="mt-4 text-sm leading-7 text-(--text-muted)">
        {selectedGoal
          ? locale === "en"
            ? `${getReadingGoalLabel(selectedGoal)} is saved as your current onboarding goal and will shape the next reader session.`
            : locale === "es"
              ? `${getReadingGoalLabel(selectedGoal)} queda guardado como tu objetivo actual y dara forma a la siguiente sesion.`
              : `${getReadingGoalLabel(selectedGoal)} foi salvo como seu objetivo atual e vai orientar a proxima sessao.`
          : locale === "en"
            ? "Choosing a goal updates the recommended reader mode and pacing for your next session, while keeping your theme and typography settings intact."
            : locale === "es"
              ? "Elegir un objetivo actualiza el modo recomendado y el ritmo de tu proxima sesion, sin perder tema ni tipografia."
              : "Escolher um objetivo atualiza o modo recomendado e o ritmo da proxima sessao, sem perder tema nem tipografia."}
      </p>
    </section>
  );
}

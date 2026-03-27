import {
  AlignLeft,
  Focus,
  GalleryHorizontalEnd,
  WholeWord,
} from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";

const modes = [
  {
    name: { en: "Focus Word", es: "Palabra foco", pt: "Palavra foco" },
    description: {
      en: "One word at a time for maximum focus and minimal eye travel.",
      es: "Una palabra a la vez para maxima concentracion y menos movimiento ocular.",
      pt: "Uma palavra por vez para foco maximo e menos movimento ocular.",
    },
    bestFor: {
      en: "Best for deep concentration",
      es: "Ideal para concentracion profunda",
      pt: "Ideal para concentracao profunda",
    },
    icon: WholeWord,
  },
  {
    name: {
      en: "Phrase Chunk",
      es: "Bloques de frases",
      pt: "Blocos de frases",
    },
    description: {
      en: "Small groups of words for a more natural RSVP flow.",
      es: "Pequenos grupos de palabras para un flujo mas natural.",
      pt: "Pequenos grupos de palavras para um fluxo mais natural.",
    },
    bestFor: {
      en: "Best for balanced speed practice",
      es: "Ideal para velocidad equilibrada",
      pt: "Ideal para velocidade equilibrada",
    },
    icon: GalleryHorizontalEnd,
  },
  {
    name: { en: "Guided Line", es: "Linea guiada", pt: "Linha guiada" },
    description: {
      en: "A moving emphasis across a line or tight line group.",
      es: "Un enfasis en movimiento sobre una linea o grupo corto de lineas.",
      pt: "Um enfase em movimento sobre uma linha ou grupo curto de linhas.",
    },
    bestFor: {
      en: "Best for comprehension with motion guidance",
      es: "Ideal para comprension con guia visual",
      pt: "Ideal para compreensao com guia visual",
    },
    icon: Focus,
  },
  {
    name: { en: "Classic Reader", es: "Lector clasico", pt: "Leitor classico" },
    description: {
      en: "A calmer page view with assistive controls always nearby.",
      es: "Una vista mas calmada con controles utiles siempre cerca.",
      pt: "Uma vista mais calma com controles uteis sempre por perto.",
    },
    bestFor: {
      en: "Best for comfort and fallback",
      es: "Ideal para comodidad y recuperacion",
      pt: "Ideal para conforto e recuperacao",
    },
    icon: AlignLeft,
  },
];

export function ModeGallery() {
  const { locale } = useLocale();

  return (
    <section className="grid gap-4 lg:grid-cols-4">
      {modes.map(({ name, description, bestFor, icon: Icon }) => (
        <article
          key={name.en}
          className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-5 backdrop-blur-xl transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--surface-chip) text-(--accent-sky)">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-(--text-strong)">
            {getLocalizedCopy(locale, name)}
          </h3>
          <p className="mt-3 text-sm leading-7 text-(--text-muted)">
            {getLocalizedCopy(locale, description)}
          </p>
          <p className="mt-5 text-xs tracking-[0.28em] text-(--accent-amber) uppercase">
            {getLocalizedCopy(locale, bestFor)}
          </p>
        </article>
      ))}
    </section>
  );
}

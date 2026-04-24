import {
  AlignLeft,
  FileText,
  Focus,
  GalleryHorizontalEnd,
  WholeWord,
} from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy } from "@/lib/locale";

const modes = [
  {
    name: { en: "Standard PDF", es: "PDF standard", pt: "PDF standard" },
    description: {
      en: "Keep the original page layout with outline, zoom, and page-aware navigation.",
      es: "Conserva el diseno original de pagina con esquema, zoom y navegacion por paginas.",
      pt: "Mantenha o layout original da pagina com sumario, zoom e navegacao por paginas.",
    },
    bestFor: {
      en: "Best for real PDFs and scanned layouts",
      es: "Ideal para PDF reales y disenos escaneados",
      pt: "Ideal para PDFs reais e layouts digitalizados",
    },
    tradeoff: {
      en: "Tradeoff: preserves layout better than text speed modes, but gives you less pacing assistance.",
      es: "Tradeoff: conserva mejor el layout que los modos rapidos de texto, pero te da menos ayuda de ritmo.",
      pt: "Tradeoff: preserva melhor o layout do que os modos rapidos de texto, mas oferece menos ajuda de ritmo.",
    },
    icon: FileText,
  },
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
    tradeoff: {
      en: "Tradeoff: strongest attention lock, but least surrounding context at a glance.",
      es: "Tradeoff: el mayor bloqueo de atencion, pero con menos contexto visible alrededor.",
      pt: "Tradeoff: o maior bloqueio de atencao, mas com menos contexto visivel ao redor.",
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
    tradeoff: {
      en: "Tradeoff: faster and more natural than single-word focus, but still simplifies the original layout.",
      es: "Tradeoff: mas rapido y natural que el foco palabra por palabra, pero aun simplifica el layout original.",
      pt: "Tradeoff: mais rapido e natural do que foco palavra por palavra, mas ainda simplifica o layout original.",
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
    tradeoff: {
      en: "Tradeoff: easier recovery across lines, but less aggressive for pure speed training.",
      es: "Tradeoff: facilita retomar entre lineas, pero es menos agresivo para entrenamiento puro de velocidad.",
      pt: "Tradeoff: facilita a retomada entre linhas, mas e menos agressivo para treino puro de velocidade.",
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
    tradeoff: {
      en: "Tradeoff: richest context and safest fallback, but usually not the fastest pace.",
      es: "Tradeoff: el contexto mas rico y el respaldo mas seguro, pero normalmente no es el ritmo mas rapido.",
      pt: "Tradeoff: o contexto mais rico e a reserva mais segura, mas normalmente nao e o ritmo mais rapido.",
    },
    icon: AlignLeft,
  },
];

export function ModeGallery() {
  const { locale } = useLocale();

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {modes.map(({ name, description, bestFor, tradeoff, icon: Icon }) => (
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
          <p className="mt-3 text-sm leading-7 text-(--text-muted)">
            {getLocalizedCopy(locale, tradeoff)}
          </p>
        </article>
      ))}
    </section>
  );
}

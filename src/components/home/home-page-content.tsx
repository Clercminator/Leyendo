"use client";

import Link from "next/link";

import { ArrowRight, FileStack, ShieldCheck, Sparkles } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { AppShell } from "@/components/layout/app-shell";
import { GoalSelector } from "@/components/onboarding/goal-selector";
import { LandingReaderDemo } from "@/components/reader/landing-reader-demo";
import { ModeGallery } from "@/components/reader/mode-gallery";
import { UploadPanel } from "@/components/upload/upload-panel";
import { getFeaturedGuidesForLocale } from "@/lib/guides";
import { getLocalizedCopy } from "@/lib/locale";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import { absoluteUrl, siteDescription, siteName, siteUrl } from "@/lib/site";

const heroBadge = {
  en: "Paste or upload. Read with control.",
  es: "Pega o sube. Lee con control.",
  pt: "Cole ou envie. Leia com controle.",
};

const heroTitle = {
  en: "Read dense documents with calmer control and less friction.",
  es: "Lee documentos densos con mas control sereno y menos friccion.",
  pt: "Leia documentos densos com mais controle calmo e menos friccao.",
};

const heroDescription = {
  en: "Import the article, chapter, report, or PDF that is slowing you down, then move between guided, phrase, classic, and focus views without losing your place, notes, or recovery path.",
  es: "Importa el articulo, capitulo, informe o PDF que te esta frenando y cambia entre vistas guiadas, por frases, clasicas y de foco sin perder tu lugar, tus notas ni tu capacidad de retomar.",
  pt: "Importe o artigo, capitulo, relatorio ou PDF que esta travando seu ritmo e alterne entre vistas guiadas, por frases, classicas e de foco sem perder seu lugar, suas notas nem a retomada.",
};

const quickStartTitle = {
  en: "What Leyendo changes after import",
  es: "Lo que Leyendo cambia despues de importar",
  pt: "O que o Leyendo muda depois da importacao",
};

const quickStartItems = {
  en: [
    "Open the same document in a reader built for pace, chunking, and recovery",
    "Move between faster modes and full-context reading without restarting your mental map",
    "Return later from the library with progress, bookmarks, and highlights still attached",
    "Keep everything local by default, then add sync only when you want it",
  ],
  es: [
    "Abre el mismo documento en un lector pensado para ritmo, bloques y recuperacion",
    "Muevete entre modos rapidos y lectura con contexto completo sin reiniciar tu mapa mental",
    "Vuelve despues desde la biblioteca con progreso, marcadores y destacados todavia unidos al documento",
    "Todo se queda local por defecto y solo agregas sincronizacion cuando la necesitas",
  ],
  pt: [
    "Abra o mesmo documento em um leitor feito para ritmo, blocos e retomada",
    "Alterne entre modos mais rapidos e leitura com contexto total sem reiniciar seu mapa mental",
    "Volte depois pela biblioteca com progresso, marcadores e destaques ainda ligados ao documento",
    "Tudo fica local por padrao e a sincronizacao entra so quando fizer sentido",
  ],
};

const workflowLabel = {
  en: "Three-step flow",
  es: "Flujo en tres pasos",
  pt: "Fluxo em tres etapas",
};

const workflowSteps = {
  en: [
    ["1", "Paste text or upload a file"],
    ["2", "Choose the pace you need right now"],
    ["3", "Open the reader and keep context when you switch modes"],
  ],
  es: [
    ["1", "Pega texto o sube un archivo"],
    ["2", "Elige el ritmo que necesitas ahora"],
    ["3", "Abre el lector y conserva el contexto al cambiar de modo"],
  ],
  pt: [
    ["1", "Cole texto ou envie um arquivo"],
    ["2", "Escolha o ritmo que voce precisa agora"],
    ["3", "Abra o leitor e mantenha o contexto ao trocar de modo"],
  ],
};

const modesEyebrow = {
  en: "Reading modes",
  es: "Modos de lectura",
  pt: "Modos de leitura",
};

const modesTitle = {
  en: "Choose the reading mode that fits the document, the task, and your current attention.",
  es: "Elige el modo de lectura que encaje con el documento, la tarea y tu atencion actual.",
  pt: "Escolha o modo de leitura que combina com o documento, a tarefa e sua atencao atual.",
};

const firstSessionProofEyebrow = {
  en: "What to verify first",
  es: "Lo que debes verificar primero",
  pt: "O que verificar primeiro",
};

const firstSessionProofTitle = {
  en: "The promise should prove itself on your first real document.",
  es: "La promesa deberia probarse en tu primer documento real.",
  pt: "A promessa deveria se provar no seu primeiro documento real.",
};

const firstSessionProofDescription = {
  en: "These are the behaviors Leyendo should make obvious within minutes, not after a long setup or a paid upgrade.",
  es: "Estos son los comportamientos que Leyendo deberia volver obvios en minutos, no despues de una configuracion larga o una mejora de pago.",
  pt: "Estes sao os comportamentos que o Leyendo deveria tornar obvios em minutos, nao depois de uma configuracao longa ou de um upgrade pago.",
};

const firstSessionProofCards = {
  en: [
    {
      eyebrow: "Recommendation",
      title: "A reading goal changes the starting setup",
      description:
        "Pick a goal and the starting mode and pace should shift with it before you ever touch a dense settings panel.",
      note: "The system should help first, not wait for manual tuning.",
    },
    {
      eyebrow: "Mode switching",
      title: "You stay in one document while the view changes",
      description:
        "Move from faster text modes into Classic Reader or Standard PDF without opening a second copy or rebuilding your place.",
      note: "Context recovery should be part of the product, not an afterthought.",
    },
    {
      eyebrow: "Continuity",
      title: "Progress stays attached to the document",
      description:
        "Leave, reopen from the library, and keep your pace, highlights, bookmarks, and recovery path tied to the same file.",
      note: "Local-first continuity is part of the promise.",
    },
  ],
  es: [
    {
      eyebrow: "Recomendacion",
      title: "Un objetivo de lectura cambia el punto de partida",
      description:
        "Elige un objetivo y el modo inicial con su ritmo deberian cambiar antes de tocar una pantalla densa de ajustes.",
      note: "El sistema deberia ayudar primero, no esperar ajuste manual.",
    },
    {
      eyebrow: "Cambio de modo",
      title: "Sigues en un solo documento mientras cambia la vista",
      description:
        "Pasa de modos rapidos de texto a Lector clasico o PDF standard sin abrir una segunda copia ni reconstruir tu lugar.",
      note: "Recuperar contexto debe ser parte del producto, no un detalle tardio.",
    },
    {
      eyebrow: "Continuidad",
      title: "El progreso sigue unido al documento",
      description:
        "Sal, vuelve desde la biblioteca y conserva ritmo, destacados, marcadores y camino de recuperacion en el mismo archivo.",
      note: "La continuidad local-first forma parte de la promesa.",
    },
  ],
  pt: [
    {
      eyebrow: "Recomendacao",
      title: "Um objetivo de leitura muda o ponto de partida",
      description:
        "Escolha um objetivo e o modo inicial com seu ritmo deveriam mudar antes de tocar em uma tela densa de ajustes.",
      note: "O sistema deveria ajudar primeiro, nao esperar ajuste manual.",
    },
    {
      eyebrow: "Troca de modo",
      title: "Voce fica no mesmo documento enquanto a vista muda",
      description:
        "Passe dos modos rapidos de texto para Leitor classico ou PDF standard sem abrir uma segunda copia nem reconstruir seu lugar.",
      note: "Recuperar contexto precisa fazer parte do produto, nao ser um detalhe tardio.",
    },
    {
      eyebrow: "Continuidade",
      title: "O progresso continua ligado ao documento",
      description:
        "Saia, volte pela biblioteca e mantenha ritmo, destaques, marcadores e caminho de retomada presos ao mesmo arquivo.",
      note: "A continuidade local-first faz parte da promessa.",
    },
  ],
};

const bilingualSearchCards = [
  {
    id: "en",
    eyebrow: "English search intent",
    title: "Reading speed and fast reading for real documents.",
    description:
      "Leyendo is for people searching terms like reading speed, fast reading, speed reading app, and read faster. The goal is not gimmicks. The goal is to read PDFs and dense documents faster without losing comprehension or control.",
    terms: [
      "reading speed",
      "fast reading",
      "speed reading app",
      "read faster",
    ],
  },
  {
    id: "es",
    eyebrow: "Intencion de busqueda en espanol",
    title: "Lectura rapida para PDF y documentos reales.",
    description:
      "Leyendo esta hecho para personas que buscan lectura rapida, leer mas rapido, velocidad de lectura y comprension lectora. La propuesta no es prometer magia, sino ayudarte a leer documentos con mejor ritmo, mas foco y mejor recuperacion.",
    terms: [
      "lectura rapida",
      "leer mas rapido",
      "velocidad de lectura",
      "comprension lectora",
    ],
  },
];

const guidesEyebrow = {
  en: "Guides and articles",
  es: "Guias y articulos",
  pt: "Guias e artigos",
};

const guidesTitle = {
  en: "Read the public pages targeting reading speed and fast reading intent.",
  es: "Lee las paginas publicas que trabajan intencion de velocidad de lectura y lectura rapida.",
  pt: "Leia as paginas publicas que trabalham intencao de velocidade de leitura e leitura rapida.",
};

const guidesDescription = {
  en: "These guides explain the workflow behind Leyendo: faster pacing when it helps, slower recovery when it matters, and better control over real documents from start to finish.",
  es: "Estas guias explican el flujo detras de Leyendo: mas ritmo cuando ayuda, recuperacion mas lenta cuando importa y mejor control sobre documentos reales de principio a fin.",
  pt: "Estas guias explicam o fluxo por tras do Leyendo: mais ritmo quando ajuda, retomada mais lenta quando importa e melhor controle sobre documentos reais do inicio ao fim.",
};

const readGuideLabel = {
  en: "Read guide",
  es: "Leer guia",
  pt: "Ler guia",
};

const browseGuidesLabel = {
  en: "Browse all guides",
  es: "Ver todas las guias",
  pt: "Ver todas as guias",
};

const importDocumentLabel = {
  en: "Import a document",
  es: "Importar documento",
  pt: "Importar documento",
};

const openLibraryLabel = {
  en: "Open library",
  es: "Abrir biblioteca",
  pt: "Abrir biblioteca",
};

export function HomePageContent() {
  const { locale } = useLocale();
  const featuredGuides = getFeaturedGuidesForLocale(locale);
  const localizedGuidesPath = getLocalizedPublicPath("/guides", locale);

  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
        description: siteDescription,
      },
      {
        "@type": "WebApplication",
        name: siteName,
        url: siteUrl,
        description: siteDescription,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any",
        image: absoluteUrl("/opengraph-image"),
        featureList: [
          "Improve reading speed on PDFs and real documents",
          "Practice fast reading without losing comprehension",
          "Switch between guided, focused, phrase, and classic reading modes",
          "Keep reading progress, bookmarks, and highlights organized",
        ],
      },
      {
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
        logo: absoluteUrl("/apple-icon"),
      },
    ],
  };

  return (
    <AppShell
      centerIntro
      eyebrow={{
        en: "Reader for real documents",
        es: "Lector para documentos reales",
        pt: "Leitor para documentos reais",
      }}
      title={{
        en: "Bring the document that needs more pace, more focus, or an easier way back in.",
        es: "Trae el documento que necesita mas ritmo, mas foco o una forma mas facil de retomarlo.",
        pt: "Traga o documento que precisa de mais ritmo, mais foco ou uma volta mais facil para dentro dele.",
      }}
      description={{
        en: "Leyendo is built for articles, chapters, reports, and PDFs that ask too much from your attention. Import the file, choose a reading pace, and keep your place as you move between faster modes and full-context reading.",
        es: "Leyendo esta hecho para articulos, capitulos, informes y PDF que exigen demasiado a tu atencion. Importa el archivo, elige un ritmo de lectura y conserva tu lugar mientras cambias entre modos rapidos y lectura con contexto completo.",
        pt: "O Leyendo foi feito para artigos, capitulos, relatorios e PDFs que cobram demais da sua atencao. Importe o arquivo, escolha um ritmo de leitura e mantenha seu lugar enquanto alterna entre modos mais rapidos e leitura com contexto total.",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="space-y-10">
        <UploadPanel />

        <GoalSelector />

        <LandingReaderDemo />

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="editorial-panel hover-lift fade-rise relative overflow-hidden rounded-[2rem] border border-(--border-soft) bg-(--surface-strong) p-8 shadow-[0_28px_120px_rgba(20,26,56,0.16)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(95,119,215,0.22),transparent_68%)] dark:bg-[radial-gradient(circle_at_top,rgba(91,111,255,0.18),transparent_68%)]" />
            <div className="relative inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-muted)">
              <Sparkles className="h-4 w-4 text-(--accent-amber)" />
              {getLocalizedCopy(locale, heroBadge)}
            </div>

            <h2 className="font-heading relative mt-8 max-w-3xl text-4xl leading-[0.96] font-semibold tracking-[-0.04em] text-balance text-(--text-strong) sm:text-5xl xl:text-6xl">
              {getLocalizedCopy(locale, heroTitle)}
            </h2>

            <p className="relative mt-6 max-w-2xl text-base leading-8 text-(--text-muted) sm:text-lg">
              {getLocalizedCopy(locale, heroDescription)}
            </p>

            <div className="editorial-rule relative mt-8" />

            <div className="relative mt-8 flex flex-wrap gap-3">
              <Link
                href="#upload-panel"
                className="group inline-flex min-h-16 items-center gap-3 rounded-[1.35rem] bg-[linear-gradient(135deg,var(--accent-sky),color-mix(in_srgb,var(--accent-sky)_72%,var(--accent-amber)))] px-7 py-4 text-base font-semibold text-white shadow-[0_22px_50px_rgba(95,119,215,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(95,119,215,0.34)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/16">
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                </span>
                {getLocalizedCopy(locale, importDocumentLabel)}
              </Link>
              <Link
                href="/library"
                className="inline-flex min-h-16 items-center gap-2 rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-6 py-4 text-base text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                <FileStack className="h-4 w-4 text-(--accent-sky)" />
                {getLocalizedCopy(locale, openLibraryLabel)}
              </Link>
            </div>
          </div>

          <div className="editorial-panel hover-lift fade-rise-delayed rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_70px_rgba(20,26,56,0.1)] backdrop-blur-xl">
            <p className="editorial-kicker text-(--accent-sky)">
              {getLocalizedCopy(locale, workflowLabel)}
            </p>
            <h2 className="font-heading mt-5 text-3xl leading-tight font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, quickStartTitle)}
            </h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-(--text-muted)">
              {workflowSteps[locale].map(([step, text]) => (
                <li
                  key={step}
                  className="flex items-start gap-4 rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--surface-chip) text-sm font-semibold text-(--text-strong)">
                    {step}
                  </span>
                  <span className="pt-1 text-(--text-strong)">{text}</span>
                </li>
              ))}
            </ul>
            <div className="editorial-rule mt-7" />
            <ul className="mt-7 space-y-4 text-sm leading-7 text-(--text-muted)">
              {quickStartItems[locale].map((item) => (
                <li key={item} className="flex gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-(--accent-amber)" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="fade-rise-delayed space-y-5">
          <div className="max-w-3xl">
            <p className="editorial-kicker text-(--accent-amber)">
              {getLocalizedCopy(locale, firstSessionProofEyebrow)}
            </p>
            <h2 className="font-heading mt-3 text-4xl leading-tight font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, firstSessionProofTitle)}
            </h2>
            <p className="mt-4 text-base leading-8 text-(--text-muted)">
              {getLocalizedCopy(locale, firstSessionProofDescription)}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {firstSessionProofCards[locale].map((card, index) => (
              <article
                key={card.title}
                className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_18px_70px_rgba(20,26,56,0.1)] backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs tracking-[0.18em] text-(--accent-sky) uppercase">
                    {card.eyebrow}
                  </p>
                  <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1 text-xs font-medium text-(--text-strong)">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-heading mt-4 text-2xl leading-tight font-semibold text-(--text-strong)">
                  {card.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-(--text-muted)">
                  {card.description}
                </p>
                <p className="mt-4 text-sm font-medium text-(--text-strong)">
                  {card.note}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="fade-rise-delayed space-y-5">
          <div className="max-w-2xl">
            <p className="editorial-kicker text-(--accent-sky)">
              {getLocalizedCopy(locale, modesEyebrow)}
            </p>
            <h2 className="font-heading mt-3 text-4xl leading-tight font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, modesTitle)}
            </h2>
          </div>
          <ModeGallery />
        </section>

        <section className="fade-rise-delayed grid gap-6 lg:grid-cols-2">
          {bilingualSearchCards.map((card) => (
            <article
              key={card.id}
              className="rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_70px_rgba(20,26,56,0.1)] backdrop-blur-xl"
            >
              <p className="editorial-kicker text-(--accent-amber)">
                {card.eyebrow}
              </p>
              <h2 className="font-heading mt-4 text-3xl leading-tight font-semibold text-(--text-strong)">
                {card.title}
              </h2>
              <p className="mt-5 text-base leading-8 text-(--text-muted)">
                {card.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {card.terms.map((term) => (
                  <span
                    key={term}
                    className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="fade-rise-delayed space-y-5">
          <div className="max-w-3xl">
            <p className="editorial-kicker text-(--accent-sky)">
              {getLocalizedCopy(locale, guidesEyebrow)}
            </p>
            <h2 className="font-heading mt-3 text-4xl leading-tight font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, guidesTitle)}
            </h2>
            <p className="mt-4 text-base leading-8 text-(--text-muted)">
              {getLocalizedCopy(locale, guidesDescription)}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {featuredGuides.map((guide) => (
              <article
                key={guide.slug}
                className="rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_70px_rgba(20,26,56,0.1)] backdrop-blur-xl"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1 text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                    {guide.languageLabel}
                  </span>
                  <span className="text-sm text-(--text-muted)">
                    {guide.readingTime}
                  </span>
                </div>
                <h3 className="font-heading mt-4 text-2xl leading-tight font-semibold text-(--text-strong)">
                  {guide.title}
                </h3>
                <p className="mt-4 text-base leading-8 text-(--text-muted)">
                  {guide.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {guide.keywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={getLocalizedPublicPath(`/guides/${guide.slug}`, locale)}
                    className="inline-flex items-center gap-2 rounded-full bg-(--text-strong) px-5 py-3 text-sm font-semibold text-(--text-on-accent) transition hover:opacity-92"
                  >
                    <ArrowRight className="h-4 w-4" />
                    {getLocalizedCopy(locale, readGuideLabel)}
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div>
            <Link
              href={localizedGuidesPath}
              className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              <FileStack className="h-4 w-4 text-(--accent-sky)" />
              {getLocalizedCopy(locale, browseGuidesLabel)}
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

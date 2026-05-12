"use client";

import Link from "next/link";

import { ArrowRight, FileStack } from "lucide-react";

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

const modesEyebrow = {
  en: "Reading modes",
  es: "Modos de lectura",
  pt: "Modos de leitura",
};

const mergedReaderSystemEyebrow = {
  en: "How the reader adapts",
  es: "Cómo se adapta el lector",
  pt: "Como o leitor se adapta",
};

const mergedReaderSystemTitle = {
  en: "Choose the goal, verify the promise, and compare the modes in one place.",
  es: "Elige el objetivo, comprueba la promesa y compara los modos en un mismo lugar.",
  pt: "Escolha o objetivo, verifique a promessa e compare os modos em um unico lugar.",
};

const mergedReaderSystemDescription = {
  en: "The first decision should not be a wall of settings. It should be one surface that tells you what kind of session you want, what Leyendo should prove immediately, and which reading mode makes the right tradeoff.",
  es: "La primera decisión no debería ser una pared de ajustes. Aquí tienes una sola superficie para definir qué tipo de sesión quieres, qué debería demostrar Leyendo al momento y qué modo hace el mejor intercambio.",
  pt: "A primeira decisao nao deveria ser uma parede de ajustes. Aqui voce tem uma unica superficie para definir que tipo de sessao quer, o que o Leyendo deveria provar logo de cara e qual modo faz o melhor tradeoff.",
};

const modesTitle = {
  en: "Choose the reading mode that fits the document, the task, and your current attention.",
  es: "Elige el modo que mejor se adapte al documento, la tarea y tu atención.",
  pt: "Escolha o modo de leitura que combina com o documento, a tarefa e sua atencao atual.",
};

const firstSessionProofEyebrow = {
  en: "What to verify first",
  es: "Lo que debes verificar primero",
  pt: "O que verificar primeiro",
};

const firstSessionProofTitle = {
  en: "The promise should prove itself on your first real document.",
  es: "La promesa debe notarse en tu primer documento real.",
  pt: "A promessa deveria se provar no seu primeiro documento real.",
};

const firstSessionProofDescription = {
  en: "These are the behaviors Leyendo should make obvious within minutes, not after a long setup or a paid upgrade.",
  es: "Esto debería quedar claro en minutos, no después de una configuración larga ni de subir de plan.",
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
      eyebrow: "Recomendación",
      title: "Un objetivo de lectura cambia el punto de partida",
      description:
        "Al elegir un objetivo, el modo inicial y el ritmo deberían ajustarse antes de abrir una pantalla llena de ajustes.",
      note: "El sistema debe ayudar primero, no esperar ajustes manuales.",
    },
    {
      eyebrow: "Cambio de modo",
      title: "Sigues en el mismo documento aunque cambie la vista",
      description:
        "Pasa de los modos rápidos al Lector clásico o al PDF estándar sin abrir otra copia ni perder tu lugar.",
      note: "Recuperar contexto debe ser parte del producto, no algo secundario.",
    },
    {
      eyebrow: "Continuidad",
      title: "El progreso sigue unido al documento",
      description:
        "Sal, vuelve desde la biblioteca y conserva el ritmo, los destacados, los marcadores y tu punto de regreso en el mismo archivo.",
      note: "La continuidad local forma parte de la promesa.",
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

const guidesEyebrow = {
  en: "Guides and articles",
  es: "Guías y artículos",
  pt: "Guias e artigos",
};

const guidesTitle = {
  en: "Read the public pages targeting reading speed and fast reading intent.",
  es: "Lee las páginas públicas sobre velocidad de lectura y lectura rápida.",
  pt: "Leia as paginas publicas que trabalham intencao de velocidade de leitura e leitura rapida.",
};

const guidesDescription = {
  en: "These guides explain the workflow behind Leyendo: faster pacing when it helps, slower recovery when it matters, and better control over real documents from start to finish.",
  es: "Estas guías explican cómo funciona Leyendo: más ritmo cuando ayuda, una vuelta más lenta cuando importa y más control de principio a fin.",
  pt: "Estas guias explicam o fluxo por tras do Leyendo: mais ritmo quando ajuda, retomada mais lenta quando importa e melhor controle sobre documentos reais do inicio ao fim.",
};

const readGuideLabel = {
  en: "Read guide",
  es: "Leer guía",
  pt: "Ler guia",
};

const browseGuidesLabel = {
  en: "Browse all guides",
  es: "Ver todas las guías",
  pt: "Ver todas as guias",
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
      compactIntro
      eyebrow={{
        en: "Reader for real documents",
        es: "Lectura rápida para documentos reales",
        pt: "Leitor para documentos reais",
      }}
      title={{
        en: "Bring the document that needs more pace, more focus, or an easier way back in.",
        es: "Lee más rápido en varios modos y formatos.",
        pt: "Traga o documento que precisa de mais ritmo, mais foco ou uma volta mais facil para dentro dele.",
      }}
      description={{
        en: "Leyendo is built for articles, chapters, reports, and PDFs that ask too much from your attention. Import the file, choose a reading pace, and keep your place as you move between faster modes and full-context reading.",
        es: "Importa PDF, DOCX, RTF, Markdown o texto pegado. Cambia de ritmo y de modo sin perder tu lugar.",
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

        <LandingReaderDemo />

        <section className="fade-rise-delayed relative overflow-hidden rounded-[2.25rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_24px_90px_rgba(20,26,56,0.12)] backdrop-blur-xl sm:p-8 xl:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(112,151,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(244,170,103,0.12),transparent_32%)]" />

          <div className="relative">
            <div className="max-w-3xl">
              <p className="editorial-kicker text-(--accent-sky)">
                {getLocalizedCopy(locale, mergedReaderSystemEyebrow)}
              </p>
              <h2 className="font-heading mt-3 text-4xl leading-tight font-semibold text-balance text-(--text-strong) lg:text-[3rem]">
                {getLocalizedCopy(locale, mergedReaderSystemTitle)}
              </h2>
              <p className="mt-4 text-base leading-8 text-(--text-muted)">
                {getLocalizedCopy(locale, mergedReaderSystemDescription)}
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.7rem] border border-(--border-soft) bg-(--surface-strong) shadow-[0_18px_60px_rgba(20,26,56,0.08)] backdrop-blur-xl">
              <div className="grid gap-0 xl:grid-cols-[0.95fr_1fr_1fr_1fr]">
                <div className="p-5 sm:p-6 xl:pr-8">
                  <p className="text-xs tracking-[0.22em] text-(--accent-amber) uppercase">
                    {getLocalizedCopy(locale, firstSessionProofEyebrow)}
                  </p>
                  <h3 className="font-heading mt-3 text-xl leading-tight font-semibold text-balance text-(--text-strong) sm:text-2xl">
                    {getLocalizedCopy(locale, firstSessionProofTitle)}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                    {getLocalizedCopy(locale, firstSessionProofDescription)}
                  </p>
                </div>

                {firstSessionProofCards[locale].map((card, index) => (
                  <article
                    key={card.title}
                    className="border-t border-(--border-soft) p-5 sm:p-6 xl:border-t-0 xl:border-l"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] tracking-[0.22em] text-(--accent-sky) uppercase">
                        {card.eyebrow}
                      </p>
                      <span className="text-[11px] font-medium tracking-[0.18em] text-(--text-muted)">
                        0{index + 1}
                      </span>
                    </div>
                    <h4 className="font-heading mt-3 text-lg leading-tight font-semibold text-(--text-strong)">
                      {card.title}
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-(--text-muted)">
                      {card.description}
                    </p>
                    <p className="mt-4 text-sm font-medium leading-6 text-(--text-strong)">
                      {card.note}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-[1.85rem] border border-(--border-soft) bg-(--surface-strong) p-5 shadow-[0_18px_70px_rgba(20,26,56,0.1)] backdrop-blur-xl sm:p-6">
              <GoalSelector compact />
            </div>

            <div className="mt-6 rounded-[1.85rem] border border-(--border-soft) bg-(--surface-strong) p-5 shadow-[0_18px_70px_rgba(20,26,56,0.1)] backdrop-blur-xl sm:p-6">
              <div className="max-w-2xl">
                <p className="text-xs tracking-[0.22em] text-(--accent-sky) uppercase">
                  {getLocalizedCopy(locale, modesEyebrow)}
                </p>
                <h3 className="font-heading mt-3 text-xl leading-tight font-semibold text-balance text-(--text-strong) sm:text-2xl">
                  {getLocalizedCopy(locale, modesTitle)}
                </h3>
              </div>
              <div className="mt-6">
                <ModeGallery compact />
              </div>
            </div>
          </div>
        </section>

        <section className="fade-rise-delayed space-y-5">
          <div className="w-full">
            <p className="editorial-kicker text-(--accent-sky)">
              {getLocalizedCopy(locale, guidesEyebrow)}
            </p>
            <h2 className="font-heading mt-3 text-4xl leading-tight font-semibold text-balance text-(--text-strong) lg:text-[3rem]">
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

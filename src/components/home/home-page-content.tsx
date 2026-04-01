"use client";

import Link from "next/link";

import { ArrowRight, FileStack, ShieldCheck, Sparkles } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LandingReaderDemo } from "@/components/reader/landing-reader-demo";
import { ModeGallery } from "@/components/reader/mode-gallery";
import { UploadPanel } from "@/components/upload/upload-panel";
import { featuredGuides } from "@/lib/guides";
import { getLocalizedCopy } from "@/lib/locale";
import { absoluteUrl, siteDescription, siteName, siteUrl } from "@/lib/site";

const heroBadge = {
  en: "Paste or upload. Read with control.",
  es: "Pega o sube. Lee con control.",
  pt: "Cole ou envie. Leia com controle.",
};

const heroTitle = {
  en: "Turn a dense document into a calmer reading session.",
  es: "Convierte un documento denso en una sesion de lectura mas calmada.",
  pt: "Transforme um documento denso em uma sessao de leitura mais calma.",
};

const heroDescription = {
  en: "Paste article text or upload a PDF, DOCX, RTF, Markdown, or TXT file, then switch between focused reading modes without losing progress, highlights, or bookmarks.",
  es: "Pega texto de un articulo o sube un PDF, DOCX, RTF, Markdown o TXT y cambia entre modos de lectura sin perder progreso, destacados ni marcadores.",
  pt: "Cole texto de um artigo ou envie um PDF, DOCX, RTF, Markdown ou TXT e alterne entre modos de leitura sem perder progresso, destaques ou marcadores.",
};

const quickStartTitle = {
  en: "What happens after you import",
  es: "Lo que pasa despues de importar",
  pt: "O que acontece depois da importacao",
};

const quickStartItems = {
  en: [
    "Open the document in a reader built for pace, chunking, and recovery",
    "Switch views when you need more focus or more context",
    "Return later from the library with your progress still intact",
    "Keep processing, progress, and notes on this device",
  ],
  es: [
    "Abre el documento en un lector pensado para ritmo, bloques y vuelta rapida",
    "Cambia de vista cuando necesites mas enfoque o mas contexto",
    "Vuelve despues desde la biblioteca con tu progreso intacto",
    "Mantiene procesamiento, progreso y notas en este dispositivo",
  ],
  pt: [
    "Abra o documento em um leitor feito para ritmo, blocos e retomada",
    "Troque de visualizacao quando precisar de mais foco ou contexto",
    "Volte depois pela biblioteca com seu progresso intacto",
    "Mantenha processamento, progresso e notas neste dispositivo",
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
    ["2", "Pick a reading goal and mode"],
    ["3", "Open the reader and keep your place"],
  ],
  es: [
    ["1", "Pega texto o sube un archivo"],
    ["2", "Elige objetivo y modo de lectura"],
    ["3", "Abre el lector y conserva tu lugar"],
  ],
  pt: [
    ["1", "Cole texto ou envie um arquivo"],
    ["2", "Escolha o objetivo e o modo"],
    ["3", "Abra o leitor e mantenha seu lugar"],
  ],
};

const modesEyebrow = {
  en: "Reading modes",
  es: "Modos de lectura",
  pt: "Modos de leitura",
};

const modesTitle = {
  en: "Choose the view that matches the document and your attention level.",
  es: "Elige la vista que encaje con el documento y tu nivel de atencion.",
  pt: "Escolha a visualizacao que combina com o documento e seu nivel de atencao.",
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
  en: "These guide pages expand Leyendo's public surface around reading speed, fast reading, and comprehension for real documents in both English and Spanish.",
  es: "Estas guias amplian la superficie publica de Leyendo alrededor de velocidad de lectura, lectura rapida y comprension para documentos reales en ingles y espanol.",
  pt: "Estas guias ampliam a superficie publica do Leyendo em torno de velocidade de leitura, leitura rapida e compreensao para documentos reais em ingles e espanhol.",
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
        en: "Paste text or upload the document you want to read faster.",
        es: "Pega texto o sube el documento que quieres leer mas rapido.",
        pt: "Cole texto ou envie o documento que voce quer ler mais rapido.",
      }}
      description={{
        en: "Leyendo accepts PDFs, DOCX, RTF, Markdown, TXT, and pasted text, then gives you guided, focused, phrase, and classic reading views with local progress by default and optional cloud sync when you sign in.",
        es: "Leyendo acepta PDF, DOCX, RTF, Markdown, TXT y texto pegado, y luego te da vistas guiadas, enfocadas, por frases y clasicas con progreso local por defecto y sincronizacion opcional en la nube al iniciar sesion.",
        pt: "Leyendo aceita PDF, DOCX, RTF, Markdown, TXT e texto colado, e depois oferece visualizacoes guiadas, focadas, por frases e classicas com progresso local por padrao e sincronizacao opcional na nuvem ao entrar.",
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
                    href={`/guides/${guide.slug}`}
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
              href="/guides"
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

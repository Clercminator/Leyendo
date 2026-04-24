"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";

import { ArrowUpRight, UserRound } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { AppShell } from "@/components/layout/app-shell";
import { getFeaturedGuidesForLocale } from "@/lib/guides";
import { getLocalizedCopy } from "@/lib/locale";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import {
  absoluteUrl,
  founderBio,
  founderGitHubUrl,
  founderLinkedInUrl,
  founderName,
  founderRole,
  siteName,
  siteUrl,
} from "@/lib/site";

const aboutEyebrow = {
  en: "About Leyendo",
  es: "Sobre Leyendo",
  pt: "Sobre o Leyendo",
};

const aboutTitle = {
  en: "Why Leyendo exists and why it is built around real documents.",
  es: "Por que existe Leyendo y por que esta construido alrededor de documentos reales.",
  pt: "Por que o Leyendo existe e por que ele foi construido em torno de documentos reais.",
};

const aboutDescription = {
  en: "Leyendo is a reading workspace for people who need more control over dense material: faster pace when the text allows it, calmer recovery when the document pushes back.",
  es: "Leyendo es un espacio de lectura para quienes necesitan mas control sobre material denso: mas ritmo cuando el texto lo permite y recuperacion mas calmada cuando el documento se pone dificil.",
  pt: "O Leyendo e um espaco de leitura para quem precisa de mais controle sobre material denso: mais ritmo quando o texto permite e retomada mais calma quando o documento aperta.",
};

const sectionCopy = {
  purposeTitle: {
    en: "What Leyendo is",
    es: "Que es Leyendo",
    pt: "O que e o Leyendo",
  },
  purposeBody: {
    en: "Leyendo is not built around reading hacks. It is built around the real moment when a chapter, report, article, or PDF starts costing too much attention. The product gives you a calmer way to push pace, recover context, and stay inside the same document instead of bouncing between disconnected tools.",
    es: "Leyendo no esta construido alrededor de trucos de lectura. Esta construido alrededor del momento real en que un capitulo, informe, articulo o PDF empieza a costarte demasiada atencion. El producto te da una forma mas serena de acelerar, recuperar contexto y seguir dentro del mismo documento en vez de saltar entre herramientas desconectadas.",
    pt: "O Leyendo nao foi construido em torno de truques de leitura. Ele foi construido em torno do momento real em que um capitulo, relatorio, artigo ou PDF passa a cobrar atencao demais. O produto oferece um jeito mais calmo de acelerar, recuperar contexto e continuar no mesmo documento em vez de pular entre ferramentas desconectadas.",
  },
  differenceTitle: {
    en: "How it differs from generic fast-reading advice",
    es: "Como se diferencia del consejo generico sobre leer rapido",
    pt: "Como ele se diferencia do conselho generico sobre leitura rapida",
  },
  differenceBody: {
    en: "Most fast-reading advice stays abstract. Leyendo turns it into operating behavior: mode switching without losing place, a classic fallback when speed is no longer helping, progress that stays attached to the document, and local-first reading before any account is required.",
    es: "La mayoria de los consejos sobre leer rapido se queda en lo abstracto. Leyendo lo convierte en comportamiento operativo: cambio de modo sin perder el lugar, una vista clasica de respaldo cuando la velocidad deja de ayudar, progreso unido al documento y lectura local antes de pedirte una cuenta.",
    pt: "Grande parte do conselho sobre leitura rapida fica no abstrato. O Leyendo transforma isso em comportamento real: troca de modo sem perder o lugar, uma vista classica de reserva quando a velocidade para de ajudar, progresso ligado ao documento e leitura local antes de exigir conta.",
  },
  founderTitle: {
    en: "About the developer",
    es: "Sobre el desarrollador",
    pt: "Sobre o desenvolvedor",
  },
  founderBody: {
    en: `${founderName} built ${siteName} from the frustration of reading dense material with tools that were either too passive, too gimmicky, or too detached from real work. The product direction comes from long-form reading, practical AI, and the belief that control and recovery matter as much as raw pace.`,
    es: `${founderName} creo ${siteName} desde la frustracion de leer material denso con herramientas demasiado pasivas, demasiado gimmicky o demasiado alejadas del trabajo real. La direccion del producto nace de la lectura larga, la IA practica y la idea de que el control y la recuperacion importan tanto como la velocidad.`,
    pt: `${founderName} criou o ${siteName} a partir da frustracao de ler material denso com ferramentas passivas demais, apelativas demais ou distantes demais do trabalho real. A direcao do produto vem da leitura longa, da IA pratica e da ideia de que controle e retomada importam tanto quanto a velocidade.`,
  },
};

const bilingualSearchSummary = [
  {
    id: "en",
    title: "If you searched for reading speed or fast reading",
    body: "Leyendo is built for that use case, but with more care for comprehension, control, and real documents than most speed reading pages offer.",
  },
  {
    id: "es",
    title: "Si buscaste lectura rapida o leer mas rapido",
    body: "Leyendo esta hecho para eso, pero con mas cuidado por la comprension, el control y los documentos reales que la mayoria de las paginas sobre lectura rapida.",
  },
];

const publicGuidesCopy = {
  eyebrow: {
    en: "Public reading paths",
    es: "Rutas publicas de lectura",
    pt: "Caminhos publicos de leitura",
  },
  title: {
    en: "Read the operating philosophy behind the product.",
    es: "Lee la filosofia operativa detras del producto.",
    pt: "Leia a filosofia operacional por tras do produto.",
  },
  body: {
    en: "The public guides explain how Leyendo approaches pace, comprehension, and recovery on real documents without forcing users through a single landing page.",
    es: "Las guias publicas explican como Leyendo aborda ritmo, comprension y recuperacion en documentos reales sin obligar a todo el mundo a pasar por una sola landing page.",
    pt: "As guias publicas explicam como o Leyendo trata ritmo, compreensao e retomada em documentos reais sem obrigar todo mundo a passar por uma unica landing page.",
  },
  browseAll: {
    en: "Browse all guides",
    es: "Ver todas las guias",
    pt: "Ver todas as guias",
  },
  readGuide: {
    en: "Read guide",
    es: "Leer guia",
    pt: "Ler guia",
  },
};

const founderPhotoAlt = {
  en: `${founderName} portrait`,
  es: `Retrato de ${founderName}`,
  pt: `Retrato de ${founderName}`,
};

const founderPhotoSrc = "/David%20Clerc%20empresarial%20traje.webp";

export function AboutPageContent() {
  const { locale } = useLocale();
  const featuredGuides = getFeaturedGuidesForLocale(locale);
  const [founderImgError, setFounderImgError] = useState(false);
  const localizedAboutPath = getLocalizedPublicPath("/about", locale);
  const localizedGuidesPath = getLocalizedPublicPath("/guides", locale);

  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
        logo: absoluteUrl("/apple-icon"),
      },
      {
        "@type": "Person",
        name: founderName,
        jobTitle: founderRole,
        description: founderBio,
        url: absoluteUrl(localizedAboutPath),
        sameAs: [founderLinkedInUrl, founderGitHubUrl],
        worksFor: {
          "@type": "Organization",
          name: siteName,
        },
      },
    ],
  };

  return (
    <AppShell
      eyebrow={aboutEyebrow}
      title={aboutTitle}
      description={aboutDescription}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(aboutJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="space-y-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, sectionCopy.purposeTitle)}
            </h2>
            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {getLocalizedCopy(locale, sectionCopy.purposeBody)}
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, sectionCopy.differenceTitle)}
            </h2>
            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {getLocalizedCopy(locale, sectionCopy.differenceBody)}
            </p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {bilingualSearchSummary.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-soft) p-6"
            >
              <h2 className="text-xl font-semibold text-(--text-strong)">
                {entry.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-(--text-muted)">
                {entry.body}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 backdrop-blur-xl">
          <p className="editorial-kicker text-(--accent-amber)">
            {getLocalizedCopy(locale, publicGuidesCopy.eyebrow)}
          </p>
          <h2 className="font-heading mt-4 text-3xl leading-tight font-semibold text-(--text-strong)">
            {getLocalizedCopy(locale, publicGuidesCopy.title)}
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-(--text-muted)">
            {getLocalizedCopy(locale, publicGuidesCopy.body)}
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={getLocalizedPublicPath(`/guides/${guide.slug}`, locale)}
                className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-soft) px-5 py-5 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                <p className="text-sm text-(--text-muted)">
                  {guide.clusterLabel}
                </p>
                <h3 className="mt-2 text-base font-semibold text-(--text-strong)">
                  {guide.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                  {guide.description}
                </p>
                <p className="mt-4 text-sm font-semibold text-(--text-strong)">
                  {getLocalizedCopy(locale, publicGuidesCopy.readGuide)}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href={localizedGuidesPath}
              className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              {getLocalizedCopy(locale, publicGuidesCopy.browseAll)}
              <ArrowUpRight className="h-4 w-4 text-(--accent-sky)" />
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-(--border-soft) bg-(--surface-strong) p-8 shadow-[0_18px_70px_rgba(20,26,56,0.1)]">
          <p className="editorial-kicker text-(--accent-sky)">
            {getLocalizedCopy(locale, sectionCopy.founderTitle)}
          </p>
          <p className="mt-5 max-w-4xl text-sm leading-7 text-(--text-muted)">
            {getLocalizedCopy(locale, sectionCopy.founderBody)}
          </p>
          <div className="editorial-rule mt-8" />
          <div className="about-founder-layout mt-8">
            <div className="about-founder-copy max-w-2xl min-w-0">
              <h2 className="font-heading text-2xl font-semibold text-(--text-strong) sm:text-3xl">
                {founderName}
              </h2>
              <p className="mt-2 text-sm tracking-[0.18em] text-(--text-muted) uppercase">
                {founderRole}
              </p>
              <p className="mt-5 text-sm leading-8 text-(--text-muted)">
                {founderBio}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={founderLinkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                >
                  LinkedIn
                  <ArrowUpRight className="h-4 w-4 text-(--accent-sky)" />
                </a>
                <a
                  href={founderGitHubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                >
                  GitHub
                  <ArrowUpRight className="h-4 w-4 text-(--accent-amber)" />
                </a>
              </div>
            </div>
            <div
              data-testid="about-founder-photo"
              className="about-founder-photo mx-auto overflow-hidden rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) shadow-[0_18px_48px_rgba(20,26,56,0.16)]"
            >
              {!founderImgError ? (
                <img
                  src={founderPhotoSrc}
                  alt={getLocalizedCopy(locale, founderPhotoAlt)}
                  width={512}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  className="about-founder-photo-image h-72 w-56 object-cover object-top sm:h-80 sm:w-64"
                  onError={() => {
                    setFounderImgError(true);
                  }}
                />
              ) : (
                <div className="about-founder-photo-image flex h-72 w-56 items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(20,26,56,0.18))] text-(--text-muted) sm:h-80 sm:w-64">
                  <UserRound className="h-10 w-10" aria-hidden />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

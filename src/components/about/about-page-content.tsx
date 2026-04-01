"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";

import { ArrowUpRight, UserRound } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { AppShell } from "@/components/layout/app-shell";
import { featuredGuides } from "@/lib/guides";
import { getLocalizedCopy } from "@/lib/locale";
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
  en: "Why Leyendo exists and who is building it.",
  es: "Por que existe Leyendo y quien lo esta construyendo.",
  pt: "Por que o Leyendo existe e quem o esta construindo.",
};

const aboutDescription = {
  en: "Leyendo is a calm reading studio for people who want better reading speed, clearer focus, and easier recovery when a dense document starts fighting back.",
  es: "Leyendo es un estudio de lectura sereno para personas que quieren mejor velocidad de lectura, mas foco y mejor recuperacion cuando un documento denso empieza a cansar.",
  pt: "Leyendo e um estudio de leitura mais sereno para quem quer melhor velocidade de leitura, mais foco e recuperacao mais facil quando um documento denso comeca a cobrar demais.",
};

const sectionCopy = {
  purposeTitle: {
    en: "What Leyendo is",
    es: "Que es Leyendo",
    pt: "O que e o Leyendo",
  },
  purposeBody: {
    en: "Leyendo is not another generic speed reading promise. It is a practical reading workspace for PDFs and real documents, built to help you read faster with less friction, stronger focus, and better control over pace, recovery, and context.",
    es: "Leyendo no es otra promesa generica de lectura rapida. Es un espacio practico para leer PDF y documentos reales, pensado para ayudarte a leer mas rapido con menos friccion, mas foco y mejor control sobre ritmo, recuperacion y contexto.",
    pt: "Leyendo nao e mais uma promessa generica de leitura rapida. E um espaco pratico para PDF e documentos reais, pensado para ajudar voce a ler mais rapido com menos friccao, mais foco e melhor controle sobre ritmo, retomada e contexto.",
  },
  differenceTitle: {
    en: "How it differs from generic fast-reading advice",
    es: "Como se diferencia del consejo generico sobre leer rapido",
    pt: "Como ele se diferencia do conselho generico sobre leitura rapida",
  },
  differenceBody: {
    en: "Most fast reading content stops at vague tips. Leyendo turns those ideas into an actual product: visible controls, multiple reading modes, a fallback classic view, local-first behavior, and progress that stays with the document instead of disappearing between sessions.",
    es: "La mayoria del contenido sobre leer rapido se queda en consejos vagos. Leyendo convierte esas ideas en un producto real: controles visibles, varios modos de lectura, una vista clasica de respaldo, comportamiento local-first y progreso que se queda con el documento en vez de perderse entre sesiones.",
    pt: "Grande parte do conteudo sobre leitura rapida para em dicas vagas. Leyendo transforma essas ideias em um produto real: controles visiveis, varios modos de leitura, uma vista classica de reserva, comportamento local-first e progresso que acompanha o documento em vez de sumir entre sessoes.",
  },
  founderTitle: {
    en: "About the developer",
    es: "Sobre el desarrollador",
    pt: "Sobre o desenvolvedor",
  },
  founderBody: {
    en: `${founderName} built ${siteName} to make reading speed training feel grounded in real work instead of gimmicks. The product direction is shaped by long-form reading, practical AI, and the frustration of trying to read dense material with tools that treat every text like a toy demo.`,
    es: `${founderName} creo ${siteName} para que entrenar velocidad de lectura se sienta conectado con trabajo real y no con gimmicks. La direccion del producto nace de la lectura larga, la IA practica y la frustracion de intentar leer material denso con herramientas que tratan cada texto como una demo liviana.`,
    pt: `${founderName} criou ${siteName} para que treinar velocidade de leitura ficasse ligado ao trabalho real, e nao a gimmicks. A direcao do produto vem da leitura longa, da IA pratica e da frustracao de tentar ler material denso com ferramentas que tratam todo texto como uma demonstracao superficial.`,
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
    en: "Read the guide layer behind the product.",
    es: "Lee la capa de guias que acompana al producto.",
    pt: "Leia a camada de guias que acompanha o produto.",
  },
  body: {
    en: "The public guides now cover reading speed, fast reading, lectura rapida, and comprehension in both English and Spanish. They give Leyendo a stronger public knowledge surface instead of relying on a single landing page.",
    es: "Las guias publicas ahora cubren reading speed, fast reading, lectura rapida y comprension en ingles y espanol. Eso le da a Leyendo una superficie publica de conocimiento mas fuerte que depender de una sola landing page.",
    pt: "Os guias publicos agora cobrem reading speed, fast reading, lectura rapida e compreensao em ingles e espanhol. Isso da ao Leyendo uma superficie publica de conhecimento mais forte do que depender de uma unica landing page.",
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
  const [founderImgError, setFounderImgError] = useState(false);

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
        url: absoluteUrl("/about"),
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
            {featuredGuides.slice(0, 2).map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
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
              href="/guides"
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

"use client";

import Link from "next/link";

import { ArrowRight, BookOpenText } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { useLocale } from "@/components/layout/locale-provider";
import { getGuidesByCluster, getGuidesByLanguage, guides } from "@/lib/guides";
import { getLocalizedCopy } from "@/lib/locale";
import { absoluteUrl, siteName, siteUrl } from "@/lib/site";

const guidesEyebrow = {
  en: "Guides",
  es: "Guias",
  pt: "Guias",
};

const guidesTitle = {
  en: "Public guides for reading speed, fast reading, and lectura rapida.",
  es: "Guias publicas sobre velocidad de lectura, fast reading y lectura rapida.",
  pt: "Guias publicos sobre velocidade de leitura, fast reading e lectura rapida.",
};

const guidesDescription = {
  en: "These pages target the practical questions behind Leyendo: how to read faster, how to keep comprehension, and how to handle real documents instead of toy examples.",
  es: "Estas paginas responden a las preguntas practicas detras de Leyendo: como leer mas rapido, como mantener la comprension y como tratar documentos reales en vez de ejemplos livianos.",
  pt: "Estas paginas respondem as perguntas praticas por tras do Leyendo: como ler mais rapido, como manter a compreensao e como lidar com documentos reais em vez de exemplos leves.",
};

const supportCards = {
  clusters: {
    title: {
      en: "Keyword clusters covered",
      es: "Clusters de busqueda cubiertos",
      pt: "Grupos de busca cobertos",
    },
    body: {
      en: "The guide set covers reading speed, fast reading, read faster, lectura rapida, leer mas rapido, velocidad de lectura, and comprension lectora.",
      es: "El conjunto de guias cubre reading speed, fast reading, read faster, lectura rapida, leer mas rapido, velocidad de lectura y comprension lectora.",
      pt: "O conjunto de guias cobre reading speed, fast reading, read faster, lectura rapida, leer mas rapido, velocidad de lectura e comprension lectora.",
    },
  },
  intent: {
    title: {
      en: "Built around real intent",
      es: "Pensado para la intencion real",
      pt: "Pensado para a intencao real",
    },
    body: {
      en: "Each guide is written for readers trying to improve pace on PDFs, reports, study material, and dense long-form documents rather than generic speed reading drills.",
      es: "Cada guia esta escrita para lectores que quieren mejorar ritmo en PDF, informes, material de estudio y documentos largos en vez de practicar con ejercicios genericos.",
      pt: "Cada guia foi escrita para leitores que querem melhorar o ritmo em PDF, relatorios, material de estudo e documentos longos em vez de exercicios genericos.",
    },
  },
};

const readGuideLabel = {
  en: "Read guide",
  es: "Leer guia",
  pt: "Ler guia",
};

const importLabel = {
  en: "Import a document",
  es: "Importar documento",
  pt: "Importar documento",
};

const browseByGoalTitle = {
  en: "Start by goal",
  es: "Empieza por objetivo",
  pt: "Comece pelo objetivo",
};

const browseByGoalDescription = {
  en: "These clusters make the internal guide path clearer: reading speed, fast reading, lectura rapida, and comprehension.",
  es: "Estos clusters hacen mas clara la ruta interna entre guias: velocidad de lectura, fast reading, lectura rapida y comprension.",
  pt: "Esses grupos deixam mais claro o caminho interno entre guias: velocidade de leitura, fast reading, lectura rapida e compreensao.",
};

const languageSectionTitle = {
  en: "Browse by language",
  es: "Explora por idioma",
  pt: "Explore por idioma",
};

const languageSectionDescription = {
  en: "The guides now form parallel English and Spanish reading paths so public pages cross-link cleanly across intent and language.",
  es: "Las guias ahora forman rutas paralelas en ingles y espanol para que las paginas publicas se enlacen mejor por intencion e idioma.",
  pt: "As guias agora formam caminhos paralelos em ingles e espanhol para que as paginas publicas se conectem melhor por intencao e idioma.",
};

const clusterCopy = [
  {
    cluster: "reading-speed" as const,
    title: {
      en: "Reading speed",
      es: "Reading speed",
      pt: "Reading speed",
    },
    body: {
      en: "Start here when the query is about reading speed on reports, PDFs, or long-form work material.",
      es: "Empieza aqui cuando la busqueda gira en torno a reading speed aplicado a PDF, informes o material de trabajo.",
      pt: "Comece aqui quando a busca gira em torno de reading speed aplicado a PDF, relatorios ou material de trabalho.",
    },
  },
  {
    cluster: "fast-reading" as const,
    title: {
      en: "Fast reading",
      es: "Fast reading",
      pt: "Fast reading",
    },
    body: {
      en: "Use this path when the user intent is read faster without turning the session into shallow skimming.",
      es: "Usa esta ruta cuando la intencion es leer mas rapido sin caer en una lectura superficial.",
      pt: "Use este caminho quando a intencao e ler mais rapido sem cair numa leitura superficial.",
    },
  },
  {
    cluster: "lectura-rapida" as const,
    title: {
      en: "Lectura rapida",
      es: "Lectura rapida",
      pt: "Lectura rapida",
    },
    body: {
      en: "This is the Spanish public entry point for people searching lectura rapida and leer mas rapido.",
      es: "Esta es la entrada publica en espanol para quien busca lectura rapida y leer mas rapido.",
      pt: "Esta e a entrada publica em espanhol para quem busca lectura rapida e leer mas rapido.",
    },
  },
  {
    cluster: "comprension" as const,
    title: {
      en: "Comprehension",
      es: "Comprension",
      pt: "Compreensao",
    },
    body: {
      en: "Follow this path when the search intent leans toward comprehension, retention, and review discipline.",
      es: "Sigue esta ruta cuando la busqueda se acerca mas a comprension, retencion y disciplina de revision.",
      pt: "Siga este caminho quando a busca se aproxima mais de compreensao, retencao e disciplina de revisao.",
    },
  },
];

export function GuidesPageContent() {
  const { locale } = useLocale();
  const englishGuides = getGuidesByLanguage("en");
  const spanishGuides = getGuidesByLanguage("es");

  const guidesJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${siteName} guides`,
        url: absoluteUrl("/guides"),
        description:
          "Public Leyendo guides for reading speed, fast reading, lectura rapida, and comprehension on real documents.",
      },
      {
        "@type": "ItemList",
        itemListElement: guides.map((guide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/guides/${guide.slug}`),
          name: guide.title,
        })),
      },
      {
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
      },
    ],
  };

  return (
    <AppShell
      eyebrow={guidesEyebrow}
      title={guidesTitle}
      description={guidesDescription}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(guidesJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="space-y-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
            <p className="editorial-kicker text-(--accent-sky)">
              {getLocalizedCopy(locale, supportCards.clusters.title)}
            </p>
            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {getLocalizedCopy(locale, supportCards.clusters.body)}
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
            <p className="editorial-kicker text-(--accent-amber)">
              {getLocalizedCopy(locale, supportCards.intent.title)}
            </p>
            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {getLocalizedCopy(locale, supportCards.intent.body)}
            </p>
          </article>
        </section>

        <section className="space-y-5">
          <div className="max-w-3xl">
            <p className="editorial-kicker text-(--accent-sky)">
              {getLocalizedCopy(locale, browseByGoalTitle)}
            </p>
            <h2 className="font-heading mt-3 text-3xl leading-tight font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, browseByGoalTitle)}
            </h2>
            <p className="mt-4 text-base leading-8 text-(--text-muted)">
              {getLocalizedCopy(locale, browseByGoalDescription)}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {clusterCopy.map((entry) => {
              const clusterGuides = getGuidesByCluster(entry.cluster);

              return (
                <article
                  key={entry.cluster}
                  className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl"
                >
                  <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                    {clusterGuides[0]?.clusterLabel}
                  </p>
                  <h2 className="font-heading mt-3 text-2xl leading-tight font-semibold text-(--text-strong)">
                    {getLocalizedCopy(locale, entry.title)}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-(--text-muted)">
                    {getLocalizedCopy(locale, entry.body)}
                  </p>
                  <div className="mt-5 space-y-2">
                    {clusterGuides.map((guide) => (
                      <Link
                        key={guide.slug}
                        href={`/guides/${guide.slug}`}
                        className="block rounded-[1.1rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                      >
                        {guide.title}
                      </Link>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-5">
          <div className="max-w-3xl">
            <p className="editorial-kicker text-(--accent-amber)">
              {getLocalizedCopy(locale, languageSectionTitle)}
            </p>
            <h2 className="font-heading mt-3 text-3xl leading-tight font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, languageSectionTitle)}
            </h2>
            <p className="mt-4 text-base leading-8 text-(--text-muted)">
              {getLocalizedCopy(locale, languageSectionDescription)}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { title: "English", items: englishGuides },
              { title: "Espanol", items: spanishGuides },
            ].map((group) => (
              <article
                key={group.title}
                className="rounded-[2rem] border border-(--border-soft) bg-(--surface-strong) p-8 shadow-[0_18px_70px_rgba(20,26,56,0.1)]"
              >
                <h2 className="font-heading text-3xl leading-tight font-semibold text-(--text-strong)">
                  {group.title}
                </h2>
                <div className="mt-5 space-y-3">
                  {group.items.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/guides/${guide.slug}`}
                      className="block rounded-[1.2rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    >
                      <p className="text-sm text-(--text-muted)">
                        {guide.clusterLabel}
                      </p>
                      <p className="mt-2 text-base font-semibold text-(--text-strong)">
                        {guide.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {guides.map((guide) => (
            <article
              key={guide.slug}
              className="rounded-[2rem] border border-(--border-soft) bg-(--surface-strong) p-8 shadow-[0_18px_70px_rgba(20,26,56,0.1)]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1 text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                  {guide.languageLabel}
                </span>
                <span className="text-sm text-(--text-muted)">
                  {guide.readingTime}
                </span>
              </div>
              <h2 className="font-heading mt-5 text-3xl leading-tight font-semibold text-(--text-strong)">
                {guide.title}
              </h2>
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
                  <BookOpenText className="h-4 w-4" />
                  {getLocalizedCopy(locale, readGuideLabel)}
                </Link>
                <Link
                  href="/#upload-panel"
                  className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                >
                  <ArrowRight className="h-4 w-4 text-(--accent-sky)" />
                  {getLocalizedCopy(locale, importLabel)}
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

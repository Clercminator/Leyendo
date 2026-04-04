"use client";

import Link from "next/link";

import { ArrowRight, BookOpenText } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { useLocale } from "@/components/layout/locale-provider";
import { getGuidesForLocale, resolveGuideLanguage } from "@/lib/guides";
import { getLocalizedCopy } from "@/lib/locale";
import { absoluteUrl, siteName, siteUrl } from "@/lib/site";

const guidesEyebrow = {
  en: "Guides",
  es: "Guias",
  pt: "Guias",
};

const guidesTitle = {
  en: "Public guides for reading real documents with better pace and comprehension.",
  es: "Guias publicas para leer documentos reales con mejor ritmo y comprension.",
  pt: "Guias publicos para ler documentos reais com melhor ritmo e compreensao.",
};

const guidesDescription = {
  en: "Choose the guide that matches what you want to improve right now, then open a real document when you are ready to test the workflow for yourself.",
  es: "Elige la guia que coincide con lo que quieres mejorar ahora mismo y luego abre un documento real cuando quieras probar el flujo por tu cuenta.",
  pt: "Escolha a guia que combina com o que voce quer melhorar agora e depois abra um documento real quando quiser testar o fluxo por conta propria.",
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
  en: "Pick the guide that matches your immediate reading goal. The page only shows guides in the current site language.",
  es: "Elige la guia que coincide con tu objetivo de lectura inmediato. Esta pagina solo muestra guias en el idioma actual del sitio.",
  pt: "Escolha a guia que combina com seu objetivo de leitura imediato. Esta pagina mostra apenas guias no idioma atual do site quando eles estiverem disponiveis.",
};

const guideLanguageNotice = {
  en: "",
  es: "",
  pt: "",
};

export function GuidesPageContent() {
  const { locale } = useLocale();
  const visibleGuides = getGuidesForLocale(locale);
  const guideLanguage = resolveGuideLanguage(locale);
  const showsFallbackGuides = guideLanguage !== locale;

  const guidesJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${siteName} guides`,
        url: absoluteUrl("/guides"),
        description: getLocalizedCopy(locale, guidesDescription),
      },
      {
        "@type": "ItemList",
        itemListElement: visibleGuides.map((guide, index) => ({
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
            {showsFallbackGuides ? (
              <p className="mt-4 text-sm leading-7 text-(--text-muted)">
                {getLocalizedCopy(locale, guideLanguageNotice)}
              </p>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {visibleGuides.map((guide) => (
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
          </div>
        </section>
      </div>
    </AppShell>
  );
}

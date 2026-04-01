import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  getGuideBySlug,
  getReadingPathGuides,
  getRelatedGuides,
  guides,
} from "@/lib/guides";
import { absoluteUrl, createPageMetadata, siteName, siteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  return createPageMetadata({
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    path: `/guides/${guide.slug}`,
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const relatedGuides = getRelatedGuides(guide);
  const readingPathGuides = getReadingPathGuides(guide);
  const guidePath = `/guides/${guide.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        inLanguage: guide.language === "es" ? "es" : "en",
        mainEntityOfPage: absoluteUrl(guidePath),
        url: absoluteUrl(guidePath),
        keywords: guide.keywords.join(", "),
        articleSection: guide.keywords,
        publisher: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl,
          logo: absoluteUrl("/apple-icon"),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Guides",
            item: absoluteUrl("/guides"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: guide.title,
            item: absoluteUrl(guidePath),
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  const guidesLabel = guide.language === "es" ? "Guias" : "Guides";
  const backLabel =
    guide.language === "es" ? "Volver a guias" : "Back to guides";
  const importLabel =
    guide.language === "es" ? "Importar documento" : "Import a document";
  const relatedLabel =
    guide.language === "es" ? "Guias relacionadas" : "Related guides";
  const faqLabel =
    guide.language === "es"
      ? "Preguntas frecuentes"
      : "Frequently asked questions";
  const audienceLabel = guide.language === "es" ? "Ideal para" : "Best for";
  const takeawaysLabel =
    guide.language === "es" ? "Puntos clave" : "Key takeaways";
  const contentsLabel =
    guide.language === "es" ? "En esta pagina" : "On this page";
  const readingPathLabel =
    guide.language === "es" ? "Ruta recomendada" : "Recommended path";
  const keepExploringLabel =
    guide.language === "es" ? "Sigue explorando" : "Keep exploring";
  const aboutLabel =
    guide.language === "es" ? "Sobre Leyendo" : "About Leyendo";
  const hubLabel =
    guide.language === "es" ? "Ver todas las guias" : "Browse all guides";
  const skipToContentsLabel =
    guide.language === "es"
      ? "Ir al contenido de la guia"
      : "Skip to guide contents";

  return (
    <AppShell
      eyebrow={guidesLabel}
      title={guide.title}
      description={guide.description}
      secondarySkipTargetId="guide-contents"
      secondarySkipLabel={skipToContentsLabel}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="space-y-6">
        <section className="rounded-[2rem] border border-(--border-soft) bg-(--surface-strong) p-8 shadow-[0_18px_70px_rgba(20,26,56,0.1)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1 text-xs tracking-[0.18em] text-(--text-muted) uppercase">
              {guide.languageLabel}
            </span>
            <span className="text-sm text-(--text-muted)">
              {guide.readingTime}
            </span>
          </div>
          <p className="mt-5 max-w-4xl text-base leading-8 text-(--text-muted)">
            {guide.intro}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {guide.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)"
              >
                {keyword}
              </span>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              {backLabel}
            </Link>
            <Link
              href="/#upload-panel"
              className="inline-flex items-center gap-2 rounded-full bg-(--text-strong) px-5 py-3 text-sm font-semibold text-(--text-on-accent) transition hover:opacity-92"
            >
              <ArrowRight className="h-4 w-4" />
              {importLabel}
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
            <p className="editorial-kicker text-(--accent-sky)">
              {audienceLabel}
            </p>
            <p className="mt-4 text-base leading-8 text-(--text-muted)">
              {guide.audience}
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
            <p className="editorial-kicker text-(--accent-amber)">
              {takeawaysLabel}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-(--text-muted)">
              {guide.keyTakeaways.map((takeaway) => (
                <li
                  key={takeaway}
                  className="rounded-[1.15rem] bg-(--surface-soft) px-4 py-3"
                >
                  {takeaway}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <article className="space-y-6">
            {guide.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl"
              >
                <h2 className="font-heading text-2xl leading-tight font-semibold text-(--text-strong)">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-8 text-(--text-muted)">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets ? (
                  <ul className="mt-5 space-y-3 text-sm leading-7 text-(--text-muted)">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="rounded-[1.1rem] bg-(--surface-soft) px-4 py-3"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <section
              id="faq"
              className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl"
            >
              <h2 className="font-heading text-2xl leading-tight font-semibold text-(--text-strong)">
                {faqLabel}
              </h2>
              <div className="mt-5 space-y-4">
                {guide.faqs.map((faq) => (
                  <article
                    key={faq.question}
                    className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-soft) p-4"
                  >
                    <h3 className="text-base font-semibold text-(--text-strong)">
                      {faq.question}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                      {faq.answer}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
              <h2 className="font-heading text-2xl leading-tight font-semibold text-(--text-strong)">
                {keepExploringLabel}
              </h2>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <Link
                  href="/guides"
                  className="rounded-[1.2rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                >
                  <p className="text-sm font-semibold text-(--text-strong)">
                    {hubLabel}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-(--text-muted)">
                    {guide.language === "es"
                      ? "Explora todas las rutas publicas por idioma e intencion."
                      : "Explore every public path by language and search intent."}
                  </p>
                </Link>
                <Link
                  href="/about"
                  className="rounded-[1.2rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                >
                  <p className="text-sm font-semibold text-(--text-strong)">
                    {aboutLabel}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-(--text-muted)">
                    {guide.language === "es"
                      ? "Ve por que existe Leyendo y como se conecta con estas guias."
                      : "See why Leyendo exists and how the product ties into these guides."}
                  </p>
                </Link>
                <Link
                  href="/#upload-panel"
                  className="rounded-[1.2rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                >
                  <p className="text-sm font-semibold text-(--text-strong)">
                    {importLabel}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-(--text-muted)">
                    {guide.language === "es"
                      ? "Pasa del contenido publico a una prueba real con tu propio documento."
                      : "Move from public content into a real test with your own document."}
                  </p>
                </Link>
              </div>
            </section>
          </article>

          <aside
            id="guide-contents"
            className="space-y-4 lg:sticky lg:top-24 lg:self-start"
          >
            <section className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-5 backdrop-blur-xl">
              <p className="editorial-kicker text-(--accent-amber)">
                {contentsLabel}
              </p>
              <div className="mt-4 space-y-2">
                {guide.sections.map((section) => (
                  <Link
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    {section.title}
                  </Link>
                ))}
                <Link
                  href="#faq"
                  className="block rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                >
                  {faqLabel}
                </Link>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-5 backdrop-blur-xl">
              <p className="editorial-kicker text-(--accent-sky)">
                {relatedLabel}
              </p>
              <div className="mt-4 space-y-3">
                {relatedGuides.map((relatedGuide) => (
                  <Link
                    key={relatedGuide.slug}
                    href={`/guides/${relatedGuide.slug}`}
                    className="block rounded-[1.2rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <p className="text-sm text-(--text-muted)">
                      {relatedGuide.languageLabel}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-(--text-strong)">
                      {relatedGuide.title}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-5 backdrop-blur-xl">
              <p className="editorial-kicker text-(--accent-sky)">
                {readingPathLabel}
              </p>
              <div className="mt-4 space-y-3">
                {readingPathGuides.map(({ guide: stepGuide, reason }) => (
                  <Link
                    key={stepGuide.slug}
                    href={`/guides/${stepGuide.slug}`}
                    className="block rounded-[1.2rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-4 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    <p className="text-sm text-(--text-muted)">
                      {stepGuide.clusterLabel}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-(--text-strong)">
                      {stepGuide.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-(--text-muted)">
                      {reason}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

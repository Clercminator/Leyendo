import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OpenGuideInReaderButton } from "@/components/guides/open-guide-in-reader-button";
import { AppShell } from "@/components/layout/app-shell";
import { getGuideBySlug, guides, serializeGuideToMarkdown } from "@/lib/guides";
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

  const guideReaderMarkdown = serializeGuideToMarkdown(guide);
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
  const importLabel =
    guide.language === "es" ? "Importar documento" : "Import a document";
  const faqLabel =
    guide.language === "es"
      ? "Preguntas frecuentes"
      : "Frequently asked questions";
  const audienceLabel = guide.language === "es" ? "Ideal para" : "Best for";
  const takeawaysLabel =
    guide.language === "es" ? "Puntos clave" : "Key takeaways";
  const keepExploringLabel =
    guide.language === "es" ? "Sigue explorando" : "Keep exploring";
  const aboutLabel =
    guide.language === "es" ? "Sobre Leyendo" : "About Leyendo";
  const hubLabel =
    guide.language === "es" ? "Ver todas las guias" : "Browse all guides";
  const skipToContentsLabel =
    guide.language === "es" ? "Ir al articulo" : "Skip to the article";
  const readerLabel =
    guide.language === "es"
      ? "Leer este articulo mas rapido con Leyendo"
      : "Read this article faster with Leyendo";
  const readerLoadingLabel =
    guide.language === "es" ? "Abriendo en Leyendo" : "Opening in Leyendo";
  const readerErrorLabel =
    guide.language === "es"
      ? "No se pudo abrir la guia en el lector. Intentalo otra vez."
      : "Could not open the guide in the reader. Try again.";

  return (
    <AppShell
      mainClassName="max-w-[92rem] px-4 py-6 sm:px-6 sm:py-8 xl:px-8 xl:py-10"
      secondarySkipTargetId="guide-article"
      secondarySkipLabel={skipToContentsLabel}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="space-y-14 xl:space-y-16">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.58fr)_minmax(24rem,0.82fr)] lg:items-end xl:gap-12">
          <div className="max-w-none">
            <p className="editorial-kicker text-(--accent-amber)">
              {guidesLabel}
            </p>
            <h1 className="guide-hero-title font-heading mt-4 text-(--text-strong)">
              {guide.title}
            </h1>
          </div>

          <div className="max-w-none lg:pb-5 xl:pb-6">
            <p className="guide-hero-description text-(--text-muted)">
              {guide.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1 text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                {guide.languageLabel}
              </span>
              <span className="text-sm text-(--text-muted)">
                {guide.readingTime}
              </span>
              <OpenGuideInReaderButton
                guideSlug={guide.slug}
                guideTitle={guide.title}
                guideMarkdown={guideReaderMarkdown}
                label={readerLabel}
                loadingLabel={readerLoadingLabel}
                errorLabel={readerErrorLabel}
                className="px-5 py-3 text-sm shadow-[0_14px_34px_rgba(7,11,22,0.12)]"
              />
            </div>
          </div>
        </section>

        <article
          id="guide-article"
          className="editorial-panel overflow-hidden rounded-[2rem] border border-(--border-soft) bg-(--surface-card) shadow-[0_20px_80px_rgba(20,26,56,0.12)] backdrop-blur-xl"
        >
          <header className="border-b border-(--border-soft) p-7 sm:p-9 xl:p-12">
            <p className="guide-article-intro text-(--text-muted)">
              {guide.intro}
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {guide.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-muted)"
                >
                  {keyword}
                </span>
              ))}
            </div>

            <section className="mt-9 rounded-[1.6rem] border border-(--border-soft) bg-(--surface-soft) p-6 sm:p-7">
              <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)] xl:gap-8">
                <div>
                  <p className="editorial-kicker text-(--accent-sky)">
                    {audienceLabel}
                  </p>
                  <p className="mt-4 text-[1.02rem] leading-8 text-(--text-muted)">
                    {guide.audience}
                  </p>
                </div>
                <div>
                  <p className="editorial-kicker text-(--accent-amber)">
                    {takeawaysLabel}
                  </p>
                  <ul className="mt-5 space-y-3.5 text-[0.98rem] leading-8 text-(--text-muted)">
                    {guide.keyTakeaways.map((takeaway) => (
                      <li key={takeaway} className="flex items-start gap-3">
                        <span className="mt-2 h-2.5 w-2.5 rounded-full bg-(--accent-sky)" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </header>

          <div className="p-7 sm:p-9 xl:p-12">
            {guide.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className={
                  index === 0
                    ? "scroll-mt-24 pb-12 xl:pb-14"
                    : "scroll-mt-24 border-t border-(--border-soft) py-12 xl:py-14"
                }
              >
                <div>
                  <h2 className="guide-section-heading font-heading font-semibold text-(--text-strong)">
                    {section.title}
                  </h2>
                  <div className="guide-body-copy mt-7 space-y-6 text-(--text-muted)">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.bullets ? (
                    <ul className="mt-9 space-y-5 text-[1.03rem] leading-8 text-(--text-muted)">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <span className="mt-3 h-2.5 w-2.5 rounded-full bg-(--accent-amber)" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}

            <section
              id="faq"
              className="scroll-mt-24 border-t border-(--border-soft) py-12 xl:py-14"
            >
              <div>
                <h2 className="guide-section-heading font-heading font-semibold text-(--text-strong)">
                  {faqLabel}
                </h2>
                <div className="mt-7 space-y-4.5">
                  {guide.faqs.map((faq) => (
                    <details
                      key={faq.question}
                      className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-5 py-4.5 sm:px-6"
                    >
                      <summary className="cursor-pointer list-none text-[1.02rem] font-semibold text-(--text-strong) sm:text-[1.08rem]">
                        {faq.question}
                      </summary>
                      <p className="mt-3.5 pr-6 text-[1.02rem] leading-8 text-(--text-muted)">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-t border-(--border-soft) pt-12 xl:pt-14">
              <h2 className="guide-section-heading font-heading font-semibold text-(--text-strong)">
                {keepExploringLabel}
              </h2>
              <div className="mt-7 grid gap-4 lg:grid-cols-3">
                <Link
                  href="/guides"
                  className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-5 py-5 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
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
                  className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-5 py-5 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
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
                  className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-5 py-5 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
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
          </div>
        </article>
      </div>
    </AppShell>
  );
}

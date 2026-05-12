import { generatedSpanishGuides } from "./guides-es.generated";
import { generatedPortugueseGuides } from "./guides-pt.generated";
import { manualGuides } from "./guides-data/guides-manual";
import type { AppLocale } from "@/lib/locale";

export type GuideLanguage = "en" | "es" | "pt";

export type GuideSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type GuideCluster =
  | "reading-speed"
  | "fast-reading"
  | "lectura-rapida"
  | "comprension"
  | "reading-benefits"
  | "comprehension"
  | "focus"
  | "retention"
  | "reading-strategy"
  | "study-reading"
  | "academic-reading"
  | "reading-endurance"
  | "active-reading"
  | "notes"
  | "review"
  | "screen-reading"
  | "reading-habit"
  | "app-comparison"
  | "study-tools"
  | "app-selection";

export type GuideCrossLink = {
  slug: string;
  reason: string;
};

export type GuideFaq = {
  question: string;
  answer: string;
};

export type Guide = {
  slug: string;
  language: GuideLanguage;
  languageLabel: string;
  cluster: GuideCluster;
  clusterLabel: string;
  title: string;
  description: string;
  intro: string;
  readingTime: string;
  audience: string;
  keyTakeaways: string[];
  keywords: string[];
  sections: GuideSection[];
  faqs: GuideFaq[];
  readingPath: GuideCrossLink[];
  relatedSlugs: string[];
};

export const guides: readonly Guide[] = [
  ...manualGuides,
  ...generatedSpanishGuides,
  ...generatedPortugueseGuides,
];

export function getGuideBySlug(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}

export function getRelatedGuides(guide: Guide) {
  return guide.relatedSlugs
    .map((slug) => getGuideBySlug(slug))
    .filter(
      (relatedGuide): relatedGuide is Guide =>
        relatedGuide !== undefined && relatedGuide.language === guide.language,
    );
}

export function getReadingPathGuides(guide: Guide) {
  return guide.readingPath
    .map((step) => {
      const linkedGuide = getGuideBySlug(step.slug);

      if (!linkedGuide) {
        return undefined;
      }

      return {
        guide: linkedGuide,
        reason: step.reason,
      };
    })
    .filter(
      (
        step,
      ): step is {
        guide: Guide;
        reason: string;
      } => step !== undefined && step.guide.language === guide.language,
    );
}

export function resolveGuideLanguage(locale: AppLocale): GuideLanguage {
  return locale;
}

export function getGuidesByLanguage(language: GuideLanguage) {
  return guides.filter((guide) => guide.language === language);
}

export function getGuidesByCluster(cluster: GuideCluster) {
  return guides.filter((guide) => guide.cluster === cluster);
}

export function getGuidesForLocale(locale: AppLocale) {
  return getGuidesByLanguage(resolveGuideLanguage(locale));
}

export function getGuidesByClusterForLocale(
  cluster: GuideCluster,
  locale: AppLocale,
) {
  const language = resolveGuideLanguage(locale);

  return guides.filter(
    (guide) => guide.cluster === cluster && guide.language === language,
  );
}

export function getFeaturedGuidesForLocale(locale: AppLocale, limit = 2) {
  return getGuidesForLocale(locale).slice(0, limit);
}

export const featuredGuides = guides.slice(0, 4);

export function getGuideReaderDocumentId(slug: string) {
  return `guide:${slug}:v1`;
}

export function serializeGuideToMarkdown(guide: Guide) {
  const audienceHeading =
    guide.language === "es"
      ? "Ideal para"
      : guide.language === "pt"
        ? "Ideal para"
        : "Best for";
  const takeawaysHeading =
    guide.language === "es"
      ? "Puntos clave"
      : guide.language === "pt"
        ? "Pontos-chave"
        : "Key takeaways";
  const faqHeading =
    guide.language === "es"
      ? "Preguntas frecuentes"
      : guide.language === "pt"
        ? "Perguntas frequentes"
        : "Frequently asked questions";

  const content = [
    `# ${guide.title}`,
    guide.description,
    guide.intro,
    `## ${audienceHeading}`,
    guide.audience,
    `## ${takeawaysHeading}`,
    ...guide.keyTakeaways.map((takeaway) => `- ${takeaway}`),
    ...guide.sections.flatMap((section) => [
      `## ${section.title}`,
      ...section.paragraphs,
      ...(section.bullets?.map((bullet) => `- ${bullet}`) ?? []),
    ]),
    `## ${faqHeading}`,
    ...guide.faqs.flatMap((faq) => [`### ${faq.question}`, faq.answer]),
  ];

  return content.join("\n\n");
}

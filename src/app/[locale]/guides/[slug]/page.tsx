import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  createGuidePageMetadata,
  GuideArticlePage,
} from "@/components/guides/guide-article-page";
import { getGuideBySlug, getGuidesByLanguage } from "@/lib/guides";
import { getLocalizedPublicPath, isTranslatedPublicLocale } from "@/lib/public-paths";

export const dynamicParams = false;

export function generateStaticParams() {
  return (["es", "pt"] as const).flatMap((locale) =>
    getGuidesByLanguage(locale).map((guide) => ({
      locale,
      slug: guide.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  const guide = getGuideBySlug(slug);

  if (!guide || guide.language !== locale) {
    notFound();
  }

  return createGuidePageMetadata({
    guide,
    path: getLocalizedPublicPath(`/guides/${guide.slug}`, locale),
  });
}

export default async function LocalizedGuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  const guide = getGuideBySlug(slug);

  if (!guide || guide.language !== locale) {
    notFound();
  }

  return <GuideArticlePage guide={guide} />;
}

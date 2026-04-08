import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuidesPageContent } from "@/components/guides/guides-page-content";
import { publicPageMetadataCopy } from "@/lib/public-metadata";
import { isTranslatedPublicLocale } from "@/lib/public-paths";
import { createPublicPageMetadata } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  return createPublicPageMetadata({
    ...publicPageMetadataCopy.guides[locale],
    path: "/guides",
    locale,
  });
}

export default async function LocalizedGuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  return <GuidesPageContent />;
}

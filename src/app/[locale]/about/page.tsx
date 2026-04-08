import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AboutPageContent } from "@/components/about/about-page-content";
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
    ...publicPageMetadataCopy.about[locale],
    path: "/about",
    locale,
  });
}

export default async function LocalizedAboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  return <AboutPageContent />;
}

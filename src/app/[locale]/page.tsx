import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomePageContent } from "@/components/home/home-page-content";
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
    ...publicPageMetadataCopy.home[locale],
    path: "/",
    locale,
  });
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  return <HomePageContent />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PricingPageContent } from "@/components/pricing/pricing-page-content";
import { publicPageMetadataCopy } from "@/lib/public-metadata";
import { isTranslatedPublicLocale } from "@/lib/public-paths";
import { createPublicPageMetadata } from "@/lib/site";

interface LocalizedPricingPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    payment?: string;
    plan?: string;
  }>;
}

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
    ...publicPageMetadataCopy.pricing[locale],
    path: "/pricing",
    locale,
  });
}

export default async function LocalizedPricingPage({
  params,
  searchParams,
}: LocalizedPricingPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  return (
    <AppShell mainClassName="px-0 py-0 sm:px-0 sm:py-0 xl:py-0">
      <PricingPageContent
        initialPaymentStatus={resolvedSearchParams.payment}
        initialPlanId={resolvedSearchParams.plan}
      />
    </AppShell>
  );
}

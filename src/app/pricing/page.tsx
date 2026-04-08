import type { Metadata } from "next";

import { LocaleProvider } from "@/components/layout/locale-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PricingPageContent } from "@/components/pricing/pricing-page-content";
import { publicPageMetadataCopy } from "@/lib/public-metadata";
import { createPublicPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPublicPageMetadata({
  ...publicPageMetadataCopy.pricing.en,
  path: "/pricing",
  locale: "en",
});

interface PricingPageProps {
  searchParams?: Promise<{
    payment?: string;
  }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <LocaleProvider initialLocale="en">
      <AppShell mainClassName="px-0 py-0 sm:px-0 sm:py-0 xl:py-0">
        <PricingPageContent initialPaymentStatus={resolvedSearchParams.payment} />
      </AppShell>
    </LocaleProvider>
  );
}

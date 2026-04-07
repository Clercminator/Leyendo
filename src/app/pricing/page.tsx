import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { PricingPageContent } from "@/components/pricing/pricing-page-content";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Pricing",
  description:
    "Compare Leyendo Basic Reader, Focus, and Max plans, then choose MercadoPago, LemonSqueezy, or Binance depending on how you want to pay.",
  keywords: [
    "Leyendo pricing",
    "reading app pricing",
    "MercadoPago",
    "LemonSqueezy",
    "Binance Pay",
    "PDF reader subscription",
  ],
  path: "/pricing",
});

interface PricingPageProps {
  searchParams?: Promise<{
    payment?: string;
  }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <AppShell mainClassName="px-0 py-0 sm:px-0 sm:py-0 xl:py-0">
      <PricingPageContent initialPaymentStatus={resolvedSearchParams.payment} />
    </AppShell>
  );
}

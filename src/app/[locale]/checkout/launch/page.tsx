import { notFound } from "next/navigation";

import { HostedCheckoutLauncher } from "@/components/pricing/hosted-checkout-launcher";
import { isTranslatedPublicLocale } from "@/lib/public-paths";

interface LocalizedCheckoutLaunchPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    plan?: string;
    provider?: string;
  }>;
}

export default async function LocalizedCheckoutLaunchPage({
  params,
  searchParams,
}: LocalizedCheckoutLaunchPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  return (
    <HostedCheckoutLauncher
      initialPlan={resolvedSearchParams.plan}
      initialProvider={resolvedSearchParams.provider}
    />
  );
}

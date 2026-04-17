import { HostedCheckoutLauncher } from "@/components/pricing/hosted-checkout-launcher";

interface CheckoutLaunchPageProps {
  searchParams?: Promise<{
    plan?: string;
    provider?: string;
  }>;
}

export default async function CheckoutLaunchPage({
  searchParams,
}: CheckoutLaunchPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <HostedCheckoutLauncher
      initialPlan={resolvedSearchParams.plan}
      initialProvider={resolvedSearchParams.provider}
    />
  );
}

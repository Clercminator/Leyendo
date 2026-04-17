import type { PaidPlanTier } from "@/lib/plans";
import {
  normalizePaidPlanTier,
  type HostedPaymentProvider,
  type PaymentLocale,
} from "@/lib/payment-config";
import { getLocalizedPublicPath } from "@/lib/public-paths";

export const paidSignupPlanStorageKey = "leyendo_paid_signup_plan";
export const pendingCheckoutPlanStorageKey = "leyendo_pending_checkout_plan";
export const pendingCheckoutProviderStorageKey =
  "leyendo_pending_checkout_provider";
export const pendingCheckoutSubscriptionIdStorageKey =
  "leyendo_pending_checkout_subscription_id";

export function isHostedPaymentProvider(
  value: unknown,
): value is HostedPaymentProvider {
  return value === "lemonsqueezy" || value === "mercadopago";
}

export function normalizeHostedCheckoutIntent(params: {
  plan?: unknown;
  provider?: unknown;
}) {
  const planId = normalizePaidPlanTier(params.plan);
  const provider = isHostedPaymentProvider(params.provider)
    ? params.provider
    : undefined;

  return {
    planId,
    provider,
  };
}

export function buildHostedCheckoutLaunchPath(params: {
  locale: PaymentLocale;
  planId: PaidPlanTier;
  provider: HostedPaymentProvider;
}) {
  const searchParams = new URLSearchParams({
    plan: params.planId,
    provider: params.provider,
  });

  return `${getLocalizedPublicPath("/checkout/launch", params.locale)}?${searchParams.toString()}`;
}

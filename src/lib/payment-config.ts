import { isPaidPlan, normalizePlanTier, type PaidPlanTier } from "@/lib/plans";

export type PaymentLocale = "en" | "es" | "pt";

const DEFAULT_MERCADOPAGO_CHECKOUT_BASE_URL =
  "https://www.mercadopago.com.ar/subscriptions/checkout";
const DEFAULT_LEMONSQUEEZY_VARIANT_IDS = {
  focus: "1497164",
} satisfies Partial<Record<PaidPlanTier, string>>;

export function normalizePaymentLocale(value: unknown): PaymentLocale {
  return value === "es" || value === "pt" ? value : "en";
}

export function normalizePaidPlanTier(
  value: unknown,
): PaidPlanTier | undefined {
  const normalizedPlan = normalizePlanTier(value);
  return isPaidPlan(normalizedPlan) ? normalizedPlan : undefined;
}

export function buildMercadoPagoSubscriptionUrl(
  planId: string,
  baseUrl = process.env.NEXT_PUBLIC_MERCADOPAGO_CHECKOUT_BASE_URL?.trim() ||
    DEFAULT_MERCADOPAGO_CHECKOUT_BASE_URL,
) {
  const checkoutUrl = new URL(baseUrl);
  checkoutUrl.searchParams.set("preapproval_plan_id", planId);
  return checkoutUrl.toString();
}

export function getMercadoPagoCheckoutUrl(planTier: PaidPlanTier) {
  const explicitUrl =
    planTier === "focus"
      ? process.env.NEXT_PUBLIC_MERCADOPAGO_FOCUS_URL?.trim()
      : process.env.NEXT_PUBLIC_MERCADOPAGO_MAX_URL?.trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  const planId =
    planTier === "focus"
      ? process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID?.trim()
      : process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID?.trim();

  if (planId) {
    return buildMercadoPagoSubscriptionUrl(planId);
  }

  return undefined;
}

export function getLemonSqueezyVariantId(planTier: PaidPlanTier) {
  if (planTier === "max") {
    return process.env.LEMONSQUEEZY_VARIANT_MAX?.trim();
  }

  return (
    process.env.LEMONSQUEEZY_VARIANT_FOCUS?.trim() ||
    process.env.LEMONSQUEEZY_VARIANT_STANDARD?.trim() ||
    process.env.LEMONSQUEEZY_VARIANT_BUILDER?.trim() ||
    DEFAULT_LEMONSQUEEZY_VARIANT_IDS.focus
  );
}

export function getPricingPathForLocale(locale: PaymentLocale) {
  return locale === "en" ? "/pricing" : `/${locale}/pricing`;
}

export function buildPricingReturnUrl(args: {
  locale: PaymentLocale;
  origin: string;
  planTier: PaidPlanTier;
  paymentStatus?: "success" | "failed" | "pending";
}) {
  const returnUrl = new URL(getPricingPathForLocale(args.locale), args.origin);
  returnUrl.searchParams.set("plan", args.planTier);
  returnUrl.searchParams.set("payment", args.paymentStatus ?? "success");
  return returnUrl.toString();
}

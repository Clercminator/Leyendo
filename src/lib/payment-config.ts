import { isPaidPlan, normalizePlanTier, type PaidPlanTier } from "@/lib/plans";

export type PaymentLocale = "en" | "es" | "pt";

const DEFAULT_MERCADOPAGO_CHECKOUT_BASE_URL =
  "https://www.mercadopago.com.ar/subscriptions/checkout";
const MERCADOPAGO_PLAN_ID_PATTERN = /^[a-f0-9]{32}$/i;

function pickFirstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

export function pickPaymentEnvValue(args: {
  live: Array<string | undefined>;
  testing?: Array<string | undefined>;
  compatibility?: Array<string | undefined>;
}) {
  const testingValues = args.testing ?? [];
  const compatibilityValues = args.compatibility ?? [];

  return process.env.VERCEL_ENV === "preview"
    ? pickFirstNonEmpty(
        ...testingValues,
        ...args.live,
        ...compatibilityValues,
      )
    : pickFirstNonEmpty(
        ...args.live,
        ...testingValues,
        ...compatibilityValues,
      );
}

function normalizeMercadoPagoPlanId(value: string | undefined) {
  const planId = value?.trim();

  if (!planId) {
    return undefined;
  }

  return MERCADOPAGO_PLAN_ID_PATTERN.test(planId) ? planId : undefined;
}

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
      ? pickPaymentEnvValue({
          live: [process.env.NEXT_PUBLIC_MERCADOPAGO_FOCUS_URL],
          testing: [
            process.env.NEXT_PUBLIC_MERCADOPAGO_FOCUS_URL_PRUEBA,
            process.env.NEXT_PUBLIC_MERCADOPAGO_FOCUS_URL_TESTING,
          ],
        })
      : pickPaymentEnvValue({
          live: [process.env.NEXT_PUBLIC_MERCADOPAGO_MAX_URL],
          testing: [
            process.env.NEXT_PUBLIC_MERCADOPAGO_MAX_URL_PRUEBA,
            process.env.NEXT_PUBLIC_MERCADOPAGO_MAX_URL_TESTING,
          ],
        });

  if (explicitUrl) {
    return explicitUrl;
  }

  const planId =
    planTier === "focus"
      ? normalizeMercadoPagoPlanId(
          pickPaymentEnvValue({
            live: [process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID],
            testing: [
              process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA,
            ],
          }),
        )
      : normalizeMercadoPagoPlanId(
          pickPaymentEnvValue({
            live: [process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID],
            testing: [process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID_PRUEBA],
          }),
        );

  if (planId) {
    return buildMercadoPagoSubscriptionUrl(planId);
  }

  return undefined;
}

export function getLemonSqueezyVariantId(planTier: PaidPlanTier) {
  if (planTier === "max") {
    return pickPaymentEnvValue({
      live: [process.env.LEMONSQUEEZY_VARIANT_MAX],
      testing: [
        process.env.LEMONSQUEEZY_VARIANT_MAX_TESTING,
        process.env.LEMONSQUEEZY_VARIANT_MAX_PRUEBA,
        process.env.LEMONSQUEEZY_MAX_VARIANT_TESTING,
        process.env.LEMONSQUEEZY_MAX_VARIANT_TESTING_ACCOUNT,
      ],
    });
  }

  return pickPaymentEnvValue({
    live: [
      process.env.LEMONSQUEEZY_VARIANT_FOCUS,
      process.env.LEMONSQUEEZY_VARIANT_STANDARD,
      process.env.LEMONSQUEEZY_VARIANT_BUILDER,
    ],
    testing: [
      process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING,
      process.env.LEMONSQUEEZY_VARIANT_FOCUS_PRUEBA,
      process.env.LEMONSQUEEZY_FOCUS_VARIANT_TESTING,
      process.env.LEMONSQUEEZY_FOCUS_VARIANT_TESTING_ACCOUNT,
      process.env.LEMONSQUEEZY_VARIANT_STANDARD_TESTING,
      process.env.LEMONSQUEEZY_VARIANT_BUILDER_TESTING,
    ],
  });
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

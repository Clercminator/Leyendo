import { NextRequest, NextResponse } from "next/server";

import {
  buildPricingReturnUrl,
  getLemonSqueezyVariantId,
  normalizePaidPlanTier,
  normalizePaymentLocale,
  pickPaymentEnvValue,
} from "@/lib/payment-config";

const LEMONSQUEEZY_API = "https://api.lemonsqueezy.com/v1";

interface CheckoutRequestBody {
  locale?: string;
  plan?: string;
  userEmail?: string;
  userId?: string;
}

interface LemonSqueezyErrorPayload {
  data?: {
    attributes?: {
      url?: string;
    };
  };
  errors?: Array<{
    detail?: string;
    title?: string;
  }>;
}

function pickFirstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function resolveLemonSqueezyCheckoutError(
  payload: LemonSqueezyErrorPayload | null,
) {
  const providerMessage =
    payload?.errors?.[0]?.detail || payload?.errors?.[0]?.title;

  if (!providerMessage) {
    return "LemonSqueezy could not create the checkout.";
  }

  if (/related resource does not exist/i.test(providerMessage)) {
    return "LemonSqueezy could not create the checkout because the configured store id and variant id do not belong to the same account. Check LEMONSQUEEZY_STORE_ID or LEMONSQUEEZY_STORE_ID_TESTING and the selected LEMONSQUEEZY_VARIANT_* value in Vercel.";
  }

  return providerMessage;
}

export async function POST(request: NextRequest) {
  const apiKey =
    pickPaymentEnvValue({
      live: [process.env.LEMONSQUEEZY_API_KEY],
      testing: [
        process.env.LEMONSQUEEZY_API_KEY_TESTING,
        process.env.LEMONSQUEEZY_API_KEY_PRUEBA,
        process.env.LEMONSQUEEZY_TESTING_API_KEY,
        process.env.LEMONSQUEEZY_API_KEY_TESTING_ACCOUNT,
      ],
    }) ?? "";
  const storeId =
    pickPaymentEnvValue({
      live: [process.env.LEMONSQUEEZY_STORE_ID],
      testing: [
        process.env.LEMONSQUEEZY_STORE_ID_TESTING,
        process.env.LEMONSQUEEZY_STORE_ID_PRUEBA,
        process.env.LEMONSQUEEZY_TESTING_STORE_ID,
        process.env.LEMONSQUEEZY_STORE_ID_TESTING_ACCOUNT,
      ],
    }) ?? "";

  if (!apiKey || !storeId) {
    return NextResponse.json(
      {
        error:
          "LemonSqueezy is not configured yet. Supported env names include LEMONSQUEEZY_API_KEY / LEMONSQUEEZY_API_KEY_TESTING and LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_STORE_ID_TESTING.",
      },
      { status: 500 },
    );
  }

  let body: CheckoutRequestBody;

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid checkout request body." },
      { status: 400 },
    );
  }

  const planTier = normalizePaidPlanTier(body.plan);
  if (!planTier) {
    return NextResponse.json(
      { error: "A paid plan is required to start checkout." },
      { status: 400 },
    );
  }

  const variantId = getLemonSqueezyVariantId(planTier);
  if (!variantId) {
    return NextResponse.json(
      {
        error:
          planTier === "focus"
            ? "No Focus LemonSqueezy variant is configured. Supported env names include LEMONSQUEEZY_VARIANT_FOCUS, LEMONSQUEEZY_VARIANT_FOCUS_TESTING, LEMONSQUEEZY_VARIANT_STANDARD, and LEMONSQUEEZY_VARIANT_BUILDER."
            : "No Max LemonSqueezy variant is configured. Supported env names include LEMONSQUEEZY_VARIANT_MAX and LEMONSQUEEZY_VARIANT_MAX_TESTING.",
      },
      { status: 500 },
    );
  }

  const locale = normalizePaymentLocale(body.locale);
  const redirectUrl = buildPricingReturnUrl({
    locale,
    origin: request.nextUrl.origin,
    planTier,
    paymentStatus: "success",
  });
  const userEmail =
    typeof body.userEmail === "string" ? body.userEmail.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";

  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        product_options: {
          redirect_url: redirectUrl,
        },
        checkout_data: {
          ...(userEmail ? { email: userEmail } : {}),
          ...(userId ? { custom: { user_id: userId } } : {}),
        },
      },
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: variantId } },
      },
    },
  };

  const response = await fetch(`${LEMONSQUEEZY_API}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await response
    .json()
    .catch(() => null)) as LemonSqueezyErrorPayload | null;

  if (!response.ok) {
    return NextResponse.json(
      {
        error: resolveLemonSqueezyCheckoutError(data),
      },
      { status: response.status },
    );
  }

  const checkoutUrl = data?.data?.attributes?.url;
  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "LemonSqueezy returned no checkout URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({ checkoutUrl });
}

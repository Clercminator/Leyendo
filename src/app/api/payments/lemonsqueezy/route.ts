import { NextRequest, NextResponse } from "next/server";

import {
  buildPricingReturnUrl,
  getLemonSqueezyVariantId,
  normalizePaidPlanTier,
  normalizePaymentLocale,
} from "@/lib/payment-config";

const LEMONSQUEEZY_API = "https://api.lemonsqueezy.com/v1";

interface CheckoutRequestBody {
  locale?: string;
  plan?: string;
  userEmail?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim() ?? "";
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim() ?? "";

  if (!apiKey || !storeId) {
    return NextResponse.json(
      {
        error:
          "LemonSqueezy is not configured yet. Add LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID on Vercel.",
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
            ? "No Focus LemonSqueezy variant is configured. Add LEMONSQUEEZY_VARIANT_FOCUS on Vercel."
            : "No Max LemonSqueezy variant is configured. Add LEMONSQUEEZY_VARIANT_MAX on Vercel.",
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

  const data = (await response.json().catch(() => null)) as {
    data?: {
      attributes?: {
        url?: string;
      };
    };
    errors?: Array<{
      detail?: string;
      title?: string;
    }>;
  } | null;

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          data?.errors?.[0]?.detail ||
          data?.errors?.[0]?.title ||
          "LemonSqueezy could not create the checkout.",
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

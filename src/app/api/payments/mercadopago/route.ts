import { NextRequest, NextResponse } from "next/server";

import {
  buildAccountReturnUrl,
  buildMercadoPagoSubscriptionUrl,
  normalizePaidPlanTier,
  pickPaymentEnvValue,
  withMercadoPagoCheckoutParams,
} from "@/lib/payment-config";

const MERCADOPAGO_API = "https://api.mercadopago.com";
const MERCADOPAGO_PLAN_ID_PATTERN = /^[a-f0-9]{32}$/i;

interface CheckoutRequestBody {
  locale?: string;
  plan?: string;
  userEmail?: string;
  userId?: string;
}

interface MercadoPagoCheckoutPayload {
  cause?: Array<{
    description?: string;
  }>;
  error?: string;
  error_description?: string;
  id?: string;
  init_point?: string;
  message?: string;
  sandbox_init_point?: string;
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

function normalizeMercadoPagoPlanId(value: string | undefined) {
  const planId = value?.trim();

  if (!planId) {
    return undefined;
  }

  return MERCADOPAGO_PLAN_ID_PATTERN.test(planId) ? planId : undefined;
}

function getMercadoPagoAccessToken() {
  return (
    pickPaymentEnvValue({
      live: [process.env.MERCADOPAGO_ACCESS_TOKEN],
      testing: [
        process.env.MERCADOPAGO_ACCESS_TOKEN_PRUEBA,
        process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING,
        process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT,
      ],
    }) ?? ""
  );
}

function buildMercadoPagoNotificationUrl() {
  const supabaseProjectUrl = pickFirstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  );

  if (!supabaseProjectUrl) {
    return undefined;
  }

  const notificationUrl = new URL(
    "/functions/v1/mercado-pago-webhook",
    supabaseProjectUrl,
  );
  notificationUrl.searchParams.set("source_news", "webhooks");
  return notificationUrl.toString();
}

function resolveMercadoPagoCheckoutError(
  payload: MercadoPagoCheckoutPayload | null,
) {
  const causeMessage = payload?.cause?.find((cause) =>
    cause.description?.trim(),
  )?.description;
  const providerMessage =
    causeMessage?.trim() ||
    payload?.message?.trim() ||
    payload?.error_description?.trim() ||
    payload?.error?.trim();

  if (!providerMessage) {
    return "MercadoPago could not create the checkout.";
  }

  if (/access token|invalid token|unauthorized/i.test(providerMessage)) {
    return "MercadoPago could not create the checkout because the configured access token does not match the selected account.";
  }

  return providerMessage;
}

function getMercadoPagoEnvAliases(planTier: "focus" | "max") {
  if (planTier === "focus") {
    return {
      explicitUrl: pickPaymentEnvValue({
        live: [
          process.env.NEXT_PUBLIC_MERCADOPAGO_FOCUS_URL,
          process.env.MERCADOPAGO_FOCUS_URL,
        ],
        testing: [process.env.MERCADOPAGO_FOCUS_URL_TESTING],
      }),
      planId: normalizeMercadoPagoPlanId(
        pickPaymentEnvValue({
          live: [
            process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID,
            process.env.MERCADOPAGO_PLAN_FOCUS_ID,
          ],
          testing: [
            process.env.MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA,
            process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA,
            process.env.MERCADOPAGO_FOCUS_ID_TESTING,
            process.env.MERCADOPAGO_PLAN_FOCUS_ID_TESTING,
            process.env.MERCADOPAGO_FOCUS_ID_TESTING_ACCOUNT,
          ],
        }),
      ),
      rawPlanId: pickPaymentEnvValue({
        live: [
          process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID,
          process.env.MERCADOPAGO_PLAN_FOCUS_ID,
        ],
        testing: [
          process.env.MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA,
          process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA,
          process.env.MERCADOPAGO_FOCUS_ID_TESTING,
          process.env.MERCADOPAGO_PLAN_FOCUS_ID_TESTING,
          process.env.MERCADOPAGO_FOCUS_ID_TESTING_ACCOUNT,
        ],
      }),
    };
  }

  return {
    explicitUrl: pickPaymentEnvValue({
      live: [
        process.env.NEXT_PUBLIC_MERCADOPAGO_MAX_URL,
        process.env.MERCADOPAGO_MAX_URL,
      ],
      testing: [process.env.MERCADOPAGO_MAX_URL_TESTING],
    }),
    planId: normalizeMercadoPagoPlanId(
      pickPaymentEnvValue({
        live: [
          process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID,
          process.env.MERCADOPAGO_PLAN_MAX_ID,
        ],
        testing: [
          process.env.MERCADOPAGO_PLAN_MAX_ID_PRUEBA,
          process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID_PRUEBA,
          process.env.MERCADOPAGO_MAX_ID_TESTING,
          process.env.MERCADOPAGO_PLAN_MAX_ID_TESTING,
          process.env.MERCADOPAGO_MAX_ID_TESTING_ACCOUNT,
        ],
      }),
    ),
    rawPlanId: pickPaymentEnvValue({
      live: [
        process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID,
        process.env.MERCADOPAGO_PLAN_MAX_ID,
      ],
      testing: [
        process.env.MERCADOPAGO_PLAN_MAX_ID_PRUEBA,
        process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID_PRUEBA,
        process.env.MERCADOPAGO_MAX_ID_TESTING,
        process.env.MERCADOPAGO_PLAN_MAX_ID_TESTING,
        process.env.MERCADOPAGO_MAX_ID_TESTING_ACCOUNT,
      ],
    }),
  };
}

export async function POST(request: NextRequest) {
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

  const userEmail =
    typeof body.userEmail === "string" ? body.userEmail.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "MercadoPago checkout requires a signed-in Leyendo account so the subscription can be linked without depending on buyer email.",
      },
      { status: 400 },
    );
  }

  const requestOrigin = new URL(request.url).origin;
  const mercadoPagoAccessToken = getMercadoPagoAccessToken();
  const notificationUrl = buildMercadoPagoNotificationUrl();
  const hostedCheckoutOptions = {
    backUrl: buildAccountReturnUrl({
      origin: requestOrigin,
      planTier,
      paymentStatus: "success",
      provider: "mercadopago",
    }),
    externalReference: userId,
    payerEmail: userEmail,
    reason: `Leyendo ${planTier === "max" ? "Max" : "Focus"}`,
  };

  const { explicitUrl, planId, rawPlanId } = getMercadoPagoEnvAliases(planTier);

  if (planId && mercadoPagoAccessToken) {
    if (!notificationUrl) {
      return NextResponse.json(
        {
          error:
            "MercadoPago webhook delivery requires NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL so Leyendo can set a deterministic notification_url.",
        },
        { status: 500 },
      );
    }

    const response = await fetch(`${MERCADOPAGO_API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        back_url: hostedCheckoutOptions.backUrl,
        external_reference: userId,
        ...(userEmail ? { payer_email: userEmail } : {}),
        notification_url: notificationUrl,
        preapproval_plan_id: planId,
        reason: hostedCheckoutOptions.reason,
        status: "pending",
      }),
      cache: "no-store",
    });

    const data = (await response
      .json()
      .catch(() => null)) as MercadoPagoCheckoutPayload | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: resolveMercadoPagoCheckoutError(data),
        },
        { status: response.status },
      );
    }

    const checkoutUrl = data?.init_point ?? data?.sandbox_init_point;
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "MercadoPago returned no checkout URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      checkoutUrl,
      providerSubscriptionId:
        typeof data?.id === "string" ? data.id : undefined,
    });
  }

  if (explicitUrl) {
    return NextResponse.json({
      checkoutUrl: withMercadoPagoCheckoutParams(
        explicitUrl,
        hostedCheckoutOptions,
      ),
    });
  }

  if (planId) {
    return NextResponse.json({
      checkoutUrl: buildMercadoPagoSubscriptionUrl(
        planId,
        undefined,
        hostedCheckoutOptions,
      ),
    });
  }

  if (rawPlanId) {
    return NextResponse.json(
      {
        error: `MercadoPago ${planTier} is configured with an invalid plan id (${rawPlanId}). Use the full 32-character preapproval_plan_id, not a short dashboard number.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error:
        planTier === "focus"
          ? "No MercadoPago Focus plan is configured. Supported env names: NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID, MERCADOPAGO_PLAN_FOCUS_ID, MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA, MERCADOPAGO_FOCUS_ID_TESTING, MERCADOPAGO_FOCUS_ID_TESTING_ACCOUNT."
          : "No MercadoPago Max plan is configured. Supported env names: NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID, MERCADOPAGO_PLAN_MAX_ID, MERCADOPAGO_PLAN_MAX_ID_PRUEBA, MERCADOPAGO_MAX_ID_TESTING, MERCADOPAGO_MAX_ID_TESTING_ACCOUNT.",
    },
    { status: 500 },
  );
}

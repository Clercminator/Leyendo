import { NextRequest, NextResponse } from "next/server";

import {
  buildMercadoPagoSubscriptionUrl,
  normalizePaidPlanTier,
  pickPaymentEnvValue,
} from "@/lib/payment-config";

const MERCADOPAGO_PLAN_ID_PATTERN = /^[a-f0-9]{32}$/i;

interface CheckoutRequestBody {
  plan?: string;
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

  const { explicitUrl, planId, rawPlanId } = getMercadoPagoEnvAliases(planTier);

  if (explicitUrl) {
    return NextResponse.json({ checkoutUrl: explicitUrl });
  }

  if (planId) {
    return NextResponse.json({
      checkoutUrl: buildMercadoPagoSubscriptionUrl(planId),
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

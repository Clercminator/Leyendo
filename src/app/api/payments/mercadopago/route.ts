import { NextRequest, NextResponse } from "next/server";

import {
  buildAccountReturnUrl,
  buildMercadoPagoSubscriptionUrl,
  normalizePaidPlanTier,
  pickPaymentEnvValue,
  withMercadoPagoCheckoutParams,
} from "@/lib/payment-config";
import { getPaidPlanCheckoutRestriction } from "@/lib/plans";
import {
  createBillingCheckoutIntent,
  markBillingCheckoutIntentOpened,
} from "@/lib/supabase/billing-checkout-intents";
import { getAuthenticatedCheckoutContext } from "@/lib/supabase/server-auth";

const MERCADOPAGO_PLAN_ID_PATTERN = /^[a-f0-9]{32}$/i;

interface CheckoutRequestBody {
  locale?: string;
  plan?: string;
  userEmail?: string;
  userId?: string;
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

function getBearerAccessToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization")?.trim();
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (!/^bearer$/i.test(scheme ?? "") || !token?.trim()) {
    return undefined;
  }

  return token.trim();
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

  const accessToken = getBearerAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "MercadoPago checkout requires the current Leyendo session. Sign in again and retry.",
      },
      { status: 401 },
    );
  }

  let checkoutContext;

  try {
    checkoutContext = await getAuthenticatedCheckoutContext(accessToken);
  } catch {
    return NextResponse.json(
      {
        error: "MercadoPago could not validate the current Leyendo session.",
      },
      { status: 500 },
    );
  }

  if (!checkoutContext) {
    return NextResponse.json(
      {
        error:
          "MercadoPago checkout requires the current Leyendo session. Sign in again and retry.",
      },
      { status: 401 },
    );
  }

  if (checkoutContext.user.id !== userId) {
    return NextResponse.json(
      {
        error:
          "This checkout request does not match the signed-in Leyendo account.",
      },
      { status: 409 },
    );
  }

  const checkoutRestriction = getPaidPlanCheckoutRestriction(
    checkoutContext.profile,
    planTier,
  );

  if (checkoutRestriction) {
    return NextResponse.json(
      {
        error: checkoutRestriction,
      },
      { status: 409 },
    );
  }

  const { explicitUrl, planId, rawPlanId } = getMercadoPagoEnvAliases(planTier);

  if (rawPlanId && !explicitUrl && !planId) {
    return NextResponse.json(
      {
        error: `MercadoPago ${planTier} is configured with an invalid plan id (${rawPlanId}). Use the full 32-character preapproval_plan_id, not a short dashboard number.`,
      },
      { status: 500 },
    );
  }

  if (!explicitUrl && !planId) {
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

  const requestOrigin = new URL(request.url).origin;
  let checkoutIntent;

  try {
    checkoutIntent = await createBillingCheckoutIntent({
      accessToken,
      metadata: {
        source: "next_checkout_route",
      },
      provider: "mercadopago",
      tier: planTier,
      userEmail: checkoutContext.user.email ?? userEmail,
      userId: checkoutContext.user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Leyendo could not prepare payment recovery. Try again.",
      },
      { status: 500 },
    );
  }

  const returnUrl = buildAccountReturnUrl({
    checkoutIntentId: checkoutIntent.id,
    origin: requestOrigin,
    planTier,
    paymentStatus: "success",
    provider: "mercadopago",
  });
  const hostedCheckoutOptions = {
    backUrl: returnUrl,
    externalReference: checkoutContext.user.id,
    payerEmail: checkoutContext.user.email ?? userEmail,
    reason: `Leyendo ${planTier === "max" ? "Max" : "Focus"}`,
  };

  const checkoutUrl = explicitUrl
    ? withMercadoPagoCheckoutParams(explicitUrl, hostedCheckoutOptions)
    : buildMercadoPagoSubscriptionUrl(
        planId as string,
        undefined,
        hostedCheckoutOptions,
      );

  try {
    await markBillingCheckoutIntentOpened({
      accessToken,
      checkoutUrl,
      id: checkoutIntent.id,
      metadata: {
        planId: planId ?? null,
        source: "next_checkout_route",
      },
      returnUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Leyendo could not save the checkout recovery link.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    checkoutIntentId: checkoutIntent.id,
    checkoutUrl,
    supportReference: checkoutIntent.supportReference,
  });
}

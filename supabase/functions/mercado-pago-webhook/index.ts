import { createClient } from "jsr:@supabase/supabase-js@2";

import {
  buildMercadoPagoSignatureManifest,
  resolveMercadoPagoWebhookResourceId,
} from "./shared.ts";

const MERCADOPAGO_ACCESS_TOKEN =
  Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")?.trim() ?? "";
function pickEnv(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

const MERCADOPAGO_ACCESS_TOKEN_PRUEBA = pickEnv(
  "MERCADOPAGO_ACCESS_TOKEN_PRUEBA",
  "MERCADOPAGO_ACCESS_TOKEN_TESTING",
  "MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT",
);
const MERCADOPAGO_WEBHOOK_SECRET =
  Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET")?.trim() ?? "";
const MERCADOPAGO_WEBHOOK_SECRET_PRUEBA = pickEnv(
  "MERCADOPAGO_WEBHOOK_SECRET_PRUEBA",
  "MERCADOPAGO_WEBHOOK_SECRET_TESTING_ACCOUNT",
  "MERCADOPAGO_WEBHOOK_SECRET_TESTING_ACCOUT",
);
const MERCADOPAGO_PLAN_FOCUS_ID =
  Deno.env.get("MERCADOPAGO_PLAN_FOCUS_ID")?.trim() ?? "";
const MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA = pickEnv(
  "MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA",
  "MERCADOPAGO_FOCUS_ID_TESTING",
  "MERCADOPAGO_PLAN_FOCUS_ID_TESTING",
  "MERCADOPAGO_FOCUS_ID_TESTING_ACCOUNT",
);
const MERCADOPAGO_PLAN_MAX_ID =
  Deno.env.get("MERCADOPAGO_PLAN_MAX_ID")?.trim() ?? "";
const MERCADOPAGO_PLAN_MAX_ID_PRUEBA = pickEnv(
  "MERCADOPAGO_PLAN_MAX_ID_PRUEBA",
  "MERCADOPAGO_MAX_ID_TESTING",
  "MERCADOPAGO_PLAN_MAX_ID_TESTING",
  "MERCADOPAGO_MAX_ID_TESTING_ACCOUNT",
);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type PaidTierId = "focus" | "max";
type MercadoPagoEnvironment = "live" | "test";
type SubscriptionStatus =
  | "inactive"
  | "pending"
  | "trialing"
  | "active"
  | "grace_period"
  | "past_due"
  | "canceled"
  | "expired";

const SUCCESSFUL_AUTHORIZED_PAYMENT_STATUSES = new Set([
  "authorized",
  "processed",
  "approved",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info, x-signature, x-request-id, x-supabase-api-version",
};

interface WebhookBody {
  action?: string;
  data?: { id?: string | number };
  paymentId?: string | number;
  plan?: string;
  subscriptionId?: string | number;
  topic?: string;
  type?: string;
}

interface AuthenticatedReturnUser {
  email: string | null;
  id: string;
}

interface MercadoPagoCredentials {
  accessToken: string;
  environment: MercadoPagoEnvironment;
  focusPlanId: string;
  maxPlanId: string;
  webhookSecret: string;
}

const mercadoPagoCredentials = [
  {
    accessToken: MERCADOPAGO_ACCESS_TOKEN,
    environment: "live",
    focusPlanId: MERCADOPAGO_PLAN_FOCUS_ID,
    maxPlanId: MERCADOPAGO_PLAN_MAX_ID,
    webhookSecret: MERCADOPAGO_WEBHOOK_SECRET,
  } satisfies MercadoPagoCredentials,
  {
    accessToken: MERCADOPAGO_ACCESS_TOKEN_PRUEBA,
    environment: "test",
    focusPlanId: MERCADOPAGO_PLAN_FOCUS_ID_PRUEBA,
    maxPlanId: MERCADOPAGO_PLAN_MAX_ID_PRUEBA,
    webhookSecret: MERCADOPAGO_WEBHOOK_SECRET_PRUEBA,
  } satisfies MercadoPagoCredentials,
].filter((credentials): credentials is MercadoPagoCredentials =>
  Boolean(credentials.accessToken),
);

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function okResponse() {
  return jsonResponse({ ok: true });
}

function compactLogContext(context: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) =>
      value !== undefined && value !== null && value !== ""
    ),
  );
}

function logMercadoPagoEvent(
  level: "error" | "info" | "warn",
  event: string,
  context: Record<string, unknown> = {},
  error?: unknown,
) {
  const payload = compactLogContext({
    event,
    provider: "mercadopago",
    ...context,
  });

  if (level === "error") {
    if (error !== undefined) {
      console.error("[mercado-pago-webhook]", payload, error);
      return;
    }

    console.error("[mercado-pago-webhook]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[mercado-pago-webhook]", payload);
    return;
  }

  console.info("[mercado-pago-webhook]", payload);
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asIsoString(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = asString(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function titleCase(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferTierFromAmount(amount: number | null): PaidTierId {
  return (amount ?? 0) >= 10 ? "max" : "focus";
}

function inferTierFromText(...values: unknown[]): PaidTierId | null {
  const normalized = values
    .map((value) => asString(value)?.toLowerCase())
    .filter((value): value is string => Boolean(value))
    .join(" ");

  if (normalized.includes("max")) {
    return "max";
  }
  if (
    normalized.includes("focus") ||
    normalized.includes("standard") ||
    normalized.includes("builder")
  ) {
    return "focus";
  }

  return null;
}

function inferTierFromPlanId(planId: string | null): PaidTierId | null {
  if (!planId) {
    return null;
  }

  for (const credentials of mercadoPagoCredentials) {
    if (credentials.maxPlanId && planId === credentials.maxPlanId) {
      return "max";
    }
    if (credentials.focusPlanId && planId === credentials.focusPlanId) {
      return "focus";
    }
  }

  return null;
}

function normalizePaidTierId(value: unknown): PaidTierId | null {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "focus" || normalized === "max" ? normalized : null;
}

function normalizeMercadoPagoSubscriptionStatus(params: {
  endsAt: string | null;
  nextPaymentDate: string | null;
  status: string | null;
}): SubscriptionStatus {
  const normalized =
    params.status?.toLowerCase().replace("cancelled", "canceled") ?? "pending";
  const boundary = params.endsAt ?? params.nextPaymentDate;
  const boundaryTime = boundary ? Date.parse(boundary) : Number.NaN;
  const hasFutureBoundary =
    Number.isFinite(boundaryTime) && boundaryTime > Date.now();

  if (normalized === "authorized" || normalized === "active") {
    return "active";
  }
  if (normalized === "pending") {
    return "pending";
  }
  if (normalized === "paused") {
    return hasFutureBoundary ? "grace_period" : "expired";
  }
  if (normalized === "canceled") {
    return hasFutureBoundary ? "grace_period" : "canceled";
  }
  if (normalized === "rejected") {
    return "past_due";
  }
  if (normalized === "finished" || normalized === "expired") {
    return hasFutureBoundary ? "grace_period" : "expired";
  }

  return "pending";
}

async function findUserIdByEmail(
  userEmail: string | null,
): Promise<string | null> {
  if (!userEmail) {
    return null;
  }

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      logMercadoPagoEvent(
        "error",
        "user_lookup_failed",
        { page, strategy: "email" },
        error,
      );
      return null;
    }

    const users = data.users ?? [];
    const match = users.find(
      (user: { email?: string | null; id: string }) =>
        user.email?.toLowerCase() === userEmail.toLowerCase(),
    );

    if (match) {
      return match.id;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function findUserIdBySubscriptionId(
  subscriptionId: string | null,
): Promise<string | null> {
  if (!subscriptionId) {
    return null;
  }

  const { data } = await supabase
    .from("billing_subscriptions")
    .select("user_id")
    .eq("provider", "mercadopago")
    .eq("provider_subscription_id", subscriptionId)
    .limit(1)
    .maybeSingle();

  return asString(data?.user_id);
}

async function resolveTargetUserId(options: {
  explicitUserId?: unknown;
  fallbackUserId?: unknown;
  subscriptionId?: string | null;
  userEmail?: string | null;
}): Promise<string | null> {
  const explicitUserId = asString(options.explicitUserId);
  if (explicitUserId) {
    return explicitUserId;
  }

  const bySubscription = await findUserIdBySubscriptionId(
    options.subscriptionId ?? null,
  );
  if (bySubscription) {
    return bySubscription;
  }

  const fallbackUserId = asString(options.fallbackUserId);
  if (fallbackUserId) {
    return fallbackUserId;
  }

  return findUserIdByEmail(options.userEmail ?? null);
}

async function syncProfileSubscription(userId: string) {
  const { error } = await supabase.rpc(
    "sync_profile_subscription_from_billing",
    {
      target_user_id: userId,
    },
  );

  if (error) {
    logMercadoPagoEvent(
      "error",
      "profile_sync_failed",
      { userId },
      error,
    );
    throw new Error("Failed to sync profile subscription state");
  }
}

async function getExistingSubscriptionTier(
  subscriptionId: string | null,
): Promise<PaidTierId | null> {
  if (!subscriptionId) {
    return null;
  }

  const { data } = await supabase
    .from("billing_subscriptions")
    .select("tier")
    .eq("provider", "mercadopago")
    .eq("provider_subscription_id", subscriptionId)
    .limit(1)
    .maybeSingle();

  return data?.tier === "focus" || data?.tier === "max" ? data.tier : null;
}

async function verifySignature(
  req: Request,
  webhookSecret: string,
): Promise<boolean> {
  if (!webhookSecret) {
    return false;
  }

  const signatureHeader = req.headers.get("x-signature");
  if (!signatureHeader) {
    return false;
  }

  const parts = new Map<string, string>();
  for (const chunk of signatureHeader.split(",")) {
    const [key, value] = chunk.split("=", 2);
    if (key && value) {
      parts.set(key.trim(), value.trim());
    }
  }

  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !v1) {
    return false;
  }

  const manifest = buildMercadoPagoSignatureManifest({
    requestId: req.headers.get("x-request-id"),
    requestUrl: req.url,
    timestamp: ts,
  });

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(manifest),
  );
  const hex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hex === v1;
}

async function resolveMercadoPagoCredentials(
  req: Request,
): Promise<MercadoPagoCredentials[] | null> {
  const credentialsWithSecret = mercadoPagoCredentials.filter((credentials) =>
    Boolean(credentials.webhookSecret),
  );

  if (!credentialsWithSecret.length) {
    logMercadoPagoEvent("warn", "signature_validation_disabled", {
      configuredEnvironments: mercadoPagoCredentials
        .map((credentials) => credentials.environment)
        .join(","),
    });
    return mercadoPagoCredentials;
  }

  const matchingCredentials: MercadoPagoCredentials[] = [];
  for (const credentials of credentialsWithSecret) {
    if (await verifySignature(req, credentials.webhookSecret)) {
      matchingCredentials.push(credentials);
    }
  }

  if (!matchingCredentials.length) {
    logMercadoPagoEvent("warn", "signature_validation_failed", {
      requestId: req.headers.get("x-request-id"),
    });
  }

  return matchingCredentials.length ? matchingCredentials : null;
}

async function resolveAuthenticatedReturnUser(
  req: Request,
): Promise<AuthenticatedReturnUser | null> {
  const authorizationHeader = req.headers.get("authorization");
  if (!authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const accessToken = authorizationHeader.slice(7).trim();
  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    logMercadoPagoEvent(
      "error",
      "return_user_resolution_failed",
      {},
      error,
    );
    return null;
  }

  return {
    email: data.user.email ?? null,
    id: data.user.id,
  };
}

function getPlanIdForCredentials(
  credentials: MercadoPagoCredentials,
  plan: PaidTierId,
) {
  return plan === "max" ? credentials.maxPlanId : credentials.focusPlanId;
}

function inferTierFromSubscriptionRecord(
  subscription: Record<string, unknown>,
): PaidTierId {
  const planId = pickString(
    subscription.preapproval_plan_id,
    subscription.preapproval_plan &&
      typeof subscription.preapproval_plan === "object"
      ? (subscription.preapproval_plan as Record<string, unknown>).id
      : null,
  );
  const reason = pickString(
    subscription.reason,
    subscription.description,
    subscription.summarized,
  );
  const autoRecurring =
    typeof subscription.auto_recurring === "object" &&
    subscription.auto_recurring !== null
      ? (subscription.auto_recurring as Record<string, unknown>)
      : null;
  const amount = asNumber(autoRecurring?.transaction_amount);

  return (
    inferTierFromPlanId(planId) ??
    inferTierFromText(reason, planId) ??
    inferTierFromAmount(amount)
  );
}

async function searchLatestSubscriptionPreapproval(params: {
  credentialsCandidates: MercadoPagoCredentials[];
  plan: PaidTierId | null;
  userEmail?: string | null;
  userId?: string | null;
}): Promise<{
  credentials: MercadoPagoCredentials;
  subscription: Record<string, unknown>;
} | null> {
  for (const credentials of params.credentialsCandidates) {
    const exactPlanId = params.plan
      ? getPlanIdForCredentials(credentials, params.plan)
      : null;
    const searchPlanIds = exactPlanId ? [exactPlanId, null] : [null];

    for (const searchPlanId of searchPlanIds) {
      const searchParams = new URLSearchParams({
        criteria: "desc",
        limit: params.userId ? "50" : "10",
        offset: "0",
        sort: "date_created",
      });

      if (!params.userId && params.userEmail) {
        searchParams.set("payer_email", params.userEmail);
      }

      if (searchPlanId) {
        searchParams.set("preapproval_plan_id", searchPlanId);
      }

      const response = await fetch(
        `https://api.mercadopago.com/preapproval/search?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        logMercadoPagoEvent(
          "error",
          "subscription_search_failed",
          {
            environment: credentials.environment,
            plan: params.plan,
            searchPlanId,
            status: response.status,
            userEmail: params.userEmail,
            userId: params.userId,
          },
          await response.text(),
        );
        break;
      }

      const payload = (await response.json()) as {
        results?: Array<Record<string, unknown>>;
      };
      const results = Array.isArray(payload.results) ? payload.results : [];
      const matchingSubscription = results.find((subscription) => {
        const externalReference = pickString(subscription.external_reference);
        if (params.userId && externalReference === params.userId) {
          return true;
        }

        if (!params.userEmail) {
          return false;
        }

        const subscriptionEmail = pickString(subscription.payer_email);
        if (
          subscriptionEmail &&
          subscriptionEmail.toLowerCase() !== params.userEmail.toLowerCase()
        ) {
          return false;
        }

        if (searchPlanId) {
          const subscriptionPlanId = pickString(
            subscription.preapproval_plan_id,
            subscription.preapproval_plan &&
              typeof subscription.preapproval_plan === "object"
              ? (subscription.preapproval_plan as Record<string, unknown>).id
              : null,
          );

          return subscriptionPlanId === searchPlanId;
        }

        if (params.plan) {
          return inferTierFromSubscriptionRecord(subscription) === params.plan;
        }

        return true;
      });

      if (matchingSubscription) {
        return { credentials, subscription: matchingSubscription };
      }
    }
  }

  return null;
}

async function getLinkedMercadoPagoSubscriptionForUser(params: {
  plan?: PaidTierId | null;
  userId: string;
}) {
  let query = supabase
    .from("billing_subscriptions")
    .select("provider_subscription_id,tier,status,updated_at")
    .eq("provider", "mercadopago")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (params.plan) {
    query = query.eq("tier", params.plan);
  }

  const { data } = await query.maybeSingle();
  return data ?? null;
}

async function fetchMercadoPagoJson(
  path: string,
  credentialsCandidates: MercadoPagoCredentials[],
): Promise<
  | {
      credentials: MercadoPagoCredentials;
      data: Record<string, unknown>;
      ok: true;
    }
  | { body: string; ok: false; status: number }
> {
  let lastFailure: { body: string; ok: false; status: number } = {
    body: "MercadoPago resource not found",
    ok: false,
    status: 404,
  };

  for (const credentials of credentialsCandidates) {
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      return {
        credentials,
        data: (await response.json()) as Record<string, unknown>,
        ok: true,
      };
    }

    const failure = {
      body: await response.text(),
      ok: false as const,
      status: response.status,
    };

    if (
      response.status !== 401 &&
      response.status !== 403 &&
      response.status !== 404
    ) {
      return failure;
    }

    lastFailure = failure;
  }

  return lastFailure;
}

async function fetchSubscriptionPreapproval(
  subscriptionId: string,
  credentialsCandidates: MercadoPagoCredentials[],
): Promise<{
  credentials: MercadoPagoCredentials;
  subscription: Record<string, unknown>;
} | null> {
  const result = await fetchMercadoPagoJson(
    `/preapproval/${subscriptionId}`,
    credentialsCandidates,
  );
  if (result.ok) {
    return { credentials: result.credentials, subscription: result.data };
  }
  if (result.status !== 404) {
    logMercadoPagoEvent("error", "subscription_fetch_failed", {
      status: result.status,
      subscriptionId,
    }, result.body);
  }
  return null;
}

async function fetchAuthorizedPayment(
  authorizedPaymentId: string,
  credentialsCandidates: MercadoPagoCredentials[],
): Promise<{
  authorizedPayment: Record<string, unknown>;
  credentials: MercadoPagoCredentials;
} | null> {
  const result = await fetchMercadoPagoJson(
    `/authorized_payments/${authorizedPaymentId}`,
    credentialsCandidates,
  );
  if (result.ok) {
    return {
      authorizedPayment: result.data,
      credentials: result.credentials,
    };
  }
  if (result.status !== 404) {
    logMercadoPagoEvent("error", "authorized_payment_fetch_failed", {
      authorizedPaymentId,
      status: result.status,
    }, result.body);
  }
  return null;
}

async function syncMercadoPagoSubscription(params: {
  subscription: Record<string, unknown>;
  userId: string | null;
}): Promise<PaidTierId> {
  const subscriptionId = asString(params.subscription.id);
  if (!subscriptionId) {
    throw new Error("MercadoPago subscription payload is missing id");
  }

  const planId = pickString(
    params.subscription.preapproval_plan_id,
    params.subscription.preapproval_plan &&
      typeof params.subscription.preapproval_plan === "object"
      ? (params.subscription.preapproval_plan as Record<string, unknown>).id
      : null,
  );
  const reason = pickString(
    params.subscription.reason,
    params.subscription.description,
    params.subscription.summarized,
  );
  const autoRecurring =
    typeof params.subscription.auto_recurring === "object" &&
    params.subscription.auto_recurring !== null
      ? (params.subscription.auto_recurring as Record<string, unknown>)
      : null;
  const amount = asNumber(autoRecurring?.transaction_amount);
  const nextPaymentDate = asIsoString(params.subscription.next_payment_date);
  const endsAt = asIsoString(params.subscription.date_of_end);
  const normalizedStatus = normalizeMercadoPagoSubscriptionStatus({
    endsAt,
    nextPaymentDate,
    status: pickString(
      params.subscription.status,
      params.subscription.status_detail,
    ),
  });
  const tier =
    (await getExistingSubscriptionTier(subscriptionId)) ??
    inferTierFromPlanId(planId) ??
    inferTierFromText(reason, planId) ??
    inferTierFromAmount(amount);

  const { error } = await supabase.from("billing_subscriptions").upsert(
    {
      user_id: params.userId,
      provider: "mercadopago",
      provider_subscription_id: subscriptionId,
      provider_customer_id: pickString(
        params.subscription.payer_id,
        params.subscription.collector_id,
      ),
      tier,
      status: normalizedStatus,
      status_formatted: titleCase(normalizedStatus),
      billing_interval:
        pickString(autoRecurring?.frequency_type, "month") ?? "month",
      product_name: reason ?? `Leyendo ${tier}`,
      variant_name: reason,
      user_email: pickString(params.subscription.payer_email),
      order_id: pickString(params.subscription.order_id),
      variant_id: planId,
      subscription_started_at: asIsoString(params.subscription.date_created),
      renews_at: nextPaymentDate,
      ends_at: endsAt,
      grace_until:
        normalizedStatus === "grace_period" || normalizedStatus === "past_due"
          ? (endsAt ?? nextPaymentDate)
          : null,
      trial_ends_at: asIsoString(params.subscription.first_invoice_offset_date),
      paused:
        normalizedStatus === "grace_period" &&
        pickString(params.subscription.status) === "paused",
      cancel_requested:
        normalizedStatus === "grace_period" || normalizedStatus === "canceled",
      metadata: params.subscription,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider,provider_subscription_id" },
  );

  if (error) {
    logMercadoPagoEvent(
      "error",
      "subscription_upsert_failed",
      { subscriptionId, userId: params.userId },
      error,
    );
    throw new Error("Failed to sync MercadoPago subscription state");
  }

  logMercadoPagoEvent("info", "subscription_synced", {
    status: normalizedStatus,
    subscriptionId,
    tier,
    userId: params.userId,
  });

  if (params.userId) {
    await syncProfileSubscription(params.userId);
  }

  return tier;
}

async function handleSubscriptionPreapprovalNotification(
  subscriptionId: string,
  credentialsCandidates: MercadoPagoCredentials[],
  fallbackUserId?: string | null,
): Promise<Response> {
  const subscriptionResult = await fetchSubscriptionPreapproval(
    subscriptionId,
    credentialsCandidates,
  );
  if (!subscriptionResult) {
    return okResponse();
  }

  const subscription = subscriptionResult.subscription;

  const targetUserId = await resolveTargetUserId({
    explicitUserId: subscription.external_reference,
    fallbackUserId,
    subscriptionId,
    userEmail: pickString(subscription.payer_email),
  });

  if (!targetUserId) {
    logMercadoPagoEvent("warn", "subscription_user_unresolved", {
      fallbackUserId,
      subscriptionId,
    });
  }

  await syncMercadoPagoSubscription({
    subscription,
    userId: targetUserId,
  });

  return okResponse();
}

async function handleSubscriptionAuthorizedPaymentNotification(
  authorizedPaymentId: string,
  action: string | null,
  credentialsCandidates: MercadoPagoCredentials[],
  fallbackUserId?: string | null,
): Promise<Response> {
  const authorizedPaymentResult = await fetchAuthorizedPayment(
    authorizedPaymentId,
    credentialsCandidates,
  );
  if (!authorizedPaymentResult) {
    return okResponse();
  }

  const { authorizedPayment, credentials } = authorizedPaymentResult;

  const normalizedStatus = (
    pickString(authorizedPayment.status, authorizedPayment.status_detail) ?? ""
  ).toLowerCase();
  if (!SUCCESSFUL_AUTHORIZED_PAYMENT_STATUSES.has(normalizedStatus)) {
    logMercadoPagoEvent("info", "authorized_payment_skipped", {
      authorizedPaymentId,
      status: normalizedStatus,
    });
    return okResponse();
  }

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("provider", "mercadopago")
    .eq("provider_payment_id", authorizedPaymentId)
    .limit(1)
    .maybeSingle();
  if (existing) {
    logMercadoPagoEvent("info", "authorized_payment_duplicate", {
      authorizedPaymentId,
    });
    return okResponse();
  }

  const subscriptionId = pickString(
    authorizedPayment.preapproval_id,
    authorizedPayment.subscription_id,
  );
  const subscriptionResult = subscriptionId
    ? await fetchSubscriptionPreapproval(subscriptionId, [credentials])
    : null;
  const subscription = subscriptionResult?.subscription ?? null;
  const userEmail = pickString(
    authorizedPayment.payer_email,
    subscription?.payer_email,
  );
  const targetUserId = await resolveTargetUserId({
    explicitUserId: pickString(
      authorizedPayment.external_reference,
      subscription?.external_reference,
    ),
    fallbackUserId,
    subscriptionId,
    userEmail,
  });

  if (!targetUserId) {
    logMercadoPagoEvent("warn", "authorized_payment_user_unresolved", {
      authorizedPaymentId,
      fallbackUserId,
      subscriptionId,
      userEmail,
    });
  }

  let tier = await getExistingSubscriptionTier(subscriptionId);
  if (subscription) {
    tier = await syncMercadoPagoSubscription({
      subscription,
      userId: targetUserId,
    });
  }

  const amount =
    asNumber(authorizedPayment.transaction_amount) ??
    asNumber(authorizedPayment.amount) ??
    0;

  tier ??=
    inferTierFromText(
      authorizedPayment.reason,
      subscription?.reason,
      subscription?.preapproval_plan_id,
    ) ?? inferTierFromAmount(amount);

  const { error } = await supabase.from("payments").insert({
    user_id: targetUserId,
    amount,
    currency: asString(authorizedPayment.currency_id) ?? "ARS",
    status: normalizedStatus,
    provider: "mercadopago",
    provider_payment_id: authorizedPaymentId,
    tier,
    payment_type: "subscription_invoice",
    billing_interval: "month",
    billing_reason: action ?? "subscription_authorized_payment",
    provider_subscription_id: subscriptionId,
    provider_customer_id: pickString(
      authorizedPayment.payer_id,
      subscription?.payer_id,
    ),
    user_email: userEmail,
    metadata: authorizedPayment,
  });

  if (error) {
    logMercadoPagoEvent(
      "error",
      "authorized_payment_record_failed",
      {
        action,
        authorizedPaymentId,
        subscriptionId,
        tier,
        userId: targetUserId,
      },
      error,
    );
    return jsonResponse({ error: "Failed to record recurring payment" }, 500);
  }

  logMercadoPagoEvent("info", "authorized_payment_recorded", {
    action,
    authorizedPaymentId,
    environment: credentials.environment,
    status: normalizedStatus,
    subscriptionId,
    tier,
    userId: targetUserId,
  });

  if (targetUserId) {
    await syncProfileSubscription(targetUserId);
  }

  return okResponse();
}

async function handleReturnConfirmation(
  req: Request,
  body: WebhookBody,
): Promise<Response> {
  const authenticatedUser = await resolveAuthenticatedReturnUser(req);
  if (!authenticatedUser) {
    logMercadoPagoEvent("warn", "confirm_return_unauthenticated", {
      paymentId: pickString(body.paymentId, body.data?.id),
      plan: normalizePaidTierId(body.plan),
      subscriptionId: pickString(body.subscriptionId),
    });
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const requestedPlan = normalizePaidTierId(body.plan);
  const paymentId = pickString(body.paymentId, body.data?.id);
  const subscriptionId = pickString(body.subscriptionId);

  logMercadoPagoEvent("info", "confirm_return_received", {
    paymentId,
    plan: requestedPlan,
    subscriptionId,
    userId: authenticatedUser.id,
  });

  await syncProfileSubscription(authenticatedUser.id);

  let linkedSubscription = await getLinkedMercadoPagoSubscriptionForUser({
    plan: requestedPlan,
    userId: authenticatedUser.id,
  });

  if (linkedSubscription) {
    logMercadoPagoEvent("info", "confirm_return_already_linked", {
      plan: requestedPlan,
      subscriptionId: linkedSubscription.provider_subscription_id,
      tier: linkedSubscription.tier,
      userId: authenticatedUser.id,
    });
    return jsonResponse({
      confirmed: true,
      tier: linkedSubscription.tier ?? requestedPlan ?? null,
    });
  }

  if (paymentId) {
    await handleSubscriptionAuthorizedPaymentNotification(
      paymentId,
      "confirm_return",
      mercadoPagoCredentials,
      authenticatedUser.id,
    );
  }

  if (subscriptionId) {
    await handleSubscriptionPreapprovalNotification(
      subscriptionId,
      mercadoPagoCredentials,
      authenticatedUser.id,
    );
  }

  if (authenticatedUser.email) {
    const latestSubscription = await searchLatestSubscriptionPreapproval({
      credentialsCandidates: mercadoPagoCredentials,
      plan: requestedPlan,
      userId: authenticatedUser.id,
      userEmail: authenticatedUser.email,
    });

    if (latestSubscription) {
      await syncMercadoPagoSubscription({
        subscription: latestSubscription.subscription,
        userId: authenticatedUser.id,
      });
    }
  }

  linkedSubscription = await getLinkedMercadoPagoSubscriptionForUser({
    plan: requestedPlan,
    userId: authenticatedUser.id,
  });

  logMercadoPagoEvent(
    linkedSubscription ? "info" : "warn",
    "confirm_return_completed",
    {
      confirmed: Boolean(linkedSubscription),
      paymentId,
      plan: requestedPlan,
      subscriptionId: linkedSubscription?.provider_subscription_id ?? subscriptionId,
      tier: linkedSubscription?.tier ?? requestedPlan,
      userId: authenticatedUser.id,
    },
  );

  return jsonResponse({
    confirmed: Boolean(linkedSubscription),
    tier: linkedSubscription?.tier ?? requestedPlan ?? null,
  });
}

async function handleWebhook(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!mercadoPagoCredentials.length) {
    logMercadoPagoEvent("error", "credentials_missing");
    return jsonResponse({ error: "Server config error" }, 500);
  }

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as WebhookBody;

    if (body.action === "confirm_return") {
      return await handleReturnConfirmation(req, body);
    }

    const credentialsCandidates = await resolveMercadoPagoCredentials(req);

    if (!credentialsCandidates?.length) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const url = new URL(req.url);
    const topic = pickString(
      body.type,
      body.topic,
      url.searchParams.get("topic"),
      url.searchParams.get("type"),
    );
    const resourceId = resolveMercadoPagoWebhookResourceId({
      bodyDataId: body.data?.id,
      requestUrl: req.url,
    });
    const action = asString(body.action);

    logMercadoPagoEvent("info", "webhook_received", {
      action,
      matchedEnvironments: credentialsCandidates
        .map((credentials) => credentials.environment)
        .join(","),
      requestId: req.headers.get("x-request-id"),
      resourceId,
      topic,
    });

    if (!topic || !resourceId) {
      logMercadoPagoEvent("info", "webhook_ignored_missing_topic_or_resource", {
        action,
        requestId: req.headers.get("x-request-id"),
        resourceId,
        topic,
      });
      return okResponse();
    }

    if (topic === "subscription_preapproval") {
      return await handleSubscriptionPreapprovalNotification(
        resourceId,
        credentialsCandidates,
      );
    }

    if (topic === "subscription_authorized_payment") {
      return await handleSubscriptionAuthorizedPaymentNotification(
        resourceId,
        action,
        credentialsCandidates,
      );
    }

    logMercadoPagoEvent("info", "webhook_ignored_topic", {
      resourceId,
      topic,
    });

    return okResponse();
  } catch (error) {
    logMercadoPagoEvent("error", "webhook_failed", {}, error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
}

Deno.serve(handleWebhook);

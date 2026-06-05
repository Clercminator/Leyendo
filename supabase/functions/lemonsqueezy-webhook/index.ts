import { createClient } from "jsr:@supabase/supabase-js@2";

const LEMONSQUEEZY_API = "https://api.lemonsqueezy.com/v1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function pickEnv(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

const LEMONSQUEEZY_API_KEY = Deno.env.get("LEMONSQUEEZY_API_KEY")?.trim() ?? "";
const LEMONSQUEEZY_API_KEY_TESTING = pickEnv(
  "LEMONSQUEEZY_API_KEY_TESTING",
  "LEMONSQUEEZY_API_KEY_PRUEBA",
  "LEMONSQUEEZY_TESTING_API_KEY",
  "LEMONSQUEEZY_API_KEY_TESTING_ACCOUNT",
);
const LEMONSQUEEZY_STORE_ID = Deno.env.get("LEMONSQUEEZY_STORE_ID")?.trim() ?? "";
const LEMONSQUEEZY_STORE_ID_TESTING = pickEnv(
  "LEMONSQUEEZY_STORE_ID_TESTING",
  "LEMONSQUEEZY_STORE_ID_PRUEBA",
  "LEMONSQUEEZY_TESTING_STORE_ID",
  "LEMONSQUEEZY_STORE_ID_TESTING_ACCOUNT",
);
const WEBHOOK_SECRETS = [
  Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET")?.trim() ?? "",
  pickEnv(
    "LEMONSQUEEZY_WEBHOOK_SECRET_TESTING",
    "LEMONSQUEEZY_WEBHOOK_SECRET_PRUEBA",
    "LEMONSQUEEZY_WEBHOOK_SECRET_TESTING_ACCOUNT",
  ),
].filter((value): value is string => Boolean(value));

function getConfiguredVariantIds(...values: Array<string | undefined>) {
  return new Set(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
}

const FOCUS_VARIANT_IDS = getConfiguredVariantIds(
  Deno.env.get("LEMONSQUEEZY_VARIANT_FOCUS"),
  Deno.env.get("LEMONSQUEEZY_VARIANT_STANDARD"),
  Deno.env.get("LEMONSQUEEZY_VARIANT_BUILDER"),
  Deno.env.get("LEMONSQUEEZY_VARIANT_FOCUS_TESTING"),
  Deno.env.get("LEMONSQUEEZY_VARIANT_FOCUS_PRUEBA"),
  Deno.env.get("LEMONSQUEEZY_FOCUS_VARIANT_TESTING"),
  Deno.env.get("LEMONSQUEEZY_FOCUS_VARIANT_TESTING_ACCOUNT"),
  Deno.env.get("LEMONSQUEEZY_VARIANT_STANDARD_TESTING"),
  Deno.env.get("LEMONSQUEEZY_VARIANT_BUILDER_TESTING"),
);
const MAX_VARIANT_IDS = getConfiguredVariantIds(
  Deno.env.get("LEMONSQUEEZY_VARIANT_MAX"),
  Deno.env.get("LEMONSQUEEZY_VARIANT_MAX_TESTING"),
  Deno.env.get("LEMONSQUEEZY_VARIANT_MAX_PRUEBA"),
  Deno.env.get("LEMONSQUEEZY_MAX_VARIANT_TESTING"),
  Deno.env.get("LEMONSQUEEZY_MAX_VARIANT_TESTING_ACCOUNT"),
);
const LEMONSQUEEZY_MAX_VARIANT_LIVE =
  Deno.env.get("LEMONSQUEEZY_VARIANT_MAX")?.trim() ?? "";
const LEMONSQUEEZY_MAX_VARIANT_TEST = pickEnv(
  "LEMONSQUEEZY_VARIANT_MAX_TESTING",
  "LEMONSQUEEZY_VARIANT_MAX_PRUEBA",
  "LEMONSQUEEZY_MAX_VARIANT_TESTING",
  "LEMONSQUEEZY_MAX_VARIANT_TESTING_ACCOUNT",
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type PaidTierId = "focus" | "max";
type LemonSqueezyEnvironment = "live" | "test";
type SubscriptionStatus =
  | "inactive"
  | "pending"
  | "trialing"
  | "active"
  | "grace_period"
  | "past_due"
  | "canceled"
  | "expired";

const SUBSCRIPTION_STATE_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
]);

const SUBSCRIPTION_PAYMENT_EVENTS = new Set([
  "subscription_payment_success",
  "subscription_payment_recovered",
]);

interface WebhookBody {
  action?: string;
  checkoutIntentId?: string | number;
  plan?: string;
  subscriptionId?: string | number;
}

interface AuthenticatedReturnUser {
  email: string | null;
  id: string;
}

interface LemonSqueezyCredentials {
  apiKey: string;
  environment: LemonSqueezyEnvironment;
  storeId: string;
}

type CheckoutIntentStatus =
  | "returned"
  | "pending_provider_sync"
  | "linked"
  | "needs_attention";

const lemonSqueezyCredentials = [
  {
    apiKey: LEMONSQUEEZY_API_KEY,
    environment: "live",
    storeId: LEMONSQUEEZY_STORE_ID,
  },
  {
    apiKey: LEMONSQUEEZY_API_KEY_TESTING,
    environment: "test",
    storeId: LEMONSQUEEZY_STORE_ID_TESTING,
  },
].filter((credentials): credentials is LemonSqueezyCredentials =>
  Boolean(credentials.apiKey),
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info, X-Signature, X-Event-Name",
};

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

function logLemonSqueezyEvent(
  level: "error" | "info" | "warn",
  event: string,
  context: Record<string, unknown> = {},
  error?: unknown,
) {
  const payload = compactLogContext({
    event,
    provider: "lemonsqueezy",
    ...context,
  });

  if (level === "error") {
    if (error !== undefined) {
      console.error("[lemonsqueezy-webhook]", payload, error);
      return;
    }

    console.error("[lemonsqueezy-webhook]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[lemonsqueezy-webhook]", payload);
    return;
  }

  console.info("[lemonsqueezy-webhook]", payload);
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

function centsToUnits(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount / 100 : 0;
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

function inferTierFromVariant(
  variantId: unknown,
  variantName: unknown,
): PaidTierId {
  const normalizedVariantId = asString(variantId);
  const normalizedVariantName = asString(variantName)?.toLowerCase() ?? "";

  if (normalizedVariantId && MAX_VARIANT_IDS.has(normalizedVariantId)) {
    return "max";
  }

  if (normalizedVariantId && FOCUS_VARIANT_IDS.has(normalizedVariantId)) {
    return "focus";
  }

  if (normalizedVariantName.includes("max")) {
    return "max";
  }

  return "focus";
}

function inferTierFromAmount(amountUsd: number): PaidTierId {
  return amountUsd >= 10 ? "max" : "focus";
}

function normalizePaidTierId(value: unknown): PaidTierId | null {
  const normalized = asString(value)?.toLowerCase();
  return normalized === "focus" || normalized === "max" ? normalized : null;
}

function normalizeSubscriptionStatus(params: {
  cancelRequested: boolean;
  endsAt: string | null;
  paused: boolean;
  renewsAt: string | null;
  status: string | null;
  trialEndsAt: string | null;
}): SubscriptionStatus {
  const normalized =
    params.status?.toLowerCase().replace("cancelled", "canceled") ?? "pending";
  const boundary = params.endsAt ?? params.renewsAt ?? params.trialEndsAt;
  const boundaryTime = boundary ? Date.parse(boundary) : Number.NaN;
  const hasFutureBoundary =
    Number.isFinite(boundaryTime) && boundaryTime > Date.now();

  if (normalized === "on_trial" || normalized === "trialing") {
    return "trialing";
  }

  if (normalized === "active") {
    return "active";
  }

  if (normalized === "past_due" || normalized === "unpaid") {
    return "past_due";
  }

  if (normalized === "paused" || params.paused) {
    return hasFutureBoundary ? "grace_period" : "expired";
  }

  if (normalized === "canceled" || params.cancelRequested) {
    return hasFutureBoundary ? "grace_period" : "canceled";
  }

  if (normalized === "expired") {
    return hasFutureBoundary ? "grace_period" : "expired";
  }

  if (normalized === "inactive") {
    return "inactive";
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
      logLemonSqueezyEvent(
        "error",
        "user_lookup_failed",
        { page, strategy: "email" },
        error,
      );
      return null;
    }

    const users = data.users ?? [];
    const match = users.find(
      (user) => user.email?.toLowerCase() === userEmail.toLowerCase(),
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
    .eq("provider", "lemonsqueezy")
    .eq("provider_subscription_id", subscriptionId)
    .limit(1)
    .maybeSingle();

  return asString(data?.user_id);
}

async function resolveTargetUserId(options: {
  explicitUserId?: unknown;
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
    logLemonSqueezyEvent(
      "error",
      "profile_sync_failed",
      { userId },
      error,
    );
    throw new Error("Failed to sync profile subscription state");
  }
}

function createSupportReference(intentId: string | null) {
  return intentId
    ? `LY-${intentId.replaceAll("-", "").slice(0, 10).toUpperCase()}`
    : null;
}

async function updateCheckoutIntent(params: {
  checkoutIntentId?: string | null;
  lastError?: string | null;
  plan?: PaidTierId | null;
  returnPayload?: unknown;
  status: CheckoutIntentStatus;
  subscriptionId?: string | null;
  userId?: string | null;
}) {
  const checkoutIntentId = asString(params.checkoutIntentId);
  let targetIntentId = checkoutIntentId;

  if (!targetIntentId && params.userId) {
    let query = supabase
      .from("billing_checkout_intents")
      .select("id")
      .eq("provider", "lemonsqueezy")
      .eq("user_id", params.userId)
      .in("status", [
        "created",
        "checkout_opened",
        "returned",
        "pending_provider_sync",
        "needs_attention",
      ])
      .order("updated_at", { ascending: false })
      .limit(1);

    if (params.plan) {
      query = query.eq("tier", params.plan);
    }

    const { data } = await query.maybeSingle();
    targetIntentId = asString(data?.id);
  }

  if (!targetIntentId) {
    return { checkoutIntentId: null, supportReference: null };
  }

  let updateQuery = supabase
    .from("billing_checkout_intents")
    .update({
      last_error: params.lastError ?? null,
      provider_subscription_id: params.subscriptionId ?? null,
      return_payload: params.returnPayload ?? {},
      status: params.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetIntentId);

  if (params.userId) {
    updateQuery = updateQuery.eq("user_id", params.userId);
  }

  const { data, error } = await updateQuery
    .select("id,support_reference")
    .maybeSingle();

  if (error) {
    logLemonSqueezyEvent(
      "warn",
      "checkout_intent_update_failed",
      {
        checkoutIntentId: targetIntentId,
        status: params.status,
      },
      error,
    );
  }

  const resolvedIntentId = asString(data?.id) ?? targetIntentId;
  return {
    checkoutIntentId: resolvedIntentId,
    supportReference:
      asString(data?.support_reference) ?? createSupportReference(resolvedIntentId),
  };
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
    logLemonSqueezyEvent(
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

async function getLinkedSubscriptionForUser(params: {
  plan?: PaidTierId | null;
  userId: string;
}) {
  let query = supabase
    .from("billing_subscriptions")
    .select("provider_subscription_id,tier,status,updated_at")
    .eq("provider", "lemonsqueezy")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (params.plan) {
    query = query.eq("tier", params.plan);
  }

  const { data } = await query.maybeSingle();
  return data ?? null;
}

function getVariantIdsForTier(plan: PaidTierId | null) {
  if (plan === "focus") {
    return Array.from(FOCUS_VARIANT_IDS);
  }

  if (plan === "max") {
    return Array.from(MAX_VARIANT_IDS);
  }

  return Array.from(new Set([...FOCUS_VARIANT_IDS, ...MAX_VARIANT_IDS]));
}

function maxVariantForEnvironment(environment: LemonSqueezyEnvironment) {
  if (environment === "test") {
    return LEMONSQUEEZY_MAX_VARIANT_TEST || LEMONSQUEEZY_MAX_VARIANT_LIVE;
  }

  return LEMONSQUEEZY_MAX_VARIANT_LIVE || LEMONSQUEEZY_MAX_VARIANT_TEST;
}

async function fetchSubscriptionById(
  subscriptionId: string,
  credentialsCandidates: LemonSqueezyCredentials[],
): Promise<
  | {
      credentials: LemonSqueezyCredentials;
      subscription: Record<string, unknown>;
      subscriptionId: string;
    }
  | null
> {
  for (const credentials of credentialsCandidates) {
    const response = await fetch(
      `${LEMONSQUEEZY_API}/subscriptions/${subscriptionId}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${credentials.apiKey}`,
        },
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        data?: {
          id?: string | number;
          attributes?: Record<string, unknown>;
        };
      };
      const resolvedId = asString(payload.data?.id);
      const attributes = payload.data?.attributes;
      if (resolvedId && attributes) {
        return {
          credentials,
          subscription: attributes,
          subscriptionId: resolvedId,
        };
      }
    }

    if (response.status !== 404) {
      logLemonSqueezyEvent(
        "error",
        "subscription_fetch_failed",
        {
          environment: credentials.environment,
          status: response.status,
          subscriptionId,
        },
        await response.text(),
      );
    }
  }

  return null;
}

async function searchLatestSubscriptionByEmail(params: {
  credentialsCandidates: LemonSqueezyCredentials[];
  plan: PaidTierId | null;
  userEmail: string;
}): Promise<
  | {
      credentials: LemonSqueezyCredentials;
      subscription: Record<string, unknown>;
      subscriptionId: string;
    }
  | null
> {
  const variantIds = getVariantIdsForTier(params.plan);
  const variantSearchValues = variantIds.length ? variantIds : [undefined];

  for (const credentials of params.credentialsCandidates) {
    for (const variantId of variantSearchValues) {
      const searchParams = new URLSearchParams({
        "filter[user_email]": params.userEmail,
        "page[size]": "10",
        sort: "-createdAt",
      });

      if (credentials.storeId) {
        searchParams.set("filter[store_id]", credentials.storeId);
      }

      if (variantId) {
        searchParams.set("filter[variant_id]", variantId);
      }

      const response = await fetch(
        `${LEMONSQUEEZY_API}/subscriptions?${searchParams.toString()}`,
        {
          headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            Authorization: `Bearer ${credentials.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        logLemonSqueezyEvent(
          "error",
          "subscription_search_failed",
          {
            environment: credentials.environment,
            plan: params.plan,
            status: response.status,
            userEmail: params.userEmail,
            variantId,
          },
          await response.text(),
        );
        continue;
      }

      const payload = (await response.json()) as {
        data?: Array<{
          id?: string | number;
          attributes?: Record<string, unknown>;
        }>;
      };

      const result = (payload.data ?? []).find((entry) => {
        const attributes = entry.attributes;
        if (!attributes) {
          return false;
        }

        if (
          params.plan &&
          inferTierFromVariant(attributes.variant_id, attributes.variant_name) !==
            params.plan
        ) {
          return false;
        }

        const userEmail = asString(attributes.user_email);
        if (!userEmail) {
          return false;
        }

        const testMode = Boolean(attributes.test_mode);
        if (credentials.environment === "live" && testMode) {
          return false;
        }

        if (credentials.environment === "test" && !testMode) {
          return false;
        }

        return userEmail.toLowerCase() === params.userEmail.toLowerCase();
      });

      if (result?.attributes) {
        const subscriptionId = asString(result.id);
        if (subscriptionId) {
          return {
            credentials,
            subscription: result.attributes,
            subscriptionId,
          };
        }
      }
    }
  }

  return null;
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
    .eq("provider", "lemonsqueezy")
    .eq("provider_subscription_id", subscriptionId)
    .limit(1)
    .maybeSingle();

  return data?.tier === "focus" || data?.tier === "max" ? data.tier : null;
}

async function upsertSubscriptionRecord(params: {
  attributes: Record<string, unknown>;
  checkoutIntentId?: string | null;
  metadata: unknown;
  subscriptionId: string;
  userEmail: string | null;
  userId: string | null;
}): Promise<PaidTierId> {
  const attrs = params.attributes;
  const tier = inferTierFromVariant(attrs.variant_id, attrs.variant_name);
  const renewsAt = asIsoString(attrs.renews_at);
  const endsAt = asIsoString(attrs.ends_at);
  const trialEndsAt = asIsoString(attrs.trial_ends_at);
  const cancelRequested = Boolean(attrs.cancelled);
  const paused =
    (asString(attrs.status) ?? "") === "paused" || attrs.pause != null;
  const normalizedStatus = normalizeSubscriptionStatus({
    cancelRequested,
    endsAt,
    paused,
    renewsAt,
    status: asString(attrs.status),
    trialEndsAt,
  });

  const { error } = await supabase.from("billing_subscriptions").upsert(
    {
      user_id: params.userId,
      provider: "lemonsqueezy",
      provider_subscription_id: params.subscriptionId,
      provider_customer_id: asString(attrs.customer_id),
      tier,
      status: normalizedStatus,
      status_formatted: titleCase(normalizedStatus),
      billing_interval: "month",
      product_name: asString(attrs.product_name),
      variant_name: asString(attrs.variant_name),
      user_email: params.userEmail,
      order_id: asString(attrs.order_id),
      order_item_id: asString(attrs.order_item_id),
      variant_id: asString(attrs.variant_id),
      subscription_started_at: asIsoString(attrs.created_at),
      renews_at: renewsAt,
      ends_at: endsAt,
      grace_until:
        normalizedStatus === "grace_period" || normalizedStatus === "past_due"
          ? (endsAt ?? renewsAt ?? trialEndsAt)
          : null,
      trial_ends_at: trialEndsAt,
      paused,
      cancel_requested: cancelRequested,
      metadata: params.metadata,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider,provider_subscription_id" },
  );

  if (error) {
    logLemonSqueezyEvent(
      "error",
      "subscription_upsert_failed",
      { subscriptionId: params.subscriptionId, userId: params.userId },
      error,
    );
    throw new Error("Failed to sync LemonSqueezy subscription state");
  }

  logLemonSqueezyEvent("info", "subscription_synced", {
    status: normalizedStatus,
    subscriptionId: params.subscriptionId,
    tier,
    userId: params.userId,
  });

  if (params.userId) {
    await syncProfileSubscription(params.userId);
    await updateCheckoutIntent({
      checkoutIntentId: params.checkoutIntentId,
      plan: tier,
      status: "linked",
      subscriptionId: params.subscriptionId,
      userId: params.userId,
    });
  }

  return tier;
}

async function verifySignature(rawBody: string, signature: string | null) {
  if (!WEBHOOK_SECRETS.length || !signature) {
    return false;
  }

  const encoder = new TextEncoder();
  for (const webhookSecret of WEBHOOK_SECRETS) {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody),
    );
    const hex = Array.from(new Uint8Array(signed))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    if (hex === signature) {
      return true;
    }
  }

  return false;
}

async function handleReturnConfirmation(
  req: Request,
  body: WebhookBody,
): Promise<Response> {
  const authenticatedUser = await resolveAuthenticatedReturnUser(req);
  if (!authenticatedUser) {
    logLemonSqueezyEvent("warn", "confirm_return_unauthenticated", {
      plan: normalizePaidTierId(body.plan),
      subscriptionId: asString(body.subscriptionId),
    });
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const requestedPlan = normalizePaidTierId(body.plan);
  const checkoutIntentId = asString(body.checkoutIntentId);
  const explicitSubscriptionId = asString(body.subscriptionId);

  logLemonSqueezyEvent("info", "confirm_return_received", {
    checkoutIntentId,
    plan: requestedPlan,
    subscriptionId: explicitSubscriptionId,
    userId: authenticatedUser.id,
  });

  let checkoutIntentState = await updateCheckoutIntent({
    checkoutIntentId,
    plan: requestedPlan,
    returnPayload: body,
    status: "returned",
    subscriptionId: explicitSubscriptionId,
    userId: authenticatedUser.id,
  });

  await syncProfileSubscription(authenticatedUser.id);

  let linkedSubscription = await getLinkedSubscriptionForUser({
    plan: requestedPlan,
    userId: authenticatedUser.id,
  });
  if (linkedSubscription) {
    checkoutIntentState = await updateCheckoutIntent({
      checkoutIntentId: checkoutIntentState.checkoutIntentId ?? checkoutIntentId,
      plan: requestedPlan,
      returnPayload: body,
      status: "linked",
      subscriptionId: linkedSubscription.provider_subscription_id,
      userId: authenticatedUser.id,
    });
    logLemonSqueezyEvent("info", "confirm_return_already_linked", {
      plan: requestedPlan,
      subscriptionId: linkedSubscription.provider_subscription_id,
      tier: linkedSubscription.tier,
      userId: authenticatedUser.id,
    });
    return jsonResponse({
      checkoutIntentId: checkoutIntentState.checkoutIntentId,
      confirmed: true,
      providerSubscriptionId: linkedSubscription.provider_subscription_id,
      status: "linked",
      supportReference: checkoutIntentState.supportReference,
      tier: linkedSubscription.tier ?? requestedPlan ?? null,
    });
  }

  let subscriptionResult = explicitSubscriptionId
    ? await fetchSubscriptionById(explicitSubscriptionId, lemonSqueezyCredentials)
    : null;

  if (!subscriptionResult && authenticatedUser.email) {
    subscriptionResult = await searchLatestSubscriptionByEmail({
      credentialsCandidates: lemonSqueezyCredentials,
      plan: requestedPlan,
      userEmail: authenticatedUser.email,
    });
  }

  if (subscriptionResult) {
    const userEmail =
      asString(subscriptionResult.subscription.user_email) ??
      authenticatedUser.email;

    await upsertSubscriptionRecord({
      attributes: subscriptionResult.subscription,
      checkoutIntentId:
        checkoutIntentState.checkoutIntentId ?? checkoutIntentId,
      metadata: {
        action: "confirm_return",
        provider: "lemonsqueezy",
        subscription: subscriptionResult.subscription,
      },
      subscriptionId: subscriptionResult.subscriptionId,
      userEmail,
      userId: authenticatedUser.id,
    });
  } else {
    logLemonSqueezyEvent("warn", "confirm_return_subscription_not_found", {
      plan: requestedPlan,
      requestedSubscriptionId: explicitSubscriptionId,
      userEmail: authenticatedUser.email,
      userId: authenticatedUser.id,
    });
  }

  linkedSubscription = await getLinkedSubscriptionForUser({
    plan: requestedPlan,
    userId: authenticatedUser.id,
  });

  logLemonSqueezyEvent(
    linkedSubscription ? "info" : "warn",
    "confirm_return_completed",
    {
      checkoutIntentId: checkoutIntentState.checkoutIntentId,
      confirmed: Boolean(linkedSubscription),
      plan: requestedPlan,
      subscriptionId:
        linkedSubscription?.provider_subscription_id ?? explicitSubscriptionId,
      tier: linkedSubscription?.tier ?? requestedPlan,
      userId: authenticatedUser.id,
    },
  );

  checkoutIntentState = await updateCheckoutIntent({
    checkoutIntentId: checkoutIntentState.checkoutIntentId ?? checkoutIntentId,
    plan: requestedPlan,
    returnPayload: body,
    status: linkedSubscription ? "linked" : "pending_provider_sync",
    subscriptionId:
      linkedSubscription?.provider_subscription_id ?? explicitSubscriptionId,
    userId: authenticatedUser.id,
  });

  return jsonResponse({
    checkoutIntentId: checkoutIntentState.checkoutIntentId,
    confirmed: Boolean(linkedSubscription),
    providerSubscriptionId:
      linkedSubscription?.provider_subscription_id ?? explicitSubscriptionId ?? null,
    status: linkedSubscription ? "linked" : "pending_provider_sync",
    supportReference: checkoutIntentState.supportReference,
    tier: linkedSubscription?.tier ?? requestedPlan ?? null,
  });
}

async function handleSubscriptionUpgrade(
  req: Request,
  body: WebhookBody,
): Promise<Response> {
  const authenticatedUser = await resolveAuthenticatedReturnUser(req);
  if (!authenticatedUser) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const targetTier = normalizePaidTierId(body.plan);
  if (targetTier !== "max") {
    return jsonResponse(
      {
        error: "Only upgrades to the Max plan are supported.",
        upgraded: false,
      },
      200,
    );
  }

  const linked = await getLinkedSubscriptionForUser({
    plan: "focus",
    userId: authenticatedUser.id,
  });

  if (!linked?.provider_subscription_id) {
    logLemonSqueezyEvent("warn", "upgrade_no_active_focus", {
      userId: authenticatedUser.id,
    });
    return jsonResponse(
      {
        error: "No active Focus subscription was found to upgrade.",
        upgraded: false,
      },
      200,
    );
  }

  const subscriptionId = linked.provider_subscription_id;

  // Load the subscription so we know which environment (live/test) owns it and
  // can target the matching Max variant.
  const fetched = await fetchSubscriptionById(
    subscriptionId,
    lemonSqueezyCredentials,
  );

  if (!fetched) {
    return jsonResponse(
      {
        error: "LemonSqueezy could not load the current subscription.",
        upgraded: false,
      },
      200,
    );
  }

  const maxVariantId = maxVariantForEnvironment(fetched.credentials.environment);
  if (!maxVariantId) {
    return jsonResponse(
      {
        error: "LemonSqueezy Max variant is not configured.",
        upgraded: false,
      },
      200,
    );
  }

  // Swap the subscription to the Max variant in place. LemonSqueezy keeps the
  // same subscription and prorates the difference; `invoice_immediately` bills
  // the prorated amount now so Max access starts right away.
  const updateResponse = await fetch(
    `${LEMONSQUEEZY_API}/subscriptions/${subscriptionId}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${fetched.credentials.apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          id: subscriptionId,
          attributes: {
            variant_id: Number(maxVariantId),
            invoice_immediately: true,
          },
        },
      }),
    },
  );

  if (!updateResponse.ok) {
    const failureBody = await updateResponse.text();
    logLemonSqueezyEvent(
      "error",
      "upgrade_update_failed",
      {
        status: updateResponse.status,
        subscriptionId,
        userId: authenticatedUser.id,
      },
      failureBody,
    );
    return jsonResponse(
      {
        error:
          "LemonSqueezy could not switch this subscription to Max. Please contact support to finish the upgrade.",
        upgraded: false,
      },
      200,
    );
  }

  const payload = (await updateResponse.json()) as {
    data?: { id?: string | number; attributes?: Record<string, unknown> };
  };
  const updatedAttributes = payload.data?.attributes;
  const resolvedId = asString(payload.data?.id) ?? subscriptionId;

  if (!updatedAttributes) {
    return jsonResponse(
      {
        error: "LemonSqueezy returned no subscription details after upgrade.",
        upgraded: false,
      },
      200,
    );
  }

  const tier = await upsertSubscriptionRecord({
    attributes: updatedAttributes,
    metadata: {
      action: "upgrade_subscription",
      provider: "lemonsqueezy",
      subscription: updatedAttributes,
    },
    subscriptionId: resolvedId,
    userEmail: asString(updatedAttributes.user_email) ?? authenticatedUser.email,
    userId: authenticatedUser.id,
  });

  logLemonSqueezyEvent("info", "upgrade_completed", {
    subscriptionId: resolvedId,
    tier,
    userId: authenticatedUser.id,
  });

  return jsonResponse({
    providerSubscriptionId: resolvedId,
    tier,
    upgraded: tier === "max",
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();

  try {
    const body = JSON.parse(rawBody) as WebhookBody & Record<string, unknown>;

    if (body.action === "confirm_return") {
      return await handleReturnConfirmation(req, body);
    }

    if (body.action === "upgrade_subscription") {
      return await handleSubscriptionUpgrade(req, body);
    }

    const signature = req.headers.get("X-Signature");
    const eventName = req.headers.get("X-Event-Name");

    if (!(await verifySignature(rawBody, signature))) {
      logLemonSqueezyEvent("warn", "signature_validation_failed", {
        eventName,
      });
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const attrs = (body?.data?.attributes ?? {}) as Record<string, unknown>;
    const customData = body?.meta?.custom_data ?? {};
    const checkoutIntentId = asString(customData.checkout_intent_id);

    logLemonSqueezyEvent("info", "webhook_received", {
      eventName,
      resourceId: asString(body?.data?.id),
      subscriptionId: asString(attrs.subscription_id),
    });

    if (!eventName || eventName === "order_created") {
      logLemonSqueezyEvent("info", "webhook_ignored_event", {
        eventName,
        resourceId: asString(body?.data?.id),
      });
      return okResponse();
    }

    if (SUBSCRIPTION_STATE_EVENTS.has(eventName)) {
      const subscriptionId = asString(body?.data?.id);
      const userEmail = asString(attrs.user_email);
      const targetUserId = await resolveTargetUserId({
        explicitUserId: customData.user_id,
        subscriptionId,
        userEmail,
      });

      if (!subscriptionId) {
        logLemonSqueezyEvent("warn", "subscription_event_missing_id", {
          eventName,
        });
        return okResponse();
      }

      if (!targetUserId) {
        logLemonSqueezyEvent("warn", "subscription_user_unresolved", {
          eventName,
          subscriptionId,
          userEmail,
        });
      }

      await upsertSubscriptionRecord({
        attributes: attrs,
        checkoutIntentId,
        metadata: body,
        subscriptionId,
        userEmail,
        userId: targetUserId,
      });

      return okResponse();
    }

    if (SUBSCRIPTION_PAYMENT_EVENTS.has(eventName)) {
      const subscriptionId = asString(attrs.subscription_id);

      if ((asString(attrs.status) ?? "") !== "paid") {
        logLemonSqueezyEvent("info", "invoice_skipped", {
          eventName,
          paymentStatus: asString(attrs.status),
          subscriptionId,
        });
        return okResponse();
      }

      const providerPaymentId = asString(body?.data?.id);
      if (!providerPaymentId) {
        logLemonSqueezyEvent("warn", "invoice_missing_payment_id", {
          eventName,
          subscriptionId,
        });
        return okResponse();
      }

      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("provider", "lemonsqueezy")
        .eq("provider_payment_id", providerPaymentId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        logLemonSqueezyEvent("info", "invoice_duplicate", {
          eventName,
          providerPaymentId,
        });
        return okResponse();
      }

      const userEmail = asString(attrs.user_email);
      const targetUserId = await resolveTargetUserId({
        explicitUserId: customData.user_id,
        subscriptionId,
        userEmail,
      });

      if (!targetUserId) {
        logLemonSqueezyEvent("warn", "invoice_user_unresolved", {
          eventName,
          providerPaymentId,
          subscriptionId,
          userEmail,
        });
      }

      let tier = await getExistingSubscriptionTier(subscriptionId);
      tier ??= inferTierFromAmount(
        centsToUnits(attrs.total_usd ?? attrs.total),
      );

      const { error } = await supabase.from("payments").insert({
        user_id: targetUserId,
        amount: centsToUnits(attrs.total_usd ?? attrs.total),
        currency: asString(attrs.currency) ?? "USD",
        status: "approved",
        provider: "lemonsqueezy",
        provider_payment_id: providerPaymentId,
        tier,
        payment_type: "subscription_invoice",
        billing_interval: "month",
        billing_reason: asString(attrs.billing_reason),
        provider_subscription_id: subscriptionId,
        provider_customer_id: asString(attrs.customer_id),
        user_email: userEmail,
        metadata: body,
      });

      if (error) {
        logLemonSqueezyEvent(
          "error",
          "invoice_record_failed",
          {
            eventName,
            providerPaymentId,
            subscriptionId,
            tier,
            userId: targetUserId,
          },
          error,
        );
        return jsonResponse(
          { error: "Failed to record recurring payment" },
          500,
        );
      }

      logLemonSqueezyEvent("info", "invoice_recorded", {
        eventName,
        providerPaymentId,
        subscriptionId,
        tier,
        userId: targetUserId,
      });

      if (targetUserId) {
        await syncProfileSubscription(targetUserId);
        await updateCheckoutIntent({
          checkoutIntentId,
          plan: tier,
          status: "linked",
          subscriptionId,
          userId: targetUserId,
        });
      }

      return okResponse();
    }

    logLemonSqueezyEvent("info", "webhook_ignored_event", {
      eventName,
      resourceId: asString(body?.data?.id),
    });

    return okResponse();
  } catch (error) {
    logLemonSqueezyEvent("error", "webhook_failed", {}, error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

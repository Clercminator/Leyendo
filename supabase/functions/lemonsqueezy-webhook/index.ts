import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET =
  Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET")?.trim() ?? "";
const FOCUS_VARIANT_ID =
  (
    Deno.env.get("LEMONSQUEEZY_VARIANT_FOCUS") ??
    Deno.env.get("LEMONSQUEEZY_VARIANT_STANDARD") ??
    Deno.env.get("LEMONSQUEEZY_VARIANT_BUILDER")
  )?.trim() ?? "";
const MAX_VARIANT_ID = Deno.env.get("LEMONSQUEEZY_VARIANT_MAX")?.trim() ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type PaidTierId = "focus" | "max";
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Signature, X-Event-Name",
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

  if (
    normalizedVariantId &&
    MAX_VARIANT_ID &&
    normalizedVariantId === MAX_VARIANT_ID
  ) {
    return "max";
  }

  if (
    normalizedVariantId &&
    FOCUS_VARIANT_ID &&
    normalizedVariantId === FOCUS_VARIANT_ID
  ) {
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

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Failed to list users for LemonSqueezy email match:", error);
    return null;
  }

  const match = data.users.find(
    (user) => user.email?.toLowerCase() === userEmail.toLowerCase(),
  );

  return match?.id ?? null;
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
    console.error("Failed to sync profile subscription from billing:", error);
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
    .eq("provider", "lemonsqueezy")
    .eq("provider_subscription_id", subscriptionId)
    .limit(1)
    .maybeSingle();

  return data?.tier === "focus" || data?.tier === "max" ? data.tier : null;
}

async function upsertSubscriptionRecord(params: {
  attributes: Record<string, unknown>;
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
    console.error("Failed to upsert LemonSqueezy subscription:", error);
    throw new Error("Failed to sync LemonSqueezy subscription state");
  }

  if (params.userId) {
    await syncProfileSubscription(params.userId);
  }

  return tier;
}

async function verifySignature(rawBody: string, signature: string | null) {
  if (!WEBHOOK_SECRET || !signature) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(signed))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return hex === signature;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Signature");
  const eventName = req.headers.get("X-Event-Name");

  if (!(await verifySignature(rawBody, signature))) {
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  try {
    const body = JSON.parse(rawBody);
    const attrs = (body?.data?.attributes ?? {}) as Record<string, unknown>;
    const customData = body?.meta?.custom_data ?? {};

    if (!eventName || eventName === "order_created") {
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
        return okResponse();
      }

      await upsertSubscriptionRecord({
        attributes: attrs,
        metadata: body,
        subscriptionId,
        userEmail,
        userId: targetUserId,
      });

      return okResponse();
    }

    if (SUBSCRIPTION_PAYMENT_EVENTS.has(eventName)) {
      if ((asString(attrs.status) ?? "") !== "paid") {
        return okResponse();
      }

      const providerPaymentId = asString(body?.data?.id);
      if (!providerPaymentId) {
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
        return okResponse();
      }

      const subscriptionId = asString(attrs.subscription_id);
      const userEmail = asString(attrs.user_email);
      const targetUserId = await resolveTargetUserId({
        explicitUserId: customData.user_id,
        subscriptionId,
        userEmail,
      });

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
        console.error("Failed to record LemonSqueezy invoice:", error);
        return jsonResponse(
          { error: "Failed to record recurring payment" },
          500,
        );
      }

      if (targetUserId) {
        await syncProfileSubscription(targetUserId);
      }

      return okResponse();
    }

    return okResponse();
  } catch (error) {
    console.error("LemonSqueezy webhook error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

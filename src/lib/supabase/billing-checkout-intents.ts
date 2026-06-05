import { createClient } from "@supabase/supabase-js";

import type { HostedPaymentProvider } from "@/lib/payment-config";
import type { PaidPlanTier } from "@/lib/plans";

export type BillingCheckoutIntentStatus =
  | "created"
  | "checkout_opened"
  | "returned"
  | "pending_provider_sync"
  | "linked"
  | "needs_attention"
  | "expired";

export interface BillingCheckoutIntent {
  id: string;
  supportReference: string;
}

function pickFirstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function createServerSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabasePublicKey = pickFirstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!supabaseUrl.trim() || !supabasePublicKey.trim()) {
    throw new Error("Supabase is not configured.");
  }

  return createClient(supabaseUrl, supabasePublicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function createCheckoutIntentId() {
  return globalThis.crypto.randomUUID();
}

function createSupportReference(intentId: string) {
  return `LY-${intentId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export async function createBillingCheckoutIntent(args: {
  accessToken: string;
  metadata?: Record<string, unknown>;
  provider: HostedPaymentProvider;
  returnUrl?: string;
  tier: PaidPlanTier;
  userEmail?: string;
  userId: string;
}): Promise<BillingCheckoutIntent> {
  const supabase = createServerSupabaseClient(args.accessToken);
  const id = createCheckoutIntentId();
  const supportReference = createSupportReference(id);

  const { data, error } = await supabase
    .from("billing_checkout_intents")
    .insert({
      id,
      metadata: args.metadata ?? {},
      provider: args.provider,
      return_url: args.returnUrl ?? null,
      status: "created",
      support_reference: supportReference,
      tier: args.tier,
      user_email: args.userEmail || null,
      user_id: args.userId,
    })
    .select("id,support_reference")
    .single();

  if (error) {
    throw new Error("Leyendo could not prepare payment recovery. Try again.");
  }

  return {
    id: String(data.id),
    supportReference: String(data.support_reference),
  };
}

export async function markBillingCheckoutIntentOpened(args: {
  accessToken: string;
  checkoutUrl: string;
  id: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
}) {
  const supabase = createServerSupabaseClient(args.accessToken);

  const { error } = await supabase
    .from("billing_checkout_intents")
    .update({
      checkout_url: args.checkoutUrl,
      metadata: args.metadata ?? {},
      return_url: args.returnUrl ?? null,
      status: "checkout_opened" satisfies BillingCheckoutIntentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.id);

  if (error) {
    throw new Error("Leyendo could not save the checkout recovery link.");
  }
}

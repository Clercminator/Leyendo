export type MercadoPagoPaidTierId = "focus" | "max";

type SearchableMercadoPagoSubscription = Record<string, unknown>;

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

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = asString(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function getSubscriptionPlanId(
  subscription: SearchableMercadoPagoSubscription,
): string | null {
  return pickString(
    subscription.preapproval_plan_id,
    subscription.preapproval_plan &&
      typeof subscription.preapproval_plan === "object"
      ? (subscription.preapproval_plan as SearchableMercadoPagoSubscription).id
      : null,
  );
}

function getSubscriptionSortTime(
  subscription: SearchableMercadoPagoSubscription,
): number {
  const dateValue = pickString(
    subscription.last_modified,
    subscription.date_modified,
    subscription.date_created,
  );

  if (!dateValue) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(dateValue);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function buildMercadoPagoPreapprovalSearchParams(args: {
  limit: number;
  searchPlanId?: string | null;
  userEmail?: string | null;
  userId?: string | null;
}) {
  const searchParams = new URLSearchParams({
    limit: String(args.limit),
    offset: "0",
  });

  if (!args.userId && args.userEmail) {
    searchParams.set("payer_email", args.userEmail);
  }

  if (args.searchPlanId) {
    searchParams.set("preapproval_plan_id", args.searchPlanId);
  }

  return searchParams;
}

export function findLatestMatchingMercadoPagoSubscription(args: {
  inferTierFromSubscription: (
    subscription: SearchableMercadoPagoSubscription,
  ) => MercadoPagoPaidTierId;
  plan: MercadoPagoPaidTierId | null;
  results: SearchableMercadoPagoSubscription[];
  searchPlanId?: string | null;
  userEmail?: string | null;
  userId?: string | null;
}) {
  const normalizedEmail = args.userEmail?.toLowerCase() ?? null;
  const sortedResults = [...args.results].sort(
    (left, right) => getSubscriptionSortTime(right) - getSubscriptionSortTime(left),
  );

  return sortedResults.find((subscription) => {
    const externalReference = pickString(subscription.external_reference);
    if (args.userId && externalReference === args.userId) {
      return true;
    }

    if (!normalizedEmail) {
      return false;
    }

    const subscriptionEmail = pickString(subscription.payer_email);
    if (
      subscriptionEmail &&
      subscriptionEmail.toLowerCase() !== normalizedEmail
    ) {
      return false;
    }

    if (args.searchPlanId) {
      return getSubscriptionPlanId(subscription) === args.searchPlanId;
    }

    if (args.plan) {
      return args.inferTierFromSubscription(subscription) === args.plan;
    }

    return true;
  });
}
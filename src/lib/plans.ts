export type PlanTier = "basic" | "focus" | "max";
export type PaidPlanTier = Exclude<PlanTier, "basic">;
export type SubscriptionStatus =
  | "inactive"
  | "pending"
  | "trialing"
  | "active"
  | "grace_period"
  | "past_due"
  | "canceled"
  | "expired";

export const freeFileUploadLimit = 3;
export const focusFileUploadLimit = 15;

const paidPlanRank = {
  basic: 0,
  focus: 1,
  max: 2,
} satisfies Record<PlanTier, number>;

const activeSubscriptionStatuses = new Set<SubscriptionStatus>([
  "trialing",
  "active",
  "grace_period",
]);

interface PlanAccessInput {
  planTier?: PlanTier;
  subscriptionExpiresAt?: string;
  subscriptionGraceUntil?: string;
  subscriptionStatus?: SubscriptionStatus;
}

export function normalizePlanTier(value: unknown): PlanTier {
  return value === "focus" || value === "max" ? value : "basic";
}

export function normalizeSubscriptionStatus(
  value: unknown,
): SubscriptionStatus | undefined {
  switch (value) {
    case "inactive":
    case "pending":
    case "trialing":
    case "active":
    case "grace_period":
    case "past_due":
    case "canceled":
    case "expired":
      return value;
    default:
      return undefined;
  }
}

export function isPaidPlan(planTier: PlanTier): planTier is PaidPlanTier {
  return planTier === "focus" || planTier === "max";
}

export function hasPlanTierAccess(
  currentPlanTier: PlanTier,
  requiredPlanTier: PlanTier,
) {
  return paidPlanRank[currentPlanTier] >= paidPlanRank[requiredPlanTier];
}

export function hasActivePaidSubscription(input: PlanAccessInput) {
  const planTier = normalizePlanTier(input.planTier);
  if (!isPaidPlan(planTier)) {
    return false;
  }

  const subscriptionStatus = normalizeSubscriptionStatus(
    input.subscriptionStatus,
  );
  if (!subscriptionStatus) {
    return true;
  }

  if (!activeSubscriptionStatuses.has(subscriptionStatus)) {
    return false;
  }

  const now = Date.now();
  const expiresAt = input.subscriptionExpiresAt
    ? Date.parse(input.subscriptionExpiresAt)
    : Number.NaN;
  const graceUntil = input.subscriptionGraceUntil
    ? Date.parse(input.subscriptionGraceUntil)
    : Number.NaN;

  if (Number.isFinite(expiresAt) && expiresAt <= now) {
    return Number.isFinite(graceUntil) && graceUntil > now;
  }

  if (
    subscriptionStatus === "grace_period" &&
    Number.isFinite(graceUntil) &&
    graceUntil <= now
  ) {
    return false;
  }

  return true;
}

export function hasPlanAccess(
  input: PlanAccessInput | undefined,
  requiredPlanTier: PlanTier,
) {
  if (requiredPlanTier === "basic") {
    return true;
  }

  const currentPlanTier = normalizePlanTier(input?.planTier);
  return (
    hasPlanTierAccess(currentPlanTier, requiredPlanTier) &&
    hasActivePaidSubscription(input ?? {})
  );
}

export function getEffectivePlanTier(
  input: PlanAccessInput | undefined,
): PlanTier {
  const planTier = normalizePlanTier(input?.planTier);
  return isPaidPlan(planTier) && hasActivePaidSubscription(input ?? {})
    ? planTier
    : "basic";
}

export function getPaidPlanCheckoutRestriction(
  input: PlanAccessInput | undefined,
  requestedPlanTier: PaidPlanTier,
) {
  const activePlanTier = getEffectivePlanTier(input);

  if (activePlanTier === "focus" && requestedPlanTier === "focus") {
    return "Your account is already on Focus. Upgrade to Max if you need more access.";
  }

  if (activePlanTier === "max") {
    return requestedPlanTier === "max"
      ? "Your account is already on Max."
      : "Your Max plan already includes Focus, so this account cannot buy a lower-tier plan.";
  }

  return undefined;
}

export function getFileUploadLimit(planTier: PlanTier): number | null {
  if (planTier === "max") {
    return null;
  }

  return planTier === "focus" ? focusFileUploadLimit : freeFileUploadLimit;
}

export function getRemainingFileUploads(args: {
  planTier: PlanTier;
  usedUploads: number;
}) {
  const limit = getFileUploadLimit(args.planTier);

  if (limit === null) {
    return null;
  }

  return Math.max(0, limit - Math.max(0, args.usedUploads));
}

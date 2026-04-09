import { describe, expect, it } from "vitest";

import { getEffectivePlanTier, hasPlanAccess } from "@/lib/plans";

describe("plan access helpers", () => {
  it("grants Max access when the subscription is active", () => {
    expect(
      hasPlanAccess(
        {
          planTier: "max",
          subscriptionStatus: "active",
        },
        "max",
      ),
    ).toBe(true);
  });

  it("blocks paid access when the subscription is expired", () => {
    expect(
      hasPlanAccess(
        {
          planTier: "focus",
          subscriptionExpiresAt: "2026-01-01T00:00:00.000Z",
          subscriptionStatus: "expired",
        },
        "focus",
      ),
    ).toBe(false);
  });

  it("falls back to basic when a paid plan no longer has access", () => {
    expect(
      getEffectivePlanTier({
        planTier: "max",
        subscriptionStatus: "canceled",
      }),
    ).toBe("basic");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthenticatedCheckoutContext } = vi.hoisted(() => ({
  getAuthenticatedCheckoutContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server-auth", () => ({
  getAuthenticatedCheckoutContext,
}));

import { POST } from "@/app/api/payments/mercadopago/route";

const originalFocusPlanId = process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID;
const originalFocusTestingId = process.env.MERCADOPAGO_FOCUS_ID_TESTING;
const originalMaxPlanId = process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID;
const originalMaxTestingId = process.env.MERCADOPAGO_MAX_ID_TESTING;
const originalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const originalAccessTokenTesting =
  process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT;
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalVercelEnv = process.env.VERCEL_ENV;
const fetchMock = vi.fn<typeof fetch>();

vi.stubGlobal("fetch", fetchMock);

describe("MercadoPago checkout route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    getAuthenticatedCheckoutContext.mockReset();
    getAuthenticatedCheckoutContext.mockResolvedValue({
      profile: undefined,
      user: {
        email: "reader@example.com",
        id: "user-123",
      },
    });
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID = "";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING = "";
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID = "";
    process.env.MERCADOPAGO_MAX_ID_TESTING = "";
    process.env.MERCADOPAGO_ACCESS_TOKEN = "";
    process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT = "";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.VERCEL_ENV = "";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID = originalFocusPlanId;
    process.env.MERCADOPAGO_FOCUS_ID_TESTING = originalFocusTestingId;
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID = originalMaxPlanId;
    process.env.MERCADOPAGO_MAX_ID_TESTING = originalMaxTestingId;
    process.env.MERCADOPAGO_ACCESS_TOKEN = originalAccessToken;
    process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT =
      originalAccessTokenTesting;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("uses the hosted MercadoPago subscription link even when access token and plan id are configured", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";
    process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT =
      "mp_test_preview_token";

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({
          plan: "focus",
          userEmail: "reader@example.com",
          userId: "user-123",
        }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { checkoutUrl: string };
    const checkoutUrl = new URL(payload.checkoutUrl);

    expect(checkoutUrl.origin).toBe("https://www.mercadopago.com.ar");
    expect(checkoutUrl.pathname).toBe("/subscriptions/checkout");
    expect(checkoutUrl.searchParams.get("preapproval_plan_id")).toBe(
      "5870237243d3400bacd2d236caae7a20",
    );
    expect(checkoutUrl.searchParams.get("back_url")).toBe(
      "http://localhost/account?plan=focus&payment=success&provider=mercadopago",
    );
    expect(checkoutUrl.searchParams.get("external_reference")).toBe("user-123");
    expect(checkoutUrl.searchParams.get("payer_email")).toBe(
      "reader@example.com",
    );
    expect(checkoutUrl.searchParams.get("reason")).toBe("Leyendo Focus");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects MercadoPago checkout when no Leyendo user id is provided", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({
          plan: "focus",
          userEmail: "reader@example.com",
        }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "MercadoPago checkout requires a signed-in Leyendo account so the subscription can be linked without depending on buyer email.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports the legacy preview env alias for the Focus plan id", async () => {
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "focus", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { checkoutUrl: string };
    const checkoutUrl = new URL(payload.checkoutUrl);

    expect(checkoutUrl.origin).toBe("https://www.mercadopago.com.ar");
    expect(checkoutUrl.pathname).toBe("/subscriptions/checkout");
    expect(checkoutUrl.searchParams.get("preapproval_plan_id")).toBe(
      "5870237243d3400bacd2d236caae7a20",
    );
    expect(checkoutUrl.searchParams.get("back_url")).toBe(
      "http://localhost/account?plan=focus&payment=success&provider=mercadopago",
    );
  });

  it("rejects invalid short dashboard ids", async () => {
    process.env.MERCADOPAGO_FOCUS_ID_TESTING = "952930";

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "focus", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error:
        "MercadoPago focus is configured with an invalid plan id (952930). Use the full 32-character preapproval_plan_id, not a short dashboard number.",
    });
  });

  it("prefers preview MercadoPago aliases over live ids on Vercel Preview", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID =
      "b9ee7e5887ba41608dbceb39a152073b";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "focus", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { checkoutUrl: string };
    const checkoutUrl = new URL(payload.checkoutUrl);

    expect(checkoutUrl.searchParams.get("preapproval_plan_id")).toBe(
      "5870237243d3400bacd2d236caae7a20",
    );
    expect(checkoutUrl.searchParams.get("back_url")).toBe(
      "http://localhost/account?plan=focus&payment=success&provider=mercadopago",
    );
  });

  it("passes the signed-in user context through the MercadoPago hosted checkout", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.MERCADOPAGO_MAX_ID_TESTING = "9f0352ccb88840e38f5241214e548df4";

    const response = await POST(
      new Request("https://leyendo.vercel.app/api/payments/mercadopago", {
        body: JSON.stringify({
          plan: "max",
          userEmail: "reader@example.com",
          userId: "user-123",
        }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as { checkoutUrl: string };
    const checkoutUrl = new URL(payload.checkoutUrl);

    expect(checkoutUrl.searchParams.get("preapproval_plan_id")).toBe(
      "9f0352ccb88840e38f5241214e548df4",
    );
    expect(checkoutUrl.searchParams.get("external_reference")).toBe("user-123");
    expect(checkoutUrl.searchParams.get("payer_email")).toBe(
      "reader@example.com",
    );
    expect(checkoutUrl.searchParams.get("back_url")).toBe(
      "https://leyendo.vercel.app/account?plan=max&payment=success&provider=mercadopago",
    );
  });

  it("rejects rebuying Focus when the signed-in account already has Focus", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";
    getAuthenticatedCheckoutContext.mockResolvedValue({
      profile: {
        planTier: "focus",
        subscriptionStatus: "active",
      },
      user: {
        email: "reader@example.com",
        id: "user-123",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "focus", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        "Your account is already on Focus. Upgrade to Max if you need more access.",
    });
  });

  it("rejects Focus checkout when the signed-in account already has Max", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";
    getAuthenticatedCheckoutContext.mockResolvedValue({
      profile: {
        planTier: "max",
        subscriptionStatus: "active",
      },
      user: {
        email: "reader@example.com",
        id: "user-123",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "focus", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        "Your Max plan already includes Focus, so this account cannot buy a lower-tier plan.",
    });
  });

  it("still allows a Focus account to upgrade to Max", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.MERCADOPAGO_MAX_ID_TESTING = "9f0352ccb88840e38f5241214e548df4";
    getAuthenticatedCheckoutContext.mockResolvedValue({
      profile: {
        planTier: "focus",
        subscriptionStatus: "active",
      },
      user: {
        email: "reader@example.com",
        id: "user-123",
      },
    });

    const response = await POST(
      new Request("https://leyendo.vercel.app/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "max", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { checkoutUrl: string };
    expect(new URL(payload.checkoutUrl).searchParams.get("preapproval_plan_id")).toBe(
      "9f0352ccb88840e38f5241214e548df4",
    );
  });
});

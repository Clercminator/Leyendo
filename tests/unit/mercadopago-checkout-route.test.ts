import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/payments/mercadopago/route";

const fetchMock = vi.fn<typeof fetch>();

const originalFocusPlanId = process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID;
const originalFocusTestingId = process.env.MERCADOPAGO_FOCUS_ID_TESTING;
const originalMaxPlanId = process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID;
const originalMaxTestingId = process.env.MERCADOPAGO_MAX_ID_TESTING;
const originalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const originalAccessTokenTesting =
  process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT;
const originalVercelEnv = process.env.VERCEL_ENV;

vi.stubGlobal("fetch", fetchMock);

describe("MercadoPago checkout route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID = "";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING = "";
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID = "";
    process.env.MERCADOPAGO_MAX_ID_TESTING = "";
    process.env.MERCADOPAGO_ACCESS_TOKEN = "";
    process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT = "";
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
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("creates a MercadoPago preapproval from the configured plan id", async () => {
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";
    process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT =
      "mp_test_preview_token";

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "preapproval_focus_1",
          init_point:
            "https://www.mercadopago.com.ar/subscriptions/checkout/start?preapproval_id=preapproval_focus_1",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "focus" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkoutUrl:
        "https://www.mercadopago.com.ar/subscriptions/checkout/start?preapproval_id=preapproval_focus_1",
      providerSubscriptionId: "preapproval_focus_1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/preapproval",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mp_test_preview_token",
        }),
        method: "POST",
      }),
    );

    const payload = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"),
    ) as {
      back_url?: string;
      preapproval_plan_id?: string;
      status?: string;
    };

    expect(payload.preapproval_plan_id).toBe(
      "5870237243d3400bacd2d236caae7a20",
    );
    expect(payload.back_url).toBe(
      "http://localhost/account?plan=focus&payment=success&provider=mercadopago",
    );
    expect(payload.status).toBe("pending");
  });

  it("rejects invalid short dashboard ids", async () => {
    process.env.MERCADOPAGO_FOCUS_ID_TESTING = "952930";
    process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT =
      "mp_test_preview_token";

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "focus" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error:
        "MercadoPago focus is configured with an invalid plan id (952930). Use the full 32-character preapproval_plan_id, not a short dashboard number.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers preview MercadoPago aliases over live ids on Vercel Preview", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID =
      "b9ee7e5887ba41608dbceb39a152073b";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";
    process.env.MERCADOPAGO_ACCESS_TOKEN = "mp_live_token";
    process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT =
      "mp_test_preview_token";

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "preapproval_focus_2",
          init_point:
            "https://www.mercadopago.com.ar/subscriptions/checkout/start?preapproval_id=preapproval_focus_2",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/payments/mercadopago", {
        body: JSON.stringify({ plan: "focus" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/preapproval",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mp_test_preview_token",
        }),
      }),
    );

    const payload = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"),
    ) as {
      preapproval_plan_id?: string;
    };

    expect(payload.preapproval_plan_id).toBe(
      "5870237243d3400bacd2d236caae7a20",
    );
  });

  it("passes the signed-in user context through the MercadoPago preapproval", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.MERCADOPAGO_MAX_ID_TESTING = "9f0352ccb88840e38f5241214e548df4";
    process.env.MERCADOPAGO_ACCESS_TOKEN_TESTING_ACCOUNT =
      "mp_test_preview_token";

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "preapproval_max_1",
          init_point:
            "https://www.mercadopago.com.ar/subscriptions/checkout/start?preapproval_id=preapproval_max_1",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await POST(
      new Request("https://leyendo.vercel.app/api/payments/mercadopago", {
        body: JSON.stringify({
          plan: "max",
          userEmail: "reader@example.com",
          userId: "user-123",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);

    const payload = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"),
    ) as {
      back_url?: string;
      external_reference?: string;
      payer_email?: string;
      preapproval_plan_id?: string;
      reason?: string;
    };

    expect(payload.preapproval_plan_id).toBe(
      "9f0352ccb88840e38f5241214e548df4",
    );
    expect(payload.external_reference).toBe("user-123");
    expect(payload.payer_email).toBe("reader@example.com");
    expect(payload.back_url).toBe(
      "https://leyendo.vercel.app/account?plan=max&payment=success&provider=mercadopago",
    );
    expect(payload.reason).toBe("Leyendo Max");
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/payments/mercadopago/route";

const originalFocusPlanId = process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID;
const originalFocusTestingId = process.env.MERCADOPAGO_FOCUS_ID_TESTING;
const originalMaxPlanId = process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID;
const originalMaxTestingId = process.env.MERCADOPAGO_MAX_ID_TESTING;
const originalVercelEnv = process.env.VERCEL_ENV;

describe("MercadoPago checkout route", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID = "";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING = "";
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID = "";
    process.env.MERCADOPAGO_MAX_ID_TESTING = "";
    process.env.VERCEL_ENV = "";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID = originalFocusPlanId;
    process.env.MERCADOPAGO_FOCUS_ID_TESTING = originalFocusTestingId;
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID = originalMaxPlanId;
    process.env.MERCADOPAGO_MAX_ID_TESTING = originalMaxTestingId;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("supports the legacy preview env alias for the Focus plan id", async () => {
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";

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
        "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=5870237243d3400bacd2d236caae7a20",
    });
  });

  it("rejects invalid short dashboard ids", async () => {
    process.env.MERCADOPAGO_FOCUS_ID_TESTING = "952930";

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
  });

  it("prefers preview MercadoPago aliases over live ids on Vercel Preview", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID =
      "b9ee7e5887ba41608dbceb39a152073b";
    process.env.MERCADOPAGO_FOCUS_ID_TESTING =
      "5870237243d3400bacd2d236caae7a20";

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
        "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=5870237243d3400bacd2d236caae7a20",
    });
  });
});

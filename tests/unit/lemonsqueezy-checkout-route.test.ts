import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getAuthenticatedCheckoutContext } = vi.hoisted(() => ({
  getAuthenticatedCheckoutContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server-auth", () => ({
  getAuthenticatedCheckoutContext,
}));

import { POST } from "@/app/api/payments/lemonsqueezy/route";

const fetchMock = vi.fn<typeof fetch>();

const originalApiKey = process.env.LEMONSQUEEZY_API_KEY;
const originalApiKeyTesting = process.env.LEMONSQUEEZY_API_KEY_TESTING;
const originalStoreId = process.env.LEMONSQUEEZY_STORE_ID;
const originalStoreIdTesting = process.env.LEMONSQUEEZY_STORE_ID_TESTING;
const originalFocusVariant = process.env.LEMONSQUEEZY_VARIANT_FOCUS;
const originalFocusVariantTesting =
  process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING;
const originalMaxVariant = process.env.LEMONSQUEEZY_VARIANT_MAX;
const originalMaxVariantTesting = process.env.LEMONSQUEEZY_VARIANT_MAX_TESTING;
const originalVercelEnv = process.env.VERCEL_ENV;

vi.stubGlobal("fetch", fetchMock);

describe("LemonSqueezy checkout route", () => {
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
    process.env.LEMONSQUEEZY_API_KEY = "";
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "";
    process.env.LEMONSQUEEZY_STORE_ID = "";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS = "";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING = "";
    process.env.LEMONSQUEEZY_VARIANT_MAX = "";
    process.env.LEMONSQUEEZY_VARIANT_MAX_TESTING = "";
    process.env.VERCEL_ENV = "";
  });

  afterAll(() => {
    process.env.LEMONSQUEEZY_API_KEY = originalApiKey;
    process.env.LEMONSQUEEZY_API_KEY_TESTING = originalApiKeyTesting;
    process.env.LEMONSQUEEZY_STORE_ID = originalStoreId;
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = originalStoreIdTesting;
    process.env.LEMONSQUEEZY_VARIANT_FOCUS = originalFocusVariant;
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING =
      originalFocusVariantTesting;
    process.env.LEMONSQUEEZY_VARIANT_MAX = originalMaxVariant;
    process.env.LEMONSQUEEZY_VARIANT_MAX_TESTING = originalMaxVariantTesting;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("supports preview env aliases for api key, store id, and variants", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING = "1497164";

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            attributes: {
              url: "https://checkout.lemonsqueezy.com/buy/test-focus",
            },
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "focus", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: "https://checkout.lemonsqueezy.com/buy/test-focus",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lemonsqueezy.com/v1/checkouts",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/vnd.api+json",
          Authorization: "Bearer ls_test_preview_key",
          "Content-Type": "application/vnd.api+json",
        }),
        method: "POST",
      }),
    );

    const payload = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"),
    ) as {
      data?: {
        attributes?: {
          checkout_data?: {
            custom?: { user_id?: string };
          };
        };
        relationships?: {
          store?: { data?: { id?: string } };
          variant?: { data?: { id?: string } };
        };
      };
    };

    expect(payload.data?.relationships?.store?.data?.id).toBe("98765");
    expect(payload.data?.relationships?.variant?.data?.id).toBe("1497164");
    expect(payload.data?.attributes?.checkout_data?.custom?.user_id).toBe(
      "user-123",
    );
  });

  it("supports the preview max variant alias when it is configured", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";
    process.env.LEMONSQUEEZY_VARIANT_MAX_TESTING = "2497164";

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            attributes: {
              url: "https://checkout.lemonsqueezy.com/buy/test-max",
            },
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "max", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: "https://checkout.lemonsqueezy.com/buy/test-max",
    });

    const payload = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"),
    ) as {
      data?: {
        relationships?: {
          variant?: { data?: { id?: string } };
        };
      };
    };

    expect(payload.data?.relationships?.variant?.data?.id).toBe("2497164");
  });

  it("prefers preview LemonSqueezy aliases over live values on Vercel Preview", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.LEMONSQUEEZY_API_KEY = "ls_live_key";
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID = "11111";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS = "live-focus";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING = "1497164";

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            attributes: {
              url: "https://checkout.lemonsqueezy.com/buy/test-focus",
            },
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "focus", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lemonsqueezy.com/v1/checkouts",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ls_test_preview_key",
        }),
      }),
    );

    const payload = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"),
    ) as {
      data?: {
        attributes?: {
          product_options?: { redirect_url?: string };
          test_mode?: boolean;
        };
        relationships?: {
          store?: { data?: { id?: string } };
          variant?: { data?: { id?: string } };
        };
      };
    };

    expect(payload.data?.relationships?.store?.data?.id).toBe("98765");
    expect(payload.data?.relationships?.variant?.data?.id).toBe("1497164");
    expect(payload.data?.attributes?.product_options?.redirect_url).toBe(
      "http://localhost/account?plan=focus&payment=success&provider=lemonsqueezy",
    );
    expect(payload.data?.attributes?.test_mode).toBe(true);
  });

  it("rejects LemonSqueezy checkout when no Leyendo user id is provided", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING = "1497164";

    const response = await POST(
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "focus" }),
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
        "LemonSqueezy checkout requires a signed-in Leyendo account so the subscription can be linked without depending on buyer email.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires an explicit focus variant when no supported focus alias is configured", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";

    const response = await POST(
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "focus", userId: "user-123" }),
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
        "No Focus LemonSqueezy variant is configured. Supported env names include LEMONSQUEEZY_VARIANT_FOCUS, LEMONSQUEEZY_VARIANT_FOCUS_TESTING, LEMONSQUEEZY_VARIANT_STANDARD, and LEMONSQUEEZY_VARIANT_BUILDER.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rewrites provider resource errors to explain store and variant mismatches", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING = "1497164";

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [
            {
              detail: "The related resource does not exist.",
            },
          ],
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "focus", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error:
        "LemonSqueezy could not create the checkout because the configured store id and variant id do not belong to the same account. Check LEMONSQUEEZY_STORE_ID or LEMONSQUEEZY_STORE_ID_TESTING and the selected LEMONSQUEEZY_VARIANT_* value in Vercel.",
    });
  });

  it("rejects rebuying Focus when the signed-in account already has Focus", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING = "1497164";
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
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "focus", userId: "user-123" }),
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects Focus checkout when the signed-in account already has Max", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING = "1497164";
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
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "focus", userId: "user-123" }),
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still allows a Focus account to upgrade to Max", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";
    process.env.LEMONSQUEEZY_VARIANT_MAX_TESTING = "2497164";
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
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            attributes: {
              url: "https://checkout.lemonsqueezy.com/buy/upgrade-max",
            },
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "max", userId: "user-123" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: "https://checkout.lemonsqueezy.com/buy/upgrade-max",
    });
  });
});

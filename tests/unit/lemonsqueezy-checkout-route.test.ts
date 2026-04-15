import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

vi.stubGlobal("fetch", fetchMock);

describe("LemonSqueezy checkout route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    process.env.LEMONSQUEEZY_API_KEY = "";
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "";
    process.env.LEMONSQUEEZY_STORE_ID = "";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS = "";
    process.env.LEMONSQUEEZY_VARIANT_FOCUS_TESTING = "";
    process.env.LEMONSQUEEZY_VARIANT_MAX = "";
    process.env.LEMONSQUEEZY_VARIANT_MAX_TESTING = "";
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
        body: JSON.stringify({ locale: "en", plan: "focus" }),
        headers: { "Content-Type": "application/json" },
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
        relationships?: {
          store?: { data?: { id?: string } };
          variant?: { data?: { id?: string } };
        };
      };
    };

    expect(payload.data?.relationships?.store?.data?.id).toBe("98765");
    expect(payload.data?.relationships?.variant?.data?.id).toBe("1497164");
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
        body: JSON.stringify({ locale: "en", plan: "max" }),
        headers: { "Content-Type": "application/json" },
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

  it("requires an explicit focus variant when no supported focus alias is configured", async () => {
    process.env.LEMONSQUEEZY_API_KEY_TESTING = "ls_test_preview_key";
    process.env.LEMONSQUEEZY_STORE_ID_TESTING = "98765";

    const response = await POST(
      new NextRequest("http://localhost/api/payments/lemonsqueezy", {
        body: JSON.stringify({ locale: "en", plan: "focus" }),
        headers: { "Content-Type": "application/json" },
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
        body: JSON.stringify({ locale: "en", plan: "focus" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error:
        "LemonSqueezy could not create the checkout because the configured store id and variant id do not belong to the same account. Check LEMONSQUEEZY_STORE_ID and the selected LEMONSQUEEZY_VARIANT_* value in Vercel.",
    });
  });
});

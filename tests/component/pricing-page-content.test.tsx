/* eslint-disable @next/next/no-img-element */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PricingPageContent } from "@/components/pricing/pricing-page-content";

const originalMercadoPagoFocusPlanId =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID;
const originalMercadoPagoMaxPlanId =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID;
const fetchMock = vi.fn<typeof fetch>();

vi.stubGlobal("fetch", fetchMock);

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { useLocale } = vi.hoisted(() => ({
  useLocale: vi.fn(),
}));

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale,
}));

vi.mock("@/components/auth/supabase-provider", () => ({
  useSupabaseAuth: () => ({
    user: null,
  }),
}));

describe("PricingPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID =
      "b9ee7e5887ba41608dbceb39a152073b";
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID =
      "9f0352ccb88840e38f5241214e548df4";
    fetchMock.mockImplementation(async (input) => {
      if (typeof input === "string" && input === "/api/payments/mercadopago") {
        return new Response(
          JSON.stringify({
            checkoutUrl:
              "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=b9ee7e5887ba41608dbceb39a152073b",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });
    useLocale.mockReturnValue({
      locale: "en",
      setLocale: vi.fn(),
    });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_FOCUS_ID =
      originalMercadoPagoFocusPlanId;
    process.env.NEXT_PUBLIC_MERCADOPAGO_PLAN_MAX_ID =
      originalMercadoPagoMaxPlanId;
  });

  it("renders the three pricing plans and defaults to the global payment option in English", () => {
    render(<PricingPageContent />);

    expect(
      screen.getByRole("heading", { name: /basic reader/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^focus$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^max$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get focus/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get max/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/3 file uploads/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15 file uploads/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/unlimited uploads/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/how a new paid account gets activated/i),
    ).toBeInTheDocument();
  });

  it("uses the real MercadoPago subscription plans for LATAM card checkout", async () => {
    const user = userEvent.setup();
    const focusWindow = {
      location: { href: "" },
      opener: null as Window | null,
    } as unknown as Window;
    const maxWindow = {
      location: { href: "" },
      opener: null as Window | null,
    } as unknown as Window;
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValueOnce(focusWindow)
      .mockReturnValueOnce(maxWindow);

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            checkoutUrl:
              "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=b9ee7e5887ba41608dbceb39a152073b",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            checkoutUrl:
              "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=9f0352ccb88840e38f5241214e548df4",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<PricingPageContent />);

    await user.click(
      screen.getByRole("button", { name: /paying from latam\? switch/i }),
    );
    await user.click(screen.getByRole("button", { name: /get focus/i }));

    expect(
      screen.getByRole("dialog", {
        name: /how a new paid account gets activated/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /continue to checkout/i }),
    );

    expect(openSpy).toHaveBeenNthCalledWith(1, "", "_blank");
    expect(focusWindow.location.href).toBe(
      "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=b9ee7e5887ba41608dbceb39a152073b",
    );

    await user.click(screen.getByRole("button", { name: /get max/i }));

    expect(
      screen.getByRole("dialog", {
        name: /how a new paid account gets activated/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /continue to checkout/i }),
    );

    expect(openSpy).toHaveBeenNthCalledWith(2, "", "_blank");
    expect(maxWindow.location.href).toBe(
      "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=9f0352ccb88840e38f5241214e548df4",
    );

    openSpy.mockRestore();
  });

  it("blocks invalid MercadoPago plan ids instead of opening a broken checkout URL", async () => {
    const user = userEvent.setup();
    const checkoutWindow = {
      close: vi.fn(),
      location: { href: "" },
      opener: null as Window | null,
    } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(checkoutWindow);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error:
            "MercadoPago is not configured correctly yet. Use the real preapproval_plan_id or the full init_point URL, not a short dashboard number.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<PricingPageContent />);

    await user.click(
      screen.getByRole("button", { name: /paying from latam\? switch/i }),
    );
    await user.click(screen.getByRole("button", { name: /get focus/i }));

    await user.click(
      screen.getByRole("button", { name: /continue to checkout/i }),
    );

    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(
      (checkoutWindow as { close: ReturnType<typeof vi.fn> }).close,
    ).toHaveBeenCalled();
    expect(
      screen.getByText(/mercadopago is not configured correctly yet/i),
    ).toBeInTheDocument();

    openSpy.mockRestore();
  });

  it("switches payment region and opens the Binance dialog", async () => {
    const user = userEvent.setup();

    render(<PricingPageContent />);

    await user.click(
      screen.getByRole("button", { name: /paying from latam\? switch/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/showing latam payment \(mercadopago\)/i),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("button", { name: /pay with binance/i })[0],
    );

    expect(
      screen.getByRole("dialog", { name: /pay with binance pay/i }),
    ).toBeInTheDocument();
    expect(screen.getByAltText(/binance pay qr code/i)).toBeInTheDocument();
  });

  it("shows a success notice when payment=success is present in the URL", () => {
    render(
      <PricingPageContent
        initialPaymentStatus="success"
        initialPlanId="focus"
      />,
    );

    expect(
      screen.getByText(/payment approved\. go to your account/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/wait for the subscription linked message/i),
    ).toBeInTheDocument();
  });

  it("offers the paid account setup handoff after a successful checkout", () => {
    window.localStorage.setItem("leyendo_paid_signup_plan", "focus");

    render(<PricingPageContent initialPaymentStatus="success" />);

    expect(
      screen.getByRole("link", { name: /continue to paid account setup/i }),
    ).toHaveAttribute("href", "/account?payment=success&plan=focus");
  });
});

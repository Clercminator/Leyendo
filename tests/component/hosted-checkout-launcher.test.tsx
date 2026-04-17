import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HostedCheckoutLauncher } from "@/components/pricing/hosted-checkout-launcher";

const fetchMock = vi.fn<typeof fetch>();

vi.stubGlobal("fetch", fetchMock);

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

const { useSupabaseAuth } = vi.hoisted(() => ({
  useSupabaseAuth: vi.fn(),
}));

vi.mock("@/components/auth/supabase-provider", () => ({
  useSupabaseAuth,
}));

describe("HostedCheckoutLauncher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    fetchMock.mockReset();
    useLocale.mockReturnValue({
      locale: "en",
      setLocale: vi.fn(),
    });
    useSupabaseAuth.mockReturnValue({
      isConfigured: true,
      isLoading: false,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signUp: vi.fn(),
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("creates a MercadoPago checkout and redirects the new tab", async () => {
    const navigate = vi.fn();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          checkoutUrl:
            "https://www.mercadopago.com.ar/subscriptions/checkout/start?preapproval_id=preapproval_max_1",
          providerSubscriptionId: "preapproval_max_1",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <HostedCheckoutLauncher
        initialPlan="max"
        initialProvider="mercadopago"
        navigate={navigate}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/payments/mercadopago",
        expect.objectContaining({
          body: JSON.stringify({
            locale: "en",
            plan: "max",
            userEmail: "reader@example.com",
            userId: "user-1",
          }),
          method: "POST",
        }),
      );
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        "https://www.mercadopago.com.ar/subscriptions/checkout/start?preapproval_id=preapproval_max_1",
      );
    });

    expect(
      window.localStorage.getItem("leyendo_pending_checkout_subscription_id"),
    ).toBe("preapproval_max_1");
  });

  it("creates a LemonSqueezy checkout and clears old MercadoPago subscription ids", async () => {
    const navigate = vi.fn();
    window.localStorage.setItem(
      "leyendo_pending_checkout_subscription_id",
      "preapproval_old",
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          checkoutUrl: "https://checkout.lemonsqueezy.com/buy/test-focus",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <HostedCheckoutLauncher
        initialPlan="focus"
        initialProvider="lemonsqueezy"
        navigate={navigate}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/payments/lemonsqueezy",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        "https://checkout.lemonsqueezy.com/buy/test-focus",
      );
    });

    expect(
      window.localStorage.getItem("leyendo_pending_checkout_subscription_id"),
    ).toBeNull();
  });

  it("shows a pricing link when the checkout request is invalid", () => {
    render(
      <HostedCheckoutLauncher initialPlan="basic" initialProvider="binance" />,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/this payment request is not valid/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to pricing/i }),
    ).toHaveAttribute("href", "/pricing");
  });

  it("shows the provider error in the launcher tab instead of leaving it blank", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "MercadoPago is not configured correctly yet.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <HostedCheckoutLauncher
        initialPlan="max"
        initialProvider="mercadopago"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/mercadopago is not configured correctly yet/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: /back to pricing/i }),
    ).toHaveAttribute("href", "/pricing");
  });
});

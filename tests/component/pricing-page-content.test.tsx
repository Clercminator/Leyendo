/* eslint-disable @next/next/no-img-element */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PricingPageContent } from "@/components/pricing/pricing-page-content";

const { useRouter } = vi.hoisted(() => ({
  useRouter: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter,
}));

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

const { useSupabaseAuth } = vi.hoisted(() => ({
  useSupabaseAuth: vi.fn(),
}));

vi.mock("@/components/auth/supabase-provider", () => ({
  useSupabaseAuth,
}));

describe("PricingPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useRouter.mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });
    useSupabaseAuth.mockReturnValue({
      isConfigured: true,
      isLoading: false,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signUp: vi.fn(),
      user: null,
    });
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

    const basicHeading = screen.getByRole("heading", { name: /basic reader/i });

    expect(basicHeading).toBeInTheDocument();
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
      screen.getByText(
        /paid checkout starts with a free basic reader account/i,
      ),
    ).toBeInTheDocument();
  });

  it("opens a clean auth modal for guests before starting MercadoPago checkout", async () => {
    const user = userEvent.setup();

    render(<PricingPageContent />);

    await user.click(
      screen.getByRole("button", { name: /paying from latam\? switch/i }),
    );
    await user.click(screen.getByRole("button", { name: /get focus/i }));

    expect(
      screen.getByRole("dialog", { name: /create free account/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /your account starts on basic reader, and focus opens right after sign-up/i,
      ),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets a guest create a Basic Reader account inside the pricing modal", async () => {
    const signUp = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    useSupabaseAuth.mockReturnValue({
      isConfigured: true,
      isLoading: false,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signUp,
      user: null,
    });

    render(<PricingPageContent />);

    await user.click(screen.getByRole("button", { name: /get focus/i }));
    await user.click(
      screen.getByRole("button", { name: /continue with email/i }),
    );
    await user.type(screen.getByLabelText(/^email$/i), "reader@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "hunter2-password");
    await user.click(
      screen.getByRole("button", { name: /create basic reader/i }),
    );

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith(
        "reader@example.com",
        "hunter2-password",
        window.location.href,
      );
    });

    expect(
      screen.getByText(/basic reader account created\./i),
    ).toBeInTheDocument();
  });

  it("resumes MercadoPago checkout automatically after auth returns with stored intent", async () => {
    const focusWindow = {
      location: { href: "" },
      opener: null as Window | null,
    } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(focusWindow);

    window.localStorage.setItem("leyendo_pending_checkout_plan", "focus");
    window.localStorage.setItem(
      "leyendo_pending_checkout_provider",
      "mercadopago",
    );
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

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

    fetchMock.mockResolvedValueOnce(
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
    );

    render(<PricingPageContent />);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith("", "_blank");
    });

    expect(focusWindow.location.href).toBe(
      "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=b9ee7e5887ba41608dbceb39a152073b",
    );
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/pricing");

    openSpy.mockRestore();
    replaceStateSpy.mockRestore();
  });

  it("uses the real MercadoPago subscription plans for signed-in LATAM checkout", async () => {
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

    expect(openSpy).toHaveBeenNthCalledWith(1, "", "_blank");
    expect(focusWindow.location.href).toBe(
      "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=b9ee7e5887ba41608dbceb39a152073b",
    );

    await user.click(screen.getByRole("button", { name: /get max/i }));

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

  it("redirects signed-in payment returns back to the account page", async () => {
    const replace = vi.fn();

    useRouter.mockReturnValue({
      push: vi.fn(),
      replace,
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

    render(
      <PricingPageContent
        initialPaymentStatus="success"
        initialPlanId="focus"
      />,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/account?payment=success&plan=focus",
      );
    });
  });

  it("preserves the MercadoPago provider on the paid account handoff", async () => {
    const replace = vi.fn();

    useRouter.mockReturnValue({
      push: vi.fn(),
      replace,
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

    render(
      <PricingPageContent
        initialCheckoutProvider="mercadopago"
        initialPaymentStatus="success"
        initialPlanId="focus"
      />,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/account?payment=success&plan=focus&provider=mercadopago",
      );
    });
  });

  it("offers the paid account setup handoff after a successful checkout", () => {
    window.localStorage.setItem("leyendo_paid_signup_plan", "focus");

    render(<PricingPageContent initialPaymentStatus="success" />);

    expect(
      screen.getByRole("link", { name: /continue to paid account setup/i }),
    ).toHaveAttribute("href", "/account?payment=success&plan=focus");
  });
});

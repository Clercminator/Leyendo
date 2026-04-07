/* eslint-disable @next/next/no-img-element */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PricingPageContent } from "@/components/pricing/pricing-page-content";

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

describe("PricingPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useLocale.mockReturnValue({
      locale: "en",
      setLocale: vi.fn(),
    });
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
  });

  it("uses the real MercadoPago subscription plans for LATAM card checkout", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<PricingPageContent />);

    await user.click(
      screen.getByRole("button", { name: /paying from latam\? switch/i }),
    );
    await user.click(screen.getByRole("button", { name: /get focus/i }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=b9ee7e5887ba41608dbceb39a152073b",
      "_blank",
      "noopener,noreferrer",
    );

    await user.click(screen.getByRole("button", { name: /get max/i }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=9f0352ccb88840e38f5241214e548df4",
      "_blank",
      "noopener,noreferrer",
    );

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
    render(<PricingPageContent initialPaymentStatus="success" />);

    expect(
      screen.getByText(
        /payment approved\. if your plan does not unlock automatically/i,
      ),
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GuidesPageContent } from "@/components/guides/guides-page-content";

const { useLocale } = vi.hoisted(() => ({
  useLocale: vi.fn(),
}));

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale,
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
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

describe("GuidesPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only Spanish guides on the Spanish site", () => {
    useLocale.mockReturnValue({
      locale: "es",
      setLocale: vi.fn(),
    });

    render(<GuidesPageContent />);

    expect(
      screen.getByRole("heading", {
        name: /lectura rapida para documentos reales/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /velocidad de lectura y comprension lectora/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /reading speed for real documents/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/clusters de busqueda cubiertos/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/explora por idioma/i)).not.toBeInTheDocument();
  });

  it("shows only English guides on the English site", () => {
    useLocale.mockReturnValue({
      locale: "en",
      setLocale: vi.fn(),
    });

    render(<GuidesPageContent />);

    expect(
      screen.getByRole("heading", {
        name: /reading speed for real documents/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /fast reading without losing comprehension/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /lectura rapida para documentos reales/i,
      }),
    ).not.toBeInTheDocument();
  });
});

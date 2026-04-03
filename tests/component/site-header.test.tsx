/* eslint-disable @next/next/no-img-element */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/components/layout/site-header";

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

vi.mock("next/navigation", () => ({
  usePathname: () => "/reader",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
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

describe("SiteHeader", () => {
  function mockMatchMedia(matches: boolean) {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(true);
    useLocale.mockReturnValue({
      locale: "en",
      setLocale: vi.fn(),
    });
  });

  it("renders the full desktop header when the viewport is wide enough", async () => {
    useSupabaseAuth.mockReturnValue({
      signOut: vi.fn(),
      syncStatus: "idle",
      user: null,
    });

    render(<SiteHeader />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /reader/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/guest mode/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^menu$/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps language and theme controls visible outside the compact menu", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    useSupabaseAuth.mockReturnValue({
      signOut: vi.fn(),
      syncStatus: "idle",
      user: null,
    });

    render(<SiteHeader />);

    expect(screen.getByRole("button", { name: /^menu$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /language en/i }),
    ).toBeInTheDocument();
    expect(screen.getByTitle(/light/i)).toBeInTheDocument();
    expect(screen.getByTitle(/dark/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /reader/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^menu$/i }));

    expect(screen.getByRole("link", { name: /reader/i })).toBeInTheDocument();
    expect(screen.queryAllByTitle(/light/i)).toHaveLength(1);
    expect(screen.queryAllByTitle(/dark/i)).toHaveLength(1);
  });
});

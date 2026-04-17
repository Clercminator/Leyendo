import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogPageContent } from "@/components/catalog/catalog-page-content";

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

const { getSupabaseBrowserClient } = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient,
}));

const { listCatalogBooks } = vi.hoisted(() => ({
  listCatalogBooks: vi.fn(),
}));

vi.mock("@/lib/supabase/catalog", async () => {
  const actual = await vi.importActual("@/lib/supabase/catalog");

  return {
    ...actual,
    listCatalogBooks,
  };
});

describe("CatalogPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocale.mockReturnValue({
      locale: "en",
      setLocale: vi.fn(),
    });
  });

  it("shows the Max upgrade gate when the user cannot access the catalog", () => {
    useSupabaseAuth.mockReturnValue({
      isConfigured: true,
      profile: {
        planTier: "focus",
      },
      user: {
        id: "user-1",
      },
    });

    render(<CatalogPageContent />);

    expect(screen.getByText(/max required/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("renders catalog books for an active Max reader", async () => {
    getSupabaseBrowserClient.mockReturnValue({});
    listCatalogBooks.mockResolvedValue([
      {
        author: "David Clerc",
        createdAt: "2026-04-09T10:00:00.000Z",
        estimatedReadingMinutes: 42,
        excerpt: "A curated test title.",
        id: "book-1",
        payloadPath: "catalog/book-1.json",
        slug: "book-1",
        sourceKind: "pdf",
        title: "Test Catalog Book",
        totalChunks: 10,
        totalSections: 4,
        updatedAt: "2026-04-09T10:00:00.000Z",
      },
    ]);
    useSupabaseAuth.mockReturnValue({
      isConfigured: true,
      profile: {
        planTier: "max",
        subscriptionStatus: "active",
      },
      user: {
        id: "user-1",
      },
    });

    render(<CatalogPageContent />);

    await waitFor(() => {
      expect(screen.getByText(/test catalog book/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/42 min read/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open in reader/i }),
    ).toHaveAttribute("href", "/reader?document=catalog%3Abook-1");
  });

  it("sanitizes noisy titles and lets Max readers filter by topic and search", async () => {
    const user = userEvent.setup();

    getSupabaseBrowserClient.mockReturnValue({});
    listCatalogBooks.mockResolvedValue([
      {
        author: "David Clerc",
        createdAt: "2026-04-09T10:00:00.000Z",
        description: "Leadership strategy for managers and founders.",
        estimatedReadingMinutes: 120,
        excerpt: "Leadership strategy for managers and founders.",
        id: "book-1",
        payloadPath: "catalog/book-1.json",
        slug: "book-1",
        sourceKind: "pdf",
        title: "Leadership Manual ( PDFDrive )",
        totalChunks: 10,
        totalSections: 4,
        updatedAt: "2026-04-09T10:00:00.000Z",
      },
      {
        author: "Daniel Kahneman",
        createdAt: "2026-04-09T10:00:00.000Z",
        description: "Psychology, bias, and decision making.",
        estimatedReadingMinutes: 620,
        excerpt: "Psychology, bias, and decision making.",
        id: "book-2",
        payloadPath: "catalog/book-2.json",
        slug: "book-2",
        sourceKind: "pdf",
        title: "Thinking Fast and Slow",
        totalChunks: 14,
        totalSections: 7,
        updatedAt: "2026-04-09T10:00:00.000Z",
      },
    ]);
    useSupabaseAuth.mockReturnValue({
      isConfigured: true,
      profile: {
        planTier: "max",
        subscriptionStatus: "active",
      },
      user: {
        id: "user-1",
      },
    });

    render(<CatalogPageContent />);

    await waitFor(() => {
      expect(screen.getByText("Leadership Manual")).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/leadership manual \( pdfdrive \)/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mindset/i }));

    expect(screen.getByText(/thinking fast and slow/i)).toBeInTheDocument();
    expect(screen.queryByText("Leadership Manual")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/search the catalog/i), "kahneman");

    expect(screen.getByText(/thinking fast and slow/i)).toBeInTheDocument();
  });
});

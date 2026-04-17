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
    const user = userEvent.setup();

    getSupabaseBrowserClient.mockReturnValue({});
    listCatalogBooks.mockResolvedValue([
      {
        author: "Daniel Kahneman",
        createdAt: "2026-04-09T10:00:00.000Z",
        estimatedReadingMinutes: 864,
        excerpt: "A curated test title about decision making.",
        id: "book-1",
        payloadPath: "catalog/book-1.json",
        slug: "book-1",
        sourceKind: "pdf",
        title: "Thinking, Fast and Slow ( PDFDrive )",
        totalChunks: 10,
        totalSections: 4,
        updatedAt: "2026-04-09T10:00:00.000Z",
      },
      {
        author: "Peter Drucker",
        createdAt: "2026-04-08T10:00:00.000Z",
        estimatedReadingMinutes: 42,
        excerpt: "A practical leadership classic.",
        id: "book-2",
        payloadPath: "catalog/book-2.json",
        slug: "book-2",
        sourceKind: "pdf",
        title: "Five Important Questions",
        totalChunks: 8,
        totalSections: 3,
        updatedAt: "2026-04-08T10:00:00.000Z",
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
      expect(
        screen.getByText(/^Thinking, Fast and Slow$/i),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/pdfdrive/i)).not.toBeInTheDocument();
    expect(screen.getByText(/more than 6 hours/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /open in reader/i })[0],
    ).toHaveAttribute("href", "/reader?document=catalog%3Abook-1");

    await user.selectOptions(screen.getByLabelText(/category/i), "business");

    expect(screen.getByText(/five important questions/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/^Thinking, Fast and Slow$/i),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/reading time/i), "quick");

    expect(screen.getByText(/1 book visible/i)).toBeInTheDocument();
  });
});

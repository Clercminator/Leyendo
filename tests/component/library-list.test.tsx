import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LibraryList } from "@/components/library/library-list";
import type { DocumentRecord } from "@/types/document";

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
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

const {
  clearSessionForDocument,
  deleteDocumentAndRelatedData,
  getRecentBookmarks,
  getRecentDocuments,
  getRecentHighlights,
  getRecentSessions,
} = vi.hoisted(() => ({
  clearSessionForDocument: vi.fn(),
  deleteDocumentAndRelatedData: vi.fn(),
  getRecentBookmarks: vi.fn(),
  getRecentDocuments: vi.fn(),
  getRecentHighlights: vi.fn(),
  getRecentSessions: vi.fn(),
}));

vi.mock("@/db/repositories", () => ({
  clearSessionForDocument,
  deleteDocumentAndRelatedData,
  getRecentBookmarks,
  getRecentDocuments,
  getRecentHighlights,
  getRecentSessions,
}));

const documentRecord: DocumentRecord = {
  id: "doc-cleanup",
  title: "Cleanup Sample",
  sourceKind: "plain-text",
  excerpt: "A short document kept in local storage.",
  createdAt: "2026-03-26T00:00:00.000Z",
  updatedAt: "2026-03-26T00:00:00.000Z",
  totalChunks: 12,
  totalSections: 1,
};

describe("LibraryList cleanup actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears saved reading progress and refreshes the library state", async () => {
    getRecentDocuments
      .mockResolvedValueOnce([documentRecord])
      .mockResolvedValueOnce([documentRecord]);
    getRecentBookmarks.mockResolvedValue([]);
    getRecentHighlights.mockResolvedValue([]);
    getRecentSessions
      .mockResolvedValueOnce([
        {
          document: documentRecord,
          session: {
            id: "doc-cleanup:session",
            documentId: documentRecord.id,
            currentChunkIndex: 3,
            currentTokenIndex: 3,
            currentParagraphIndex: 0,
            currentSectionIndex: 0,
            percentComplete: 18,
            updatedAt: "2026-03-26T00:00:00.000Z",
          },
        },
      ])
      .mockResolvedValueOnce([]);

    render(<LibraryList />);

    const button = await screen.findByRole("button", {
      name: /clear progress for cleanup sample/i,
    });

    await userEvent.click(button);

    await waitFor(() => {
      expect(clearSessionForDocument).toHaveBeenCalledWith(documentRecord.id);
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /resume where you left off/i }),
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: /recent documents/i }),
    ).toBeInTheDocument();
  });

  it("removes a document and shows the empty library state after refresh", async () => {
    getRecentDocuments
      .mockResolvedValueOnce([documentRecord])
      .mockResolvedValueOnce([]);
    getRecentBookmarks.mockResolvedValue([]);
    getRecentHighlights.mockResolvedValue([]);
    getRecentSessions.mockResolvedValue([]);

    render(<LibraryList />);

    const button = await screen.findByRole("button", {
      name: /remove cleanup sample from this device/i,
    });

    await userEvent.click(button);

    await waitFor(() => {
      expect(deleteDocumentAndRelatedData).toHaveBeenCalledWith(
        documentRecord.id,
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          /import a pdf, docx, rtf, markdown file, or pasted text from the home page/i,
        ),
      ).toBeInTheDocument();
    });
  });
});

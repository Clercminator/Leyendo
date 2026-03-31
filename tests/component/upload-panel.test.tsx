import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UploadPanel } from "@/components/upload/upload-panel";
import type { DocumentSourceKind } from "@/types/document";

const { useSupabaseAuth } = vi.hoisted(() => ({
  useSupabaseAuth: vi.fn(),
}));

vi.mock("@/components/auth/supabase-provider", () => ({
  useSupabaseAuth,
}));

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

const { saveDocument, saveSession } = vi.hoisted(() => ({
  saveDocument: vi.fn(),
  saveSession: vi.fn(),
}));

vi.mock("@/db/repositories", () => ({
  saveDocument,
  saveSession,
}));

const { detectDocumentSourceKind, isLegacyWordDocument } = vi.hoisted(() => ({
  detectDocumentSourceKind: vi.fn(),
  isLegacyWordDocument: vi.fn(),
}));

vi.mock("@/features/ingest/detect/file-kind", () => ({
  detectDocumentSourceKind,
  isLegacyWordDocument,
}));

const { buildDocumentModelAsync, shouldOffloadDocumentBuild } = vi.hoisted(
  () => ({
    buildDocumentModelAsync: vi.fn(),
    shouldOffloadDocumentBuild: vi.fn(),
  }),
);

vi.mock("@/features/ingest/build/document-model-client", () => ({
  buildDocumentModelAsync,
  shouldOffloadDocumentBuild,
}));

vi.mock("@/features/ingest/build/document-model", () => ({
  toDocumentRecord: vi.fn((document) => ({
    ...document,
    excerpt: document.blocks?.[0]?.text ?? document.title,
    createdAt: "2026-03-27T00:00:00.000Z",
    updatedAt: "2026-03-27T00:00:00.000Z",
    totalChunks: document.chunks?.length ?? 0,
    totalSections: document.sections?.length ?? 0,
  })),
}));

const {
  extractDocumentFromFileAsync,
  isPdfTooLargeForBrowser,
  shouldOffloadPdfExtraction,
} = vi.hoisted(() => ({
  extractDocumentFromFileAsync: vi.fn(),
  isPdfTooLargeForBrowser: vi.fn(),
  shouldOffloadPdfExtraction: vi.fn(),
}));

vi.mock("@/features/ingest/extract/file-text-client", () => ({
  extractDocumentFromFileAsync,
  isPdfTooLargeForBrowser,
  MAX_BROWSER_PDF_BYTES: 150_000_000,
  shouldOffloadPdfExtraction,
}));

const { getSupabaseBrowserClient } = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient,
}));

const { ensureProfile, upsertCloudDocuments, upsertCloudSessions } = vi.hoisted(
  () => ({
    ensureProfile: vi.fn(),
    upsertCloudDocuments: vi.fn(),
    upsertCloudSessions: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/library-sync", () => ({
  ensureProfile,
  upsertCloudDocuments,
  upsertCloudSessions,
}));

function uploadFileInput() {
  return screen.getByLabelText(
    /choose a pdf, docx, rtf, markdown, or text file/i,
  );
}

describe("UploadPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSupabaseAuth.mockReturnValue({
      user: null,
    });
    getSupabaseBrowserClient.mockReturnValue(null);
    detectDocumentSourceKind.mockReturnValue(
      "plain-text" satisfies DocumentSourceKind,
    );
    isLegacyWordDocument.mockReturnValue(false);
    isPdfTooLargeForBrowser.mockReturnValue(false);
    shouldOffloadPdfExtraction.mockReturnValue(false);
    shouldOffloadDocumentBuild.mockReturnValue(false);
    extractDocumentFromFileAsync.mockResolvedValue({
      payload: {
        rawText: "Imported from file.",
        sourceKind: "plain-text" satisfies DocumentSourceKind,
        title: "Imported from file",
      },
      processingMode: "main-thread",
    });
  });

  it("syncs a signed-in import to Supabase so the document can reappear on another device", async () => {
    const user = userEvent.setup();
    const supabaseClient = { kind: "supabase" };

    useSupabaseAuth.mockReturnValue({
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });
    getSupabaseBrowserClient.mockReturnValue(supabaseClient);
    buildDocumentModelAsync.mockResolvedValue({
      document: {
        blocks: [{ text: "Imported from file." }],
        chunks: [{ index: 0 }],
        createdAt: "2026-03-27T00:00:00.000Z",
        excerpt: "Imported from file.",
        id: "doc-cloud-sync",
        sections: [{ index: 0 }],
        sourceKind: "plain-text" satisfies DocumentSourceKind,
        title: "Imported from file",
        updatedAt: "2026-03-27T00:00:00.000Z",
      },
    });

    render(<UploadPanel />);

    await user.type(
      screen.getByRole("textbox", { name: /^paste text$/i }),
      "Imported from file.",
    );

    await user.click(screen.getByRole("button", { name: /open in reader/i }));

    await waitFor(() => {
      expect(ensureProfile).toHaveBeenCalledWith(supabaseClient, "user-1");
    });

    expect(upsertCloudDocuments).toHaveBeenCalledWith(
      supabaseClient,
      "user-1",
      [
        expect.objectContaining({
          id: "doc-cloud-sync",
          ownerId: "user-1",
          syncState: "synced",
        }),
      ],
    );
    expect(upsertCloudSessions).toHaveBeenCalledWith(supabaseClient, "user-1", [
      expect.objectContaining({
        documentId: "doc-cloud-sync",
        ownerId: "user-1",
        syncState: "synced",
      }),
    ]);
    expect(push).toHaveBeenCalledWith("/reader?document=doc-cloud-sync");
  });

  it("shows a clear error for unsupported formats", async () => {
    const user = userEvent.setup({ applyAccept: false });

    detectDocumentSourceKind.mockReturnValue(null);

    render(<UploadPanel />);

    await user.click(screen.getByRole("radio", { name: /upload a document/i }));

    await user.upload(
      uploadFileInput(),
      new File(["zip"], "archive.zip", { type: "application/zip" }),
    );

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(/file format is not supported/i);
    expect(alert).toHaveTextContent(
      /legacy \.doc files need to be resaved as \.docx/i,
    );
  });

  it("shows an oversized PDF message before extraction starts", async () => {
    detectDocumentSourceKind.mockReturnValue(
      "pdf" satisfies DocumentSourceKind,
    );
    isPdfTooLargeForBrowser.mockReturnValue(true);

    const hugePdf = new File(["pdf"], "huge.pdf", {
      type: "application/pdf",
    });

    Object.defineProperty(hugePdf, "size", {
      configurable: true,
      value: 175_000_000,
    });

    render(<UploadPanel />);

    await userEvent.click(
      screen.getByRole("radio", { name: /upload a document/i }),
    );

    await userEvent.upload(uploadFileInput(), hugePdf);

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(/above the current upload limit/i);
    expect(within(alert).getByText(/150 mb/i)).toBeInTheDocument();
    expect(within(alert).getByText(/175 mb/i)).toBeInTheDocument();
  });

  it("shows processing feedback while a file is being read and a success state after", async () => {
    let resolveExtraction:
      | ((value: {
          payload: {
            rawText: string;
            sourceKind: DocumentSourceKind;
            title: string;
          };
          processingMode: "main-thread" | "worker";
        }) => void)
      | undefined;

    extractDocumentFromFileAsync.mockReturnValue(
      new Promise((resolve) => {
        resolveExtraction = resolve;
      }),
    );

    render(<UploadPanel />);

    await userEvent.click(
      screen.getByRole("radio", { name: /upload a document/i }),
    );

    await userEvent.upload(
      uploadFileInput(),
      new File(["Imported from file."], "sample.txt", { type: "text/plain" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /processing sample\.txt/i,
    );

    resolveExtraction?.({
      payload: {
        rawText: "Imported from file.",
        sourceKind: "plain-text",
        title: "Imported from file",
      },
      processingMode: "main-thread",
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /sample\.txt is ready/i,
      );
    });

    expect(
      screen.getByRole("button", { name: /open imported file/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit extracted text/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /replace file/i }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/extracted content preview/i)).toHaveValue(
      "Imported from file.",
    );
  });

  it("shows visible PDF formatting guidance after a PDF preview is extracted", async () => {
    detectDocumentSourceKind.mockReturnValue(
      "pdf" satisfies DocumentSourceKind,
    );
    extractDocumentFromFileAsync.mockResolvedValue({
      payload: {
        rawText: "Imported PDF text.",
        sourceKind: "pdf" satisfies DocumentSourceKind,
        title: "Imported PDF",
      },
      processingMode: "main-thread",
    });

    render(<UploadPanel />);

    await userEvent.click(
      screen.getByRole("radio", { name: /upload a document/i }),
    );

    await userEvent.upload(
      uploadFileInput(),
      new File(["Imported PDF text."], "sample.pdf", {
        type: "application/pdf",
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /sample\.pdf is ready/i,
      );
    });

    expect(
      screen.getByText(/pdfs work best when they have selectable text/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /pdf import keeps the reading text, not the exact page layout/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows an estimated wait while the first reader open is still being prepared", async () => {
    detectDocumentSourceKind.mockReturnValue(
      "pdf" satisfies DocumentSourceKind,
    );
    shouldOffloadDocumentBuild.mockReturnValue(true);
    extractDocumentFromFileAsync.mockResolvedValue({
      payload: {
        rawText: "Imported PDF text.".repeat(40_000),
        sourceKind: "pdf" satisfies DocumentSourceKind,
        title: "Imported PDF",
      },
      processingMode: "main-thread",
    });
    buildDocumentModelAsync.mockReturnValue(new Promise(() => {}));

    render(<UploadPanel />);

    await userEvent.click(
      screen.getByRole("radio", { name: /upload a document/i }),
    );

    await userEvent.upload(
      uploadFileInput(),
      new File(["Imported PDF text."], "sample.pdf", {
        type: "application/pdf",
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /sample\.pdf is ready/i,
      );
    });

    await userEvent.click(
      screen.getByRole("button", { name: /open imported file/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/estimated wait/i);
    });

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent(/preparing your document/i);
    expect(status).toHaveTextContent(/current step:/i);
    expect(status).toHaveTextContent(/elapsed:/i);
    expect(status).toHaveTextContent(/first open is the slowest part/i);
  });

  it("shows a targeted timeout message when reader preparation stalls after import", async () => {
    detectDocumentSourceKind.mockReturnValue(
      "pdf" satisfies DocumentSourceKind,
    );
    shouldOffloadDocumentBuild.mockReturnValue(true);
    extractDocumentFromFileAsync.mockResolvedValue({
      payload: {
        rawText: "Imported PDF text.",
        sourceKind: "pdf" satisfies DocumentSourceKind,
        title: "Imported PDF",
      },
      processingMode: "main-thread",
    });
    buildDocumentModelAsync.mockRejectedValue(
      new Error(
        "The PDF text was extracted, but preparing it for the reader is taking too long in this browser. This usually means the file is very long or the extracted layout is complex. Try a shorter PDF, remove appendix pages, or paste only the section you need.",
      ),
    );

    render(<UploadPanel />);

    await userEvent.click(
      screen.getByRole("radio", { name: /upload a document/i }),
    );

    await userEvent.upload(
      uploadFileInput(),
      new File(["Imported PDF text."], "sample.pdf", {
        type: "application/pdf",
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /sample\.pdf is ready/i,
      );
    });

    await userEvent.click(
      screen.getByRole("button", { name: /open imported file/i }),
    );

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(/reader preparation is taking too long/i);
    expect(alert).toHaveTextContent(/try a shorter pdf/i);
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpenGuideInReaderButton } from "@/components/guides/open-guide-in-reader-button";

const {
  buildInitialSession,
  getDocumentById,
  getSessionForDocument,
  push,
  saveDocument,
  saveSession,
} = vi.hoisted(() => ({
  buildInitialSession: vi.fn((document: { id: string }) => ({
    documentId: document.id,
    id: `${document.id}:session`,
  })),
  getDocumentById: vi.fn(),
  getSessionForDocument: vi.fn(),
  push: vi.fn(),
  saveDocument: vi.fn(),
  saveSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/db/repositories", () => ({
  buildInitialSession,
  getDocumentById,
  getSessionForDocument,
  saveDocument,
  saveSession,
}));

describe("OpenGuideInReaderButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocumentById.mockResolvedValue(undefined);
    getSessionForDocument.mockResolvedValue(undefined);
    saveDocument.mockResolvedValue(undefined);
    saveSession.mockResolvedValue(undefined);
  });

  it("creates a local guide document and opens the reader", async () => {
    const user = userEvent.setup();

    render(
      <OpenGuideInReaderButton
        guideSlug="velocidad-de-lectura-y-comprension"
        guideTitle="Velocidad de lectura y comprension lectora"
        guideMarkdown="# Velocidad de lectura y comprension lectora\n\nTexto de prueba."
        label="Leer esta guia en Leyendo"
        loadingLabel="Abriendo en Leyendo"
        errorLabel="No se pudo abrir"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /leer esta guia en leyendo/i }),
    );

    await waitFor(() => {
      expect(saveDocument).toHaveBeenCalledTimes(1);
    });

    expect(saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "guide:velocidad-de-lectura-y-comprension:v1",
        sourceKind: "markdown",
        title: "Velocidad de lectura y comprension lectora",
      }),
    );
    expect(buildInitialSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "guide:velocidad-de-lectura-y-comprension:v1",
      }),
    );
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "guide:velocidad-de-lectura-y-comprension:v1",
      }),
    );
    expect(push).toHaveBeenCalledWith(
      "/reader?document=guide:velocidad-de-lectura-y-comprension:v1",
    );
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackButton } from "@/components/feedback/feedback-button";

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
  isSupabaseConfigured: true,
}));

const { submitFeedback } = vi.hoisted(() => ({
  submitFeedback: vi.fn(),
}));

vi.mock("@/lib/supabase/library-sync", () => ({
  submitFeedback,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/reader",
}));

describe("FeedbackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseBrowserClient.mockReturnValue({});
    useSupabaseAuth.mockReturnValue({
      user: null,
    });
  });

  it("renders the feedback launcher and panel copy in Spanish", async () => {
    const user = userEvent.setup();

    useLocale.mockReturnValue({
      locale: "es",
      setLocale: vi.fn(),
    });

    render(<FeedbackButton />);

    await user.click(screen.getByRole("button", { name: /comentarios/i }));

    expect(screen.getByText("Dime que te frena.")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/un error, un momento torpe en el lector/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/correo opcional si quieres una respuesta/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enviar comentarios/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /enviar comentarios/i }),
    );

    expect(
      await screen.findByText(/escribe primero un mensaje corto\./i),
    ).toBeInTheDocument();
  });

  it("submits localized feedback copy in Portuguese", async () => {
    const user = userEvent.setup();
    submitFeedback.mockResolvedValue(undefined);
    useLocale.mockReturnValue({
      locale: "pt",
      setLocale: vi.fn(),
    });
    useSupabaseAuth.mockReturnValue({
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });

    render(<FeedbackButton />);

    await user.click(screen.getByRole("button", { name: /^feedback$/i }));
    await user.type(
      screen.getByPlaceholderText(/um erro, um momento ruim no leitor/i),
      "Algo esta lento.",
    );
    await user.click(screen.getByRole("button", { name: /enviar feedback/i }));

    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          email: undefined,
          message: "Algo esta lento.",
          route: "/reader",
          userId: "user-1",
        }),
      );
    });

    expect(
      await screen.findByText(/obrigado\. seu feedback foi enviado\./i),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(
        /email opcional se voce quiser uma resposta/i,
      ),
    ).not.toBeInTheDocument();
  });
});

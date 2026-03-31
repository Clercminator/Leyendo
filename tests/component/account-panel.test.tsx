import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountPanel } from "@/components/auth/account-panel";

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

describe("AccountPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocale.mockReturnValue({
      locale: "en",
      setLocale: vi.fn(),
    });
  });

  it("lets a signed-in user save a display name", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    useSupabaseAuth.mockReturnValue({
      errorMessage: undefined,
      guestLibrarySummary: {
        bookmarks: 0,
        documents: 1,
        highlights: 0,
        sessions: 0,
      },
      isConfigured: true,
      isLoading: false,
      isProfileSaving: false,
      lastSyncedAt: "2026-03-30T10:00:00.000Z",
      profile: undefined,
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "synced",
      syncWithCloud: vi.fn(),
      updateProfile,
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });

    render(<AccountPanel />);

    await user.type(screen.getByLabelText(/display name/i), "Lee Reader");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        displayName: "Lee Reader",
      });
    });

    expect(await screen.findByText(/profile updated\./i)).toBeInTheDocument();
  });

  it("spells out that synced documents can be reopened without uploading again", () => {
    useSupabaseAuth.mockReturnValue({
      errorMessage: undefined,
      guestLibrarySummary: {
        bookmarks: 2,
        documents: 0,
        highlights: 1,
        sessions: 1,
      },
      isConfigured: true,
      isLoading: false,
      isProfileSaving: false,
      lastSyncedAt: "2026-03-30T10:00:00.000Z",
      profile: {
        createdAt: "2026-03-30T10:00:00.000Z",
        displayName: "Lee Reader",
        updatedAt: "2026-03-30T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "synced",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });

    render(<AccountPanel />);

    expect(
      screen.getByText(
        /bookmarks and highlights return without uploading the same file again/i,
      ),
    ).toBeInTheDocument();
  });
});

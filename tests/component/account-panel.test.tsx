import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    const avatarFile = new File(["avatar"], "reader.heic", {
      type: "image/heic",
    });

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
      lastSyncSummary: undefined,
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

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Lee Reader" },
    });
    fireEvent.change(screen.getByLabelText(/country/i), {
      target: { value: "Spain" },
    });
    fireEvent.change(screen.getByLabelText(/occupation/i), {
      target: { value: "Student" },
    });
    fireEvent.change(screen.getByLabelText(/interests/i), {
      target: { value: "reading, productivity" },
    });
    await user.click(
      screen.getByRole("checkbox", {
        name: /personalized recommendations and future promotions/i,
      }),
    );
    await user.upload(screen.getByLabelText(/profile photo/i), avatarFile);
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        avatarFile,
        displayName: "Lee Reader",
        marketingConsent: true,
        personalInfo: {
          country: "Spain",
          interests: ["reading", "productivity"],
          occupation: "Student",
        },
        removeAvatar: false,
      });
    });

    expect(await screen.findByText(/profile updated\./i)).toBeInTheDocument();
  });

  it("shows the last sync result and keeps the manual sync action wired", async () => {
    const syncWithCloud = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    useSupabaseAuth.mockReturnValue({
      errorMessage: undefined,
      guestLibrarySummary: {
        bookmarks: 0,
        documents: 0,
        highlights: 0,
        sessions: 0,
      },
      isConfigured: true,
      isLoading: false,
      isProfileSaving: false,
      lastSyncedAt: "2026-04-05T10:00:00.000Z",
      lastSyncSummary: {
        bookmarks: 7,
        documents: 4,
        finishedAt: "2026-04-05T10:00:00.000Z",
        highlights: 5,
        sessions: 3,
        uploadedDocuments: 2,
      },
      profile: {
        createdAt: "2026-03-30T10:00:00.000Z",
        displayName: "Lee Reader",
        marketingConsent: false,
        updatedAt: "2026-04-05T10:00:00.000Z",
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
      syncWithCloud,
      updateProfile: vi.fn(),
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });

    render(<AccountPanel />);

    expect(screen.getByText(/last sync result/i)).toBeInTheDocument();
    expect(screen.getByText(/uploaded from this device/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => {
      expect(syncWithCloud).toHaveBeenCalledTimes(1);
    });
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
      lastSyncSummary: undefined,
      profile: {
        createdAt: "2026-03-30T10:00:00.000Z",
        displayName: "Lee Reader",
        marketingConsent: false,
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

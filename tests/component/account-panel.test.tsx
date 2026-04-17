import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountPanel } from "@/components/auth/account-panel";

const { useRouter } = vi.hoisted(() => ({
  useRouter: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter,
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

describe("AccountPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getSupabaseBrowserClient.mockReturnValue(null);
    useRouter.mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });
    useLocale.mockReturnValue({
      locale: "en",
      setLocale: vi.fn(),
    });
    window.history.replaceState({}, "", "/account");
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
      signInWithGitHub: vi.fn(),
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
        fileUploadCount: 4,
        marketingConsent: false,
        planTier: "focus",
        updatedAt: "2026-04-05T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
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
        fileUploadCount: 2,
        marketingConsent: false,
        planTier: "focus",
        updatedAt: "2026-03-30T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
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

  it("shows an explicit subscription linked confirmation and billing status after a paid checkout returns", () => {
    const renewalDate = "2026-04-20T12:00:00.000Z";
    const renewalLabel = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(renewalDate));

    useSupabaseAuth.mockReturnValue({
      errorMessage: undefined,
      guestLibrarySummary: {
        bookmarks: 1,
        documents: 0,
        highlights: 1,
        sessions: 1,
      },
      isConfigured: true,
      isLoading: false,
      isProfileSaving: false,
      lastSyncedAt: "2026-04-14T10:00:00.000Z",
      lastSyncSummary: undefined,
      profile: {
        createdAt: "2026-04-14T10:00:00.000Z",
        displayName: "Lee Reader",
        fileUploadCount: 2,
        marketingConsent: false,
        planTier: "focus",
        subscriptionExpiresAt: renewalDate,
        subscriptionStatus: "active",
        updatedAt: "2026-04-14T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
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

    render(<AccountPanel paidSignupPlan="focus" />);

    expect(screen.getByText(/subscription linked/i)).toBeInTheDocument();
    expect(
      screen.getByText(/focus is active on this account/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your focus subscription is now linked/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/subscription status/i)).toBeInTheDocument();
    expect(screen.getByText(/active plan/i)).toBeInTheDocument();
    expect(screen.getByText(/current status/i)).toBeInTheDocument();
    expect(screen.getByText(/renewal date/i)).toBeInTheDocument();
    expect(screen.getByText(/^Focus$/)).toBeInTheDocument();
    expect(screen.getByText(/^Active$/)).toBeInTheDocument();
    expect(screen.getByText(renewalLabel)).toBeInTheDocument();
  });

  it("shows exact activation steps for a paid checkout before the user signs in", () => {
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
      lastSyncedAt: undefined,
      lastSyncSummary: undefined,
      profile: undefined,
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "idle",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: null,
    });

    render(<AccountPanel paidSignupPlan="focus" />);

    expect(screen.getByText(/exact next steps/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /if you already had a leyendo account for the payment email/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /use the same email as the payment so leyendo can link/i,
      ),
    ).toBeInTheDocument();
  });

  it("sends a signed-in user back to pricing to resume checkout", async () => {
    const replace = vi.fn();

    useRouter.mockReturnValue({
      push: vi.fn(),
      replace,
    });
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
      lastSyncedAt: undefined,
      lastSyncSummary: undefined,
      profile: {
        createdAt: "2026-04-14T10:00:00.000Z",
        displayName: "Lee Reader",
        fileUploadCount: 0,
        marketingConsent: false,
        planTier: "basic",
        updatedAt: "2026-04-14T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "idle",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });

    render(
      <AccountPanel checkoutPlan="focus" checkoutProvider="mercadopago" />,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/pricing?checkout=focus&provider=mercadopago",
      );
    });
  });

  it("warns when the signed-in account does not match the new paid subscription yet", () => {
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
      lastSyncedAt: undefined,
      lastSyncSummary: undefined,
      profile: {
        createdAt: "2026-04-14T10:00:00.000Z",
        displayName: "Lee Reader",
        fileUploadCount: 0,
        marketingConsent: false,
        planTier: "basic",
        updatedAt: "2026-04-14T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "idle",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });

    render(<AccountPanel paidSignupPlan="focus" />);

    expect(screen.getByText(/one step left/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /this signed-in account is not linked to the new payment yet/i,
      ),
    ).toBeInTheDocument();
  });

  it("confirms MercadoPago returns for the signed-in payment account", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { confirmed: true },
      error: null,
    });
    const refreshProfile = vi.fn().mockResolvedValue(undefined);

    getSupabaseBrowserClient.mockReturnValue({
      functions: {
        invoke,
      },
    });
    window.history.replaceState(
      {},
      "",
      "/account?payment=success&plan=focus&provider=mercadopago&collection_id=155099861306",
    );
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
      lastSyncedAt: undefined,
      lastSyncSummary: undefined,
      profile: {
        createdAt: "2026-04-14T10:00:00.000Z",
        displayName: "Lee Reader",
        fileUploadCount: 0,
        marketingConsent: false,
        planTier: "basic",
        updatedAt: "2026-04-14T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile,
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "idle",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });

    render(
      <AccountPanel paidSignupPlan="focus" paidSignupProvider="mercadopago" />,
    );

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("mercado-pago-webhook", {
        body: {
          action: "confirm_return",
          paymentId: "155099861306",
          plan: "focus",
          subscriptionId: null,
        },
      });
    });

    await waitFor(() => {
      expect(refreshProfile).toHaveBeenCalledTimes(2);
    });

    expect(
      screen.getByText(/mercadopago payment confirmed/i),
    ).toBeInTheDocument();
  });

  it("uses the saved MercadoPago preapproval id when the return URL has no ids", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { confirmed: true },
      error: null,
    });
    const refreshProfile = vi.fn().mockResolvedValue(undefined);

    getSupabaseBrowserClient.mockReturnValue({
      functions: {
        invoke,
      },
    });
    window.localStorage.setItem(
      "leyendo_pending_checkout_subscription_id",
      "preapproval_focus_1",
    );
    window.history.replaceState(
      {},
      "",
      "/account?payment=success&plan=focus&provider=mercadopago",
    );
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
      lastSyncedAt: undefined,
      lastSyncSummary: undefined,
      profile: {
        createdAt: "2026-04-14T10:00:00.000Z",
        displayName: "Lee Reader",
        fileUploadCount: 0,
        marketingConsent: false,
        planTier: "basic",
        updatedAt: "2026-04-14T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile,
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "idle",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    });

    render(
      <AccountPanel paidSignupPlan="focus" paidSignupProvider="mercadopago" />,
    );

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("mercado-pago-webhook", {
        body: {
          action: "confirm_return",
          paymentId: null,
          plan: "focus",
          subscriptionId: "preapproval_focus_1",
        },
      });
    });

    await waitFor(() => {
      expect(
        window.localStorage.getItem("leyendo_pending_checkout_subscription_id"),
      ).toBeNull();
    });
  });

  it("lets a Focus user save a word to the dictionary", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
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
      lastSyncedAt: "2026-03-30T10:00:00.000Z",
      lastSyncSummary: undefined,
      profile: {
        createdAt: "2026-03-30T10:00:00.000Z",
        displayName: "Lee Reader",
        fileUploadCount: 2,
        marketingConsent: false,
        planTier: "focus",
        savedWords: [],
        updatedAt: "2026-03-30T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
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

    await user.type(screen.getByLabelText(/^word$/i), "serendipity");
    await user.type(
      screen.getByLabelText(/^meaning$/i),
      "A fortunate discovery by chance",
    );
    await user.type(
      screen.getByLabelText(/context or note/i),
      "Found while reading an essay.",
    );
    await user.click(screen.getByRole("button", { name: /save word/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        savedWords: [
          expect.objectContaining({
            meaning: "A fortunate discovery by chance",
            note: "Found while reading an essay.",
            word: "serendipity",
          }),
        ],
      });
    });

    expect(
      await screen.findByText(/word saved to your dictionary/i),
    ).toBeInTheDocument();
  });

  it("lets a paid user remove a saved word", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
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
      lastSyncedAt: "2026-03-30T10:00:00.000Z",
      lastSyncSummary: undefined,
      profile: {
        createdAt: "2026-03-30T10:00:00.000Z",
        displayName: "Lee Reader",
        fileUploadCount: 2,
        marketingConsent: false,
        planTier: "max",
        savedWords: [
          {
            createdAt: "2026-03-30T10:00:00.000Z",
            meaning: "A fortunate discovery by chance",
            note: "Found while reading an essay.",
            word: "serendipity",
          },
        ],
        updatedAt: "2026-03-30T10:00:00.000Z",
        userId: "user-1",
      },
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
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

    await user.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        savedWords: [],
      });
    });
  });

  it("offers GitHub auth and explains the email link flow", async () => {
    const signInWithGitHub = vi.fn().mockResolvedValue(undefined);
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
      lastSyncedAt: undefined,
      lastSyncSummary: undefined,
      profile: undefined,
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub,
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "idle",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: null,
    });

    render(<AccountPanel />);

    await user.click(
      screen.getByRole("button", { name: /continue with github/i }),
    );

    await waitFor(() => {
      expect(signInWithGitHub).toHaveBeenCalledWith(window.location.href);
    });

    await user.click(screen.getByRole("button", { name: /email link/i }));

    expect(
      screen.getByText(/we'll email you a one-time sign-in link\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send email sign-in link/i }),
    ).toBeInTheDocument();
  });

  it("lets users create a free Basic Reader account before choosing a paid plan", async () => {
    const signUp = vi.fn().mockResolvedValue(undefined);
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
      lastSyncedAt: undefined,
      lastSyncSummary: undefined,
      profile: undefined,
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp,
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "idle",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: null,
    });

    render(<AccountPanel />);

    await user.click(screen.getByRole("button", { name: /create account/i }));
    await user.type(screen.getByLabelText(/^email$/i), "reader@example.com");
    await user.type(screen.getByLabelText(/password/i), "hunter2-password");
    await user.click(
      screen.getAllByRole("button", { name: /create account/i })[1],
    );

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith(
        "reader@example.com",
        "hunter2-password",
        window.location.href,
      );
    });

    expect(
      screen.getByText(/basic reader account created\./i),
    ).toBeInTheDocument();
  });

  it("keeps the guest auth card compact without the old why sign in block", () => {
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
      lastSyncedAt: undefined,
      lastSyncSummary: undefined,
      profile: undefined,
      refreshProfile: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signInWithGitHub: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      syncLocalLibraryToCloud: vi.fn(),
      syncStatus: "idle",
      syncWithCloud: vi.fn(),
      updateProfile: vi.fn(),
      user: null,
    });

    render(<AccountPanel />);

    expect(screen.queryByText(/why sign in\?/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /create or sign in to your basic reader account\./i,
      }),
    ).not.toBeInTheDocument();
  });
});

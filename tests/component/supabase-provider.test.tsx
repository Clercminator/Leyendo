import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SupabaseProvider,
  useSupabaseAuth,
} from "@/components/auth/supabase-provider";

const {
  backUpLocalLibraryToCloud,
  clearSyncedLibraryForUser,
  deleteProfileAvatar,
  ensureProfile,
  getLocalOnlyLibrarySummary,
  getProfile,
  getSyncedLibrarySummary,
  hydrateCloudLibraryToLocal,
  syncCloudLibraryToLocalIncremental,
  uploadProfileAvatar,
  upsertProfile,
} = vi.hoisted(() => ({
  backUpLocalLibraryToCloud: vi.fn(),
  clearSyncedLibraryForUser: vi.fn(),
  deleteProfileAvatar: vi.fn(),
  ensureProfile: vi.fn(),
  getLocalOnlyLibrarySummary: vi.fn(),
  getProfile: vi.fn(),
  getSyncedLibrarySummary: vi.fn(),
  hydrateCloudLibraryToLocal: vi.fn(),
  syncCloudLibraryToLocalIncremental: vi.fn(),
  uploadProfileAvatar: vi.fn(),
  upsertProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/library-sync", () => ({
  backUpLocalLibraryToCloud,
  clearSyncedLibraryForUser,
  deleteProfileAvatar,
  ensureProfile,
  getLocalOnlyLibrarySummary,
  getProfile,
  getSyncedLibrarySummary,
  hydrateCloudLibraryToLocal,
  syncCloudLibraryToLocalIncremental,
  uploadProfileAvatar,
  upsertProfile,
}));

function SyncSummaryProbe() {
  const { lastSyncSummary } = useSupabaseAuth();

  return (
    <div>
      {lastSyncSummary
        ? `${lastSyncSummary.documents}-${lastSyncSummary.sessions}-${lastSyncSummary.uploadedDocuments}`
        : "none"}
    </div>
  );
}

function SyncStatusProbe() {
  const { isOnline, syncStatus } = useSupabaseAuth();

  return <div>{`${isOnline ? "online" : "offline"}:${syncStatus}`}</div>;
}

const { getSupabaseBrowserClient } = vi.hoisted(() => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient,
  isSupabaseConfigured: true,
}));

describe("SupabaseProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });

    ensureProfile.mockResolvedValue(undefined);
    getProfile.mockResolvedValue({
      createdAt: "2026-03-30T10:00:00.000Z",
      fileUploadCount: 0,
      marketingConsent: false,
      planTier: "focus",
      updatedAt: "2026-03-30T10:00:00.000Z",
      userId: "user-1",
    });
    getLocalOnlyLibrarySummary.mockResolvedValue({
      bookmarks: 0,
      documents: 2,
      highlights: 0,
      sessions: 0,
    });
    getSyncedLibrarySummary.mockResolvedValue({
      bookmarks: 0,
      documents: 0,
      highlights: 0,
      sessions: 0,
    });
    backUpLocalLibraryToCloud.mockResolvedValue({ backedUpDocuments: 2 });
    hydrateCloudLibraryToLocal.mockResolvedValue({
      bookmarks: 0,
      documents: 3,
      highlights: 0,
      sessions: 0,
    });
    syncCloudLibraryToLocalIncremental.mockResolvedValue({
      bookmarks: 0,
      documents: 3,
      highlights: 0,
      sessions: 0,
    });
    uploadProfileAvatar.mockResolvedValue("user-1/avatar.png");
    upsertProfile.mockResolvedValue(undefined);
    deleteProfileAvatar.mockResolvedValue(undefined);
    clearSyncedLibraryForUser.mockResolvedValue(undefined);
  });

  it("backs up local-only documents during sign-in sync even when the cloud already has documents", async () => {
    const unsubscribe = vi.fn();
    const supabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                email: "reader@example.com",
                id: "user-1",
              },
            },
          },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe,
            },
          },
        }),
      },
    };

    getSupabaseBrowserClient.mockReturnValue(supabaseClient);

    const { unmount } = render(
      <SupabaseProvider>
        <div>mounted</div>
      </SupabaseProvider>,
    );

    await waitFor(() => {
      expect(backUpLocalLibraryToCloud).toHaveBeenCalledWith(
        supabaseClient,
        "user-1",
      );
    });

    expect(hydrateCloudLibraryToLocal).toHaveBeenCalledWith(
      supabaseClient,
      "user-1",
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("publishes a sync summary after hydration finishes", async () => {
    const unsubscribe = vi.fn();
    const supabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                email: "reader@example.com",
                id: "user-1",
              },
            },
          },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe,
            },
          },
        }),
      },
    };

    hydrateCloudLibraryToLocal.mockResolvedValue({
      bookmarks: 7,
      documents: 4,
      highlights: 5,
      sessions: 3,
    });

    getSupabaseBrowserClient.mockReturnValue(supabaseClient);

    render(
      <SupabaseProvider>
        <SyncSummaryProbe />
      </SupabaseProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("4-3-2")).toBeInTheDocument();
    });
  });

  it("does not rerun cloud hydration when auth refreshes the same user session", async () => {
    const unsubscribe = vi.fn();
    let onAuthStateChange:
      | ((
          event: string,
          session: { user: { email: string; id: string } },
        ) => void)
      | undefined;
    const session = {
      user: {
        email: "reader@example.com",
        id: "user-1",
      },
    };
    const supabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session,
          },
        }),
        onAuthStateChange: vi.fn((callback) => {
          onAuthStateChange = callback;
          return {
            data: {
              subscription: {
                unsubscribe,
              },
            },
          };
        }),
      },
    };

    getSupabaseBrowserClient.mockReturnValue(supabaseClient);

    render(
      <SupabaseProvider>
        <div>mounted</div>
      </SupabaseProvider>,
    );

    await waitFor(() => {
      expect(hydrateCloudLibraryToLocal).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      onAuthStateChange?.("TOKEN_REFRESHED", session);
    });

    await waitFor(() => {
      expect(hydrateCloudLibraryToLocal).toHaveBeenCalledTimes(1);
    });

    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("uses incremental cloud hydration when synced local documents already exist", async () => {
    const unsubscribe = vi.fn();
    const supabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                email: "reader@example.com",
                id: "user-1",
              },
            },
          },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe,
            },
          },
        }),
      },
    };

    getSyncedLibrarySummary.mockResolvedValue({
      bookmarks: 2,
      documents: 1,
      highlights: 4,
      sessions: 1,
    });
    getSupabaseBrowserClient.mockReturnValue(supabaseClient);

    render(
      <SupabaseProvider>
        <div>mounted</div>
      </SupabaseProvider>,
    );

    await waitFor(() => {
      expect(syncCloudLibraryToLocalIncremental).toHaveBeenCalledWith(
        supabaseClient,
        "user-1",
      );
    });

    expect(hydrateCloudLibraryToLocal).not.toHaveBeenCalled();
  });

  it("waits offline and retries cloud sync when the browser reconnects", async () => {
    const unsubscribe = vi.fn();
    const supabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                email: "reader@example.com",
                id: "user-1",
              },
            },
          },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe,
            },
          },
        }),
      },
    };

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    getSupabaseBrowserClient.mockReturnValue(supabaseClient);

    render(
      <SupabaseProvider>
        <SyncStatusProbe />
      </SupabaseProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("offline:error")).toBeInTheDocument();
    });

    expect(backUpLocalLibraryToCloud).not.toHaveBeenCalled();

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(backUpLocalLibraryToCloud).toHaveBeenCalledWith(
        supabaseClient,
        "user-1",
      );
    });
  });
});

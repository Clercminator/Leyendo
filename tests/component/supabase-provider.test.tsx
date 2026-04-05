import { render, screen, waitFor } from "@testing-library/react";
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
  hydrateCloudLibraryToLocal,
  isRemoteLibraryEmpty,
  uploadProfileAvatar,
  upsertProfile,
} = vi.hoisted(() => ({
  backUpLocalLibraryToCloud: vi.fn(),
  clearSyncedLibraryForUser: vi.fn(),
  deleteProfileAvatar: vi.fn(),
  ensureProfile: vi.fn(),
  getLocalOnlyLibrarySummary: vi.fn(),
  getProfile: vi.fn(),
  hydrateCloudLibraryToLocal: vi.fn(),
  isRemoteLibraryEmpty: vi.fn(),
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
  hydrateCloudLibraryToLocal,
  isRemoteLibraryEmpty,
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

    ensureProfile.mockResolvedValue(undefined);
    getProfile.mockResolvedValue(undefined);
    getLocalOnlyLibrarySummary.mockResolvedValue({
      bookmarks: 0,
      documents: 2,
      highlights: 0,
      sessions: 0,
    });
    isRemoteLibraryEmpty.mockResolvedValue(false);
    backUpLocalLibraryToCloud.mockResolvedValue({ backedUpDocuments: 2 });
    hydrateCloudLibraryToLocal.mockResolvedValue({
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
});

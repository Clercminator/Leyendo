"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  backUpLocalLibraryToCloud,
  clearSyncedLibraryForUser,
  ensureProfile,
  getLocalOnlyLibrarySummary,
  hydrateCloudLibraryToLocal,
  isRemoteLibraryEmpty,
  type LocalLibrarySummary,
} from "@/lib/supabase/library-sync";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface SupabaseAuthContextValue {
  errorMessage?: string;
  guestLibrarySummary: LocalLibrarySummary;
  isConfigured: boolean;
  isLoading: boolean;
  lastSyncedAt?: string;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  syncLocalLibraryToCloud: () => Promise<number>;
  syncStatus: SyncStatus;
  syncWithCloud: () => Promise<void>;
  user: User | null;
}

const defaultGuestLibrarySummary: LocalLibrarySummary = {
  bookmarks: 0,
  documents: 0,
  highlights: 0,
  sessions: 0,
};

const defaultSupabaseAuthContext: SupabaseAuthContextValue = {
  guestLibrarySummary: defaultGuestLibrarySummary,
  isConfigured: isSupabaseConfigured,
  isLoading: false,
  session: null,
  signIn: async () => {
    throw new Error("SupabaseProvider is not mounted.");
  },
  signInWithGoogle: async () => {
    throw new Error("SupabaseProvider is not mounted.");
  },
  signInWithMagicLink: async () => {
    throw new Error("SupabaseProvider is not mounted.");
  },
  signOut: async () => {},
  signUp: async () => {
    throw new Error("SupabaseProvider is not mounted.");
  },
  syncLocalLibraryToCloud: async () => 0,
  syncStatus: "idle",
  syncWithCloud: async () => {},
  user: null,
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue>(
  defaultSupabaseAuthContext,
);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const currentUserIdRef = useRef<string | undefined>(undefined);
  const syncLockRef = useRef<Promise<void> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [guestLibrarySummary, setGuestLibrarySummary] =
    useState<LocalLibrarySummary>(defaultGuestLibrarySummary);

  const refreshGuestLibrarySummary = useCallback(async () => {
    const summary = await getLocalOnlyLibrarySummary();
    setGuestLibrarySummary(summary);
  }, []);

  const syncWithCloud = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const userId = currentUserIdRef.current;
    if (!userId) {
      await refreshGuestLibrarySummary();
      return;
    }

    if (syncLockRef.current) {
      return syncLockRef.current;
    }

    const syncPromise = (async () => {
      setSyncStatus("syncing");
      setErrorMessage(undefined);

      try {
        await ensureProfile(supabase, userId);
        const remoteEmpty = await isRemoteLibraryEmpty(supabase, userId);

        if (remoteEmpty) {
          await backUpLocalLibraryToCloud(supabase, userId);
        }

        await hydrateCloudLibraryToLocal(supabase, userId);
        setSyncStatus("synced");
        setLastSyncedAt(new Date().toISOString());
      } catch (error) {
        setSyncStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Cloud sync could not finish.",
        );
      } finally {
        await refreshGuestLibrarySummary();
        syncLockRef.current = null;
      }
    })();

    syncLockRef.current = syncPromise;
    return syncPromise;
  }, [refreshGuestLibrarySummary, supabase]);

  const syncLocalLibraryToCloud = useCallback(async () => {
    if (!supabase || !currentUserIdRef.current) {
      return 0;
    }

    setSyncStatus("syncing");
    setErrorMessage(undefined);

    try {
      const result = await backUpLocalLibraryToCloud(
        supabase,
        currentUserIdRef.current,
      );
      await hydrateCloudLibraryToLocal(supabase, currentUserIdRef.current);
      setSyncStatus("synced");
      setLastSyncedAt(new Date().toISOString());
      await refreshGuestLibrarySummary();
      return result.backedUpDocuments;
    } catch (error) {
      setSyncStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Backup could not finish.",
      );
      await refreshGuestLibrarySummary();
      return 0;
    }
  }, [refreshGuestLibrarySummary, supabase]);

  useEffect(() => {
    void refreshGuestLibrarySummary();
  }, [refreshGuestLibrarySummary]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) {
        return;
      }

      const nextSession = data.session ?? null;
      currentUserIdRef.current = nextSession?.user.id;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);

      if (nextSession?.user) {
        await syncWithCloud();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const previousUserId = currentUserIdRef.current;
      currentUserIdRef.current = nextSession?.user.id;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);

      if (nextSession?.user) {
        void syncWithCloud();
        return;
      }

      setSyncStatus("idle");
      setLastSyncedAt(undefined);
      if (previousUserId) {
        void clearSyncedLibraryForUser(previousUserId).then(() => {
          void refreshGuestLibrarySummary();
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshGuestLibrarySummary, supabase, syncWithCloud]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    },
    [supabase],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/account`,
      },
    });

    if (error) {
      throw error;
    }
  }, [supabase]);

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const previousUserId = currentUserIdRef.current;
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    if (previousUserId) {
      await clearSyncedLibraryForUser(previousUserId);
    }

    await refreshGuestLibrarySummary();
  }, [refreshGuestLibrarySummary, supabase]);

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      errorMessage,
      guestLibrarySummary,
      isConfigured: isSupabaseConfigured,
      isLoading,
      lastSyncedAt,
      session,
      signIn,
      signInWithGoogle,
      signInWithMagicLink,
      signOut,
      signUp,
      syncLocalLibraryToCloud,
      syncStatus,
      syncWithCloud,
      user,
    }),
    [
      errorMessage,
      guestLibrarySummary,
      isLoading,
      lastSyncedAt,
      session,
      signIn,
      signInWithGoogle,
      signInWithMagicLink,
      signOut,
      signUp,
      syncLocalLibraryToCloud,
      syncStatus,
      syncWithCloud,
      user,
    ],
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext);
}

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
import type { ReaderPreferences } from "@/types/reader";

import {
  backUpLocalLibraryToCloud,
  clearSyncedLibraryForUser,
  deleteProfileAvatar,
  ensureProfile,
  getProfile,
  getLocalOnlyLibrarySummary,
  hydrateCloudLibraryToLocal,
  isRemoteLibraryEmpty,
  type LocalLibrarySummary,
  type UserProfile,
  type UserPersonalInfo,
  uploadProfileAvatar,
  upsertProfile,
} from "@/lib/supabase/library-sync";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface CloudSyncSummary extends LocalLibrarySummary {
  finishedAt: string;
  uploadedDocuments: number;
}

interface ProfileUpdateInput {
  avatarFile?: File | null;
  displayName?: string;
  marketingConsent?: boolean;
  personalInfo?: UserPersonalInfo | null;
  removeAvatar?: boolean;
}

interface SupabaseAuthContextValue {
  errorMessage?: string;
  guestLibrarySummary: LocalLibrarySummary;
  isConfigured: boolean;
  isLoading: boolean;
  isProfileSaving: boolean;
  lastSyncedAt?: string;
  lastSyncSummary?: CloudSyncSummary;
  profile?: UserProfile;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  syncReaderPreferences: (preferences: ReaderPreferences) => Promise<void>;
  syncLocalLibraryToCloud: () => Promise<number>;
  syncStatus: SyncStatus;
  syncWithCloud: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
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
  isProfileSaving: false,
  session: null,
  lastSyncSummary: undefined,
  refreshProfile: async () => {},
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
  syncReaderPreferences: async () => {},
  syncLocalLibraryToCloud: async () => 0,
  syncStatus: "idle",
  syncWithCloud: async () => {},
  updateProfile: async () => {
    throw new Error("SupabaseProvider is not mounted.");
  },
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
  const [lastSyncSummary, setLastSyncSummary] = useState<CloudSyncSummary>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>();
  const [guestLibrarySummary, setGuestLibrarySummary] =
    useState<LocalLibrarySummary>(defaultGuestLibrarySummary);

  const refreshGuestLibrarySummary = useCallback(async () => {
    const summary = await getLocalOnlyLibrarySummary();
    setGuestLibrarySummary(summary);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      setProfile(undefined);
      return;
    }

    const userId = currentUserIdRef.current;
    if (!userId) {
      setProfile(undefined);
      return;
    }

    const nextProfile = await getProfile(supabase, userId);
    setProfile(nextProfile);
  }, [supabase]);

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
        setProfile(await getProfile(supabase, userId));
        const remoteEmpty = await isRemoteLibraryEmpty(supabase, userId);
        const localSummary = await getLocalOnlyLibrarySummary();
        let uploadedDocuments = 0;

        if (remoteEmpty || localSummary.documents > 0) {
          const backupResult = await backUpLocalLibraryToCloud(
            supabase,
            userId,
          );
          uploadedDocuments = backupResult.backedUpDocuments;
        }

        const hydratedSummary = await hydrateCloudLibraryToLocal(
          supabase,
          userId,
        );
        const finishedAt = new Date().toISOString();

        setSyncStatus("synced");
        setLastSyncedAt(finishedAt);
        setLastSyncSummary({
          ...hydratedSummary,
          finishedAt,
          uploadedDocuments,
        });
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

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput) => {
      if (!supabase || !currentUserIdRef.current) {
        throw new Error("You need to be signed in to update your profile.");
      }

      setIsProfileSaving(true);
      setErrorMessage(undefined);
      let uploadedAvatarPath: string | undefined;

      try {
        const currentUserId = currentUserIdRef.current;
        await ensureProfile(supabase, currentUserId);

        const currentProfile =
          profile ?? (await getProfile(supabase, currentUserId));
        const avatarUpdateNeeded =
          Boolean(input.avatarFile) || input.removeAvatar === true;
        const previousAvatarPath = currentProfile?.avatarPath;
        let nextAvatarPath: string | null | undefined = undefined;

        if (input.avatarFile) {
          uploadedAvatarPath = await uploadProfileAvatar(supabase, {
            file: input.avatarFile,
            userId: currentUserId,
          });
          nextAvatarPath = uploadedAvatarPath;
        } else if (input.removeAvatar) {
          nextAvatarPath = null;
        }

        const nextProfile = await upsertProfile(supabase, {
          ...(avatarUpdateNeeded ? { avatarPath: nextAvatarPath ?? null } : {}),
          displayName: input.displayName,
          marketingConsent: input.marketingConsent,
          personalInfo: input.personalInfo,
          userId: currentUserId,
        });

        if (
          input.avatarFile &&
          previousAvatarPath &&
          previousAvatarPath !== nextProfile.avatarPath
        ) {
          try {
            await deleteProfileAvatar(supabase, previousAvatarPath);
          } catch (error) {
            console.warn("previous profile avatar could not be removed", error);
          }
        }

        if (input.removeAvatar && previousAvatarPath) {
          try {
            await deleteProfileAvatar(supabase, previousAvatarPath);
          } catch (error) {
            console.warn("previous profile avatar could not be removed", error);
          }
        }

        setProfile(nextProfile);
      } catch (error) {
        if (typeof uploadedAvatarPath === "string") {
          try {
            await deleteProfileAvatar(supabase, uploadedAvatarPath);
          } catch (cleanupError) {
            console.warn(
              "new profile avatar could not be removed",
              cleanupError,
            );
          }
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Profile could not be updated.",
        );
        throw error;
      } finally {
        setIsProfileSaving(false);
      }
    },
    [supabase],
  );

  const syncReaderPreferences = useCallback(
    async (preferences: ReaderPreferences) => {
      if (!supabase || !currentUserIdRef.current) {
        return;
      }

      try {
        const nextProfile = await upsertProfile(supabase, {
          readerPreferences: preferences,
          userId: currentUserIdRef.current,
        });

        setProfile(nextProfile);
      } catch (error) {
        console.warn("reader preference sync failed", error);
      }
    },
    [supabase],
  );

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
      const hydratedSummary = await hydrateCloudLibraryToLocal(
        supabase,
        currentUserIdRef.current,
      );
      const finishedAt = new Date().toISOString();

      setSyncStatus("synced");
      setLastSyncedAt(finishedAt);
      setLastSyncSummary({
        ...hydratedSummary,
        finishedAt,
        uploadedDocuments: result.backedUpDocuments,
      });
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
      } else {
        setProfile(undefined);
        setLastSyncSummary(undefined);
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

      setProfile(undefined);
      setSyncStatus("idle");
      setLastSyncedAt(undefined);
      setLastSyncSummary(undefined);
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

    setProfile(undefined);
    setLastSyncSummary(undefined);
    await refreshGuestLibrarySummary();
  }, [refreshGuestLibrarySummary, supabase]);

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      errorMessage,
      guestLibrarySummary,
      isConfigured: isSupabaseConfigured,
      isLoading,
      isProfileSaving,
      lastSyncedAt,
      lastSyncSummary,
      profile,
      refreshProfile,
      session,
      signIn,
      signInWithGoogle,
      signInWithMagicLink,
      signOut,
      signUp,
      syncReaderPreferences,
      syncLocalLibraryToCloud,
      syncStatus,
      syncWithCloud,
      updateProfile,
      user,
    }),
    [
      errorMessage,
      guestLibrarySummary,
      isLoading,
      isProfileSaving,
      lastSyncedAt,
      lastSyncSummary,
      profile,
      refreshProfile,
      session,
      signIn,
      signInWithGoogle,
      signInWithMagicLink,
      signOut,
      signUp,
      syncReaderPreferences,
      syncLocalLibraryToCloud,
      syncStatus,
      syncWithCloud,
      updateProfile,
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

import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/db/app-db";
import {
  normalizePlanTier,
  normalizeSubscriptionStatus,
  type PlanTier,
  type SubscriptionStatus,
} from "@/lib/plans";
import {
  MAX_READER_WORDS_PER_MINUTE,
  MIN_READER_WORDS_PER_MINUTE,
  defaultReaderPreferences,
  readingGoals,
  readerModes,
  readerThemes,
  type ReaderPreferences,
} from "@/types/reader";

const PROFILES_TABLE = "profiles";
const PROFILE_AVATAR_BUCKET = "profile-avatars";
const GUEST_FILE_UPLOAD_COUNT_PREFERENCE_KEY = "guest-file-upload-count";

const supportedImageExtensions = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "ico",
  "jfif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "tif",
  "tiff",
  "webp",
]);

interface RemoteProfileRow {
  avatar_path: string | null;
  created_at: string;
  display_name: string | null;
  file_upload_count: number | null;
  marketing_consent: boolean | null;
  personal_info: unknown | null;
  plan_tier: string | null;
  reader_preferences: unknown | null;
  saved_words: unknown | null;
  subscription_expires_at: string | null;
  subscription_grace_until: string | null;
  subscription_started_at: string | null;
  subscription_status: string | null;
  updated_at: string;
  user_id: string;
}

export interface UserPersonalInfo {
  birthYear?: number;
  city?: string;
  country?: string;
  industry?: string;
  interests?: string[];
  occupation?: string;
  useCase?: string;
}

export interface UserSavedWord {
  createdAt: string;
  meaning?: string;
  note?: string;
  word: string;
}

export interface UserProfile {
  avatarPath?: string;
  avatarUrl?: string;
  createdAt: string;
  displayName?: string;
  fileUploadCount: number;
  marketingConsent: boolean;
  personalInfo?: UserPersonalInfo;
  planTier: PlanTier;
  readerPreferences?: ReaderPreferences;
  savedWords?: UserSavedWord[];
  subscriptionExpiresAt?: string;
  subscriptionGraceUntil?: string;
  subscriptionStartedAt?: string;
  subscriptionStatus?: SubscriptionStatus;
  updatedAt: string;
  userId: string;
}

function normalizeReaderPreferences(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const candidate = input as Partial<Record<keyof ReaderPreferences, unknown>>;
  const mode =
    typeof candidate.mode === "string" &&
    readerModes.includes(candidate.mode as (typeof readerModes)[number])
      ? (candidate.mode as ReaderPreferences["mode"])
      : defaultReaderPreferences.mode;
  const theme =
    typeof candidate.theme === "string" &&
    readerThemes.includes(candidate.theme as (typeof readerThemes)[number])
      ? (candidate.theme as ReaderPreferences["theme"])
      : defaultReaderPreferences.theme;
  const readingGoal =
    typeof candidate.readingGoal === "string" &&
    readingGoals.includes(
      candidate.readingGoal as (typeof readingGoals)[number],
    )
      ? (candidate.readingGoal as ReaderPreferences["readingGoal"])
      : undefined;
  const focusWindowRaw = Number(candidate.focusWindow);
  const focusWindow =
    focusWindowRaw === 1 ||
    focusWindowRaw === 2 ||
    focusWindowRaw === 3 ||
    focusWindowRaw === 4
      ? focusWindowRaw
      : defaultReaderPreferences.focusWindow;

  return {
    chunkSize:
      typeof candidate.chunkSize === "number" &&
      Number.isFinite(candidate.chunkSize)
        ? Math.max(1, Math.min(6, Math.round(candidate.chunkSize)))
        : defaultReaderPreferences.chunkSize,
    focusWindow,
    fontScale:
      typeof candidate.fontScale === "number" &&
      Number.isFinite(candidate.fontScale)
        ? Math.max(0.8, Math.min(1.8, Number(candidate.fontScale.toFixed(1))))
        : defaultReaderPreferences.fontScale,
    lineHeight:
      typeof candidate.lineHeight === "number" &&
      Number.isFinite(candidate.lineHeight)
        ? Math.max(1.2, Math.min(2.2, Number(candidate.lineHeight.toFixed(1))))
        : defaultReaderPreferences.lineHeight,
    mode,
    naturalPauses:
      typeof candidate.naturalPauses === "boolean"
        ? candidate.naturalPauses
        : defaultReaderPreferences.naturalPauses,
    readingGoal,
    reduceMotion:
      typeof candidate.reduceMotion === "boolean"
        ? candidate.reduceMotion
        : defaultReaderPreferences.reduceMotion,
    smartPacing:
      typeof candidate.smartPacing === "boolean"
        ? candidate.smartPacing
        : defaultReaderPreferences.smartPacing,
    theme,
    wordsPerMinute:
      typeof candidate.wordsPerMinute === "number" &&
      Number.isFinite(candidate.wordsPerMinute)
        ? Math.max(
            MIN_READER_WORDS_PER_MINUTE,
            Math.min(
              MAX_READER_WORDS_PER_MINUTE,
              Math.round(candidate.wordsPerMinute),
            ),
          )
        : defaultReaderPreferences.wordsPerMinute,
  } satisfies ReaderPreferences;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeNonNegativeInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeBirthYear(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const currentYear = new Date().getFullYear();
  const normalized = Math.round(value);
  if (normalized < 1900 || normalized > currentYear) {
    return undefined;
  }

  return normalized;
}

function normalizeInterestList(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const uniqueItems = Array.from(
    new Set(
      value
        .map((entry) => normalizeText(entry, 48))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).slice(0, 12);

  return uniqueItems.length > 0 ? uniqueItems : undefined;
}

function normalizePersonalInfo(input: unknown) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const candidate = input as Partial<Record<keyof UserPersonalInfo, unknown>>;
  const normalized = {
    birthYear: normalizeBirthYear(candidate.birthYear),
    city: normalizeText(candidate.city, 80),
    country: normalizeText(candidate.country, 80),
    industry: normalizeText(candidate.industry, 80),
    interests: normalizeInterestList(candidate.interests),
    occupation: normalizeText(candidate.occupation, 80),
    useCase: normalizeText(candidate.useCase, 240),
  } satisfies UserPersonalInfo;

  return Object.values(normalized).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== undefined;
  })
    ? normalized
    : undefined;
}

function normalizeSavedWords(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: UserSavedWord[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const candidate = entry as Partial<Record<keyof UserSavedWord, unknown>>;
    const word = normalizeText(candidate.word, 80);
    if (!word) {
      continue;
    }

    normalized.push({
      createdAt:
        typeof candidate.createdAt === "string" &&
        Number.isFinite(Date.parse(candidate.createdAt))
          ? new Date(candidate.createdAt).toISOString()
          : new Date().toISOString(),
      meaning: normalizeText(candidate.meaning, 240),
      note: normalizeText(candidate.note, 400),
      word,
    });

    if (normalized.length >= 500) {
      break;
    }
  }

  return normalized;
}

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === normalized.length - 1) {
    return undefined;
  }

  return normalized.slice(dotIndex + 1);
}

function isSupportedAvatarFile(file: File) {
  if (
    typeof file.type === "string" &&
    file.type.toLowerCase().startsWith("image/")
  ) {
    return true;
  }

  const extension = getFileExtension(file.name);
  return extension ? supportedImageExtensions.has(extension) : false;
}

function buildAvatarPath(userId: string, file: File) {
  const extension = getFileExtension(file.name) ?? "img";
  return `${userId}/avatar-${Date.now()}.${extension}`;
}

async function resolveAvatarUrl(
  supabase: SupabaseClient,
  avatarPath: string | undefined,
) {
  if (!avatarPath) {
    return undefined;
  }

  const { data, error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .createSignedUrl(avatarPath, 60 * 60);

  if (error) {
    console.warn("profile avatar URL could not be created", error);
    return undefined;
  }

  return data.signedUrl;
}

async function toUserProfile(
  supabase: SupabaseClient,
  row: RemoteProfileRow,
): Promise<UserProfile> {
  const avatarPath = normalizeText(row.avatar_path, 240);

  return {
    avatarPath,
    avatarUrl: await resolveAvatarUrl(supabase, avatarPath),
    createdAt: row.created_at,
    displayName: row.display_name ?? undefined,
    fileUploadCount: normalizeNonNegativeInteger(row.file_upload_count),
    marketingConsent: row.marketing_consent === true,
    personalInfo: normalizePersonalInfo(row.personal_info),
    planTier: normalizePlanTier(row.plan_tier),
    readerPreferences: normalizeReaderPreferences(row.reader_preferences),
    savedWords: normalizeSavedWords(row.saved_words),
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    subscriptionGraceUntil: row.subscription_grace_until ?? undefined,
    subscriptionStartedAt: row.subscription_started_at ?? undefined,
    subscriptionStatus: normalizeSubscriptionStatus(row.subscription_status),
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

async function fetchCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

async function fetchCurrentUserId(supabase: SupabaseClient) {
  const user = await fetchCurrentUser(supabase);
  return user?.id;
}

export async function ensureProfile(supabase: SupabaseClient, userId?: string) {
  const currentUser = await fetchCurrentUser(supabase);
  const currentUserId = userId ?? currentUser?.id;

  if (!currentUserId) {
    return;
  }

  const metadataPlanTier = normalizePlanTier(
    currentUser?.user_metadata?.plan_tier,
  );
  const metadataSubscriptionStatus = normalizeSubscriptionStatus(
    currentUser?.user_metadata?.subscription_status,
  );
  const metadataSubscriptionStartedAt =
    typeof currentUser?.user_metadata?.subscription_started_at === "string"
      ? currentUser.user_metadata.subscription_started_at
      : undefined;
  const profileSeed = {
    ...(metadataPlanTier !== "basic" ? { plan_tier: metadataPlanTier } : {}),
    ...(metadataSubscriptionStatus
      ? { subscription_status: metadataSubscriptionStatus }
      : {}),
    ...(metadataSubscriptionStartedAt
      ? { subscription_started_at: metadataSubscriptionStartedAt }
      : {}),
    updated_at: new Date().toISOString(),
    user_id: currentUserId,
  };

  const rpcResult = await supabase.rpc("ensure_my_profile");
  if (rpcResult.error) {
    await supabase.from(PROFILES_TABLE).upsert(
      {
        updated_at: new Date().toISOString(),
        user_id: currentUserId,
      },
      {
        onConflict: "user_id",
      },
    );
  }

  const reconcileResult = await supabase.rpc(
    "reconcile_my_billing_subscriptions",
  );
  if (reconcileResult.error) {
    console.warn("billing reconciliation could not run", reconcileResult.error);
  }

  if (metadataPlanTier === "basic") {
    return;
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from(PROFILES_TABLE)
    .select("plan_tier, subscription_status, subscription_started_at")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  const shouldSeedMetadata =
    normalizePlanTier(existingProfile?.plan_tier) === "basic" &&
    !normalizeSubscriptionStatus(existingProfile?.subscription_status) &&
    !existingProfile?.subscription_started_at;

  if (!shouldSeedMetadata) {
    return;
  }

  await supabase.from(PROFILES_TABLE).upsert(profileSeed, {
    onConflict: "user_id",
  });
}

export async function getProfile(supabase: SupabaseClient, userId?: string) {
  const currentUserId = userId ?? (await fetchCurrentUserId(supabase));

  if (!currentUserId) {
    return undefined;
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("*")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toUserProfile(supabase, data as RemoteProfileRow) : undefined;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  input: {
    avatarPath?: string | null;
    displayName?: string;
    fileUploadCount?: number;
    marketingConsent?: boolean;
    personalInfo?: UserPersonalInfo | null;
    planTier?: PlanTier;
    readerPreferences?: ReaderPreferences;
    savedWords?: UserSavedWord[] | null;
    subscriptionExpiresAt?: string | null;
    subscriptionGraceUntil?: string | null;
    subscriptionStartedAt?: string | null;
    subscriptionStatus?: SubscriptionStatus | null;
    userId?: string;
  },
) {
  const currentUserId = input.userId ?? (await fetchCurrentUserId(supabase));

  if (!currentUserId) {
    throw new Error("Authentication required.");
  }

  await ensureProfile(supabase, currentUserId);

  const normalizedDisplayName = input.displayName?.trim();
  const updates: {
    avatar_path?: string | null;
    display_name?: string | null;
    file_upload_count?: number;
    marketing_consent?: boolean;
    personal_info?: UserPersonalInfo | null;
    plan_tier?: PlanTier;
    reader_preferences?: ReaderPreferences | null;
    saved_words?: UserSavedWord[];
    subscription_expires_at?: string | null;
    subscription_grace_until?: string | null;
    subscription_started_at?: string | null;
    subscription_status?: SubscriptionStatus | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if ("avatarPath" in input) {
    updates.avatar_path = input.avatarPath ?? null;
  }

  if ("displayName" in input) {
    updates.display_name = normalizedDisplayName ? normalizedDisplayName : null;
  }

  if ("fileUploadCount" in input) {
    updates.file_upload_count = normalizeNonNegativeInteger(
      input.fileUploadCount,
    );
  }

  if ("marketingConsent" in input) {
    updates.marketing_consent = input.marketingConsent === true;
  }

  if ("personalInfo" in input) {
    updates.personal_info = input.personalInfo ?? null;
  }

  if ("planTier" in input) {
    updates.plan_tier = normalizePlanTier(input.planTier);
  }

  if ("readerPreferences" in input) {
    updates.reader_preferences = input.readerPreferences ?? null;
  }

  if ("savedWords" in input) {
    updates.saved_words = normalizeSavedWords(input.savedWords ?? []);
  }

  if ("subscriptionExpiresAt" in input) {
    updates.subscription_expires_at = input.subscriptionExpiresAt ?? null;
  }

  if ("subscriptionGraceUntil" in input) {
    updates.subscription_grace_until = input.subscriptionGraceUntil ?? null;
  }

  if ("subscriptionStartedAt" in input) {
    updates.subscription_started_at = input.subscriptionStartedAt ?? null;
  }

  if ("subscriptionStatus" in input) {
    updates.subscription_status =
      normalizeSubscriptionStatus(input.subscriptionStatus) ?? null;
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .update(updates)
    .eq("user_id", currentUserId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toUserProfile(supabase, data as RemoteProfileRow);
}

export async function incrementProfileFileUploadCount(
  supabase: SupabaseClient,
  userId?: string,
) {
  const currentUserId = userId ?? (await fetchCurrentUserId(supabase));

  if (!currentUserId) {
    throw new Error("Authentication required.");
  }

  await ensureProfile(supabase, currentUserId);
  const currentProfile = await getProfile(supabase, currentUserId);

  return upsertProfile(supabase, {
    fileUploadCount: (currentProfile?.fileUploadCount ?? 0) + 1,
    userId: currentUserId,
  });
}

export async function getGuestFileUploadCount() {
  const record = await db.preferences.get(
    GUEST_FILE_UPLOAD_COUNT_PREFERENCE_KEY,
  );
  return normalizeNonNegativeInteger(record?.value);
}

export async function incrementGuestFileUploadCount() {
  const nextCount = (await getGuestFileUploadCount()) + 1;

  await db.preferences.put({
    key: GUEST_FILE_UPLOAD_COUNT_PREFERENCE_KEY,
    value: nextCount,
  });

  return nextCount;
}

export async function deleteProfileAvatar(
  supabase: SupabaseClient,
  avatarPath: string | undefined,
) {
  if (!avatarPath) {
    return;
  }

  const { error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .remove([avatarPath]);

  if (error) {
    throw error;
  }
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  input: {
    file: File;
    userId?: string;
  },
) {
  const currentUserId = input.userId ?? (await fetchCurrentUserId(supabase));

  if (!currentUserId) {
    throw new Error("Authentication required.");
  }

  if (!isSupportedAvatarFile(input.file)) {
    throw new Error("Please choose an image file.");
  }

  const avatarPath = buildAvatarPath(currentUserId, input.file);
  const { error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(avatarPath, input.file, {
      cacheControl: "3600",
      contentType: input.file.type || undefined,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return avatarPath;
}
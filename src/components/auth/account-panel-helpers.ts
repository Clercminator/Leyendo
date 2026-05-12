import type { AppLocale } from "@/lib/locale";
import type { SubscriptionStatus } from "@/lib/plans";
import type {
  UserPersonalInfo,
  UserSavedWord,
} from "@/lib/supabase/profile";

export const modes = ["sign-in", "create-account", "magic-link"] as const;
export const avatarAccept =
  "image/*,.avif,.bmp,.gif,.heic,.heif,.ico,.jfif,.jpeg,.jpg,.png,.svg,.tif,.tiff,.webp";

export type AuthMode = (typeof modes)[number];

export interface ProfileFormState {
  birthYear: string;
  city: string;
  country: string;
  displayName: string;
  industry: string;
  interests: string;
  marketingConsent: boolean;
  occupation: string;
  useCase: string;
}

export interface DictionaryFormState {
  meaning: string;
  note: string;
  word: string;
}

export function createEmptyDictionaryFormState(): DictionaryFormState {
  return {
    meaning: "",
    note: "",
    word: "",
  };
}

function decodeSearchValue(rawValue: string) {
  try {
    return decodeURIComponent(rawValue.replace(/\+/g, "%20"));
  } catch {
    return rawValue;
  }
}

export function getReturnUrlParam(
  currentUrl: URL | null,
  rawHref: string | null,
  keys: string[],
) {
  for (const key of keys) {
    const directValue = currentUrl?.searchParams.get(key)?.trim();
    if (directValue) {
      return directValue;
    }

    if (!rawHref) {
      continue;
    }

    const match = rawHref.match(new RegExp(`[?&]${key}=([^&#]+)`, "i"));
    const fallbackValue = match?.[1]?.trim();
    if (fallbackValue) {
      return decodeSearchValue(fallbackValue);
    }
  }

  return null;
}

export function formatDate(
  date: string | undefined,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!date) {
    return undefined;
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(parsedDate);
}

export function getSubscriptionStatusLabel(
  locale: AppLocale,
  status: SubscriptionStatus,
) {
  switch (status) {
    case "active":
      return locale === "en" ? "Active" : locale === "es" ? "Activa" : "Ativa";
    case "trialing":
      return locale === "en"
        ? "Trialing"
        : locale === "es"
          ? "En prueba"
          : "Em teste";
    case "pending":
      return locale === "en"
        ? "Pending"
        : locale === "es"
          ? "Pendiente"
          : "Pendente";
    case "grace_period":
      return locale === "en"
        ? "Grace period"
        : locale === "es"
          ? "Periodo de gracia"
          : "Periodo de graca";
    case "past_due":
      return locale === "en"
        ? "Past due"
        : locale === "es"
          ? "Cobro pendiente"
          : "Cobranca pendente";
    case "canceled":
      return locale === "en"
        ? "Canceled"
        : locale === "es"
          ? "Cancelada"
          : "Cancelada";
    case "expired":
      return locale === "en"
        ? "Expired"
        : locale === "es"
          ? "Expirada"
          : "Expirada";
    case "inactive":
      return locale === "en"
        ? "Inactive"
        : locale === "es"
          ? "Inactiva"
          : "Inativa";
  }
}

export function getSubscriptionDateLabel(
  locale: AppLocale,
  status: SubscriptionStatus,
) {
  if (status === "grace_period") {
    return locale === "en"
      ? "Grace period ends"
      : locale === "es"
        ? "Fin de la gracia"
        : "Fim da graca";
  }

  if (status === "canceled") {
    return locale === "en"
      ? "Access until"
      : locale === "es"
        ? "Acceso hasta"
        : "Acesso ate";
  }

  if (status === "expired" || status === "inactive") {
    return locale === "en"
      ? "Ended on"
      : locale === "es"
        ? "Termino el"
        : "Terminou em";
  }

  return locale === "en"
    ? "Renewal date"
    : locale === "es"
      ? "Fecha de renovacion"
      : "Data de renovacao";
}

export function buildProfileFormState(profile?: {
  displayName?: string;
  marketingConsent?: boolean;
  personalInfo?: UserPersonalInfo;
}): ProfileFormState {
  return {
    birthYear: profile?.personalInfo?.birthYear?.toString() ?? "",
    city: profile?.personalInfo?.city ?? "",
    country: profile?.personalInfo?.country ?? "",
    displayName: profile?.displayName ?? "",
    industry: profile?.personalInfo?.industry ?? "",
    interests: profile?.personalInfo?.interests?.join(", ") ?? "",
    marketingConsent: profile?.marketingConsent ?? false,
    occupation: profile?.personalInfo?.occupation ?? "",
    useCase: profile?.personalInfo?.useCase ?? "",
  };
}

export function normalizeTextInput(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeSavedWordKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

function normalizeBirthYearInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(parsed) || parsed < 1900 || parsed > currentYear) {
    return undefined;
  }

  return parsed;
}

function normalizeInterests(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

export function buildPersonalInfoFromForm(form: ProfileFormState) {
  const interests = normalizeInterests(form.interests);
  const normalized = {
    birthYear: normalizeBirthYearInput(form.birthYear),
    city: normalizeTextInput(form.city),
    country: normalizeTextInput(form.country),
    industry: normalizeTextInput(form.industry),
    interests: interests.length > 0 ? interests : undefined,
    occupation: normalizeTextInput(form.occupation),
    useCase: normalizeTextInput(form.useCase),
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

function isSameList(left?: string[], right?: string[]) {
  if (!left?.length && !right?.length) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) => entry === right[index]);
}

export function isSamePersonalInfo(
  left: UserPersonalInfo | undefined,
  right: UserPersonalInfo | undefined,
) {
  return (
    left?.birthYear === right?.birthYear &&
    left?.city === right?.city &&
    left?.country === right?.country &&
    left?.industry === right?.industry &&
    left?.occupation === right?.occupation &&
    left?.useCase === right?.useCase &&
    isSameList(left?.interests, right?.interests)
  );
}

export function getAvatarInitials(value: string | undefined) {
  const fallback = (value ?? "Leyendo").trim();
  if (!fallback) {
    return "LY";
  }

  const parts = fallback.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part.slice(0, 1).toUpperCase()).join("");

  return initials || fallback.slice(0, 2).toUpperCase();
}

export function buildSavedWordFromForm(
  form: DictionaryFormState,
  existingEntry?: UserSavedWord,
) {
  const word = normalizeTextInput(form.word);
  if (!word) {
    return undefined;
  }

  return {
    createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
    meaning: normalizeTextInput(form.meaning),
    note: normalizeTextInput(form.note),
    word,
  } satisfies UserSavedWord;
}
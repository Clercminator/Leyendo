export const appLocales = ["en", "es", "pt"] as const;

export type AppLocale = (typeof appLocales)[number];

export type LocalizedCopy = Record<AppLocale, string>;

export const defaultLocale: AppLocale = "en";

function isSupportedLocale(value: string): value is AppLocale {
  return appLocales.includes(value as AppLocale);
}

export function resolvePreferredLocale(
  localeCandidates: readonly string[] | null | undefined,
): AppLocale {
  if (!localeCandidates) {
    return defaultLocale;
  }

  for (const candidate of localeCandidates) {
    const normalizedCandidate = candidate.toLowerCase();

    if (isSupportedLocale(normalizedCandidate)) {
      return normalizedCandidate;
    }

    const [languageCode] = normalizedCandidate.split("-");

    if (languageCode && isSupportedLocale(languageCode)) {
      return languageCode;
    }
  }

  return defaultLocale;
}

export function getLocalizedCopy(locale: AppLocale, copy: LocalizedCopy) {
  return copy[locale] ?? copy.en;
}

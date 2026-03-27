export const appLocales = ["en", "es", "pt"] as const;

export type AppLocale = (typeof appLocales)[number];

export type LocalizedCopy = Record<AppLocale, string>;

export const defaultLocale: AppLocale = "en";

export function getLocalizedCopy(locale: AppLocale, copy: LocalizedCopy) {
  return copy[locale] ?? copy.en;
}

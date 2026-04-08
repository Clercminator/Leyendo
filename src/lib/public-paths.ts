import type { AppLocale } from "@/lib/locale";

const publicRouteSet = new Set(["/", "/about", "/guides", "/pricing", "/privacy"]);

export const translatedPublicLocales = ["es", "pt"] as const;

export function isTranslatedPublicLocale(value: string): value is (typeof translatedPublicLocales)[number] {
  return translatedPublicLocales.includes(
    value as (typeof translatedPublicLocales)[number],
  );
}

export function getLocalizedPublicPath(path: string, locale: AppLocale) {
  const normalizedPath = path === "" ? "/" : path;

  if (locale === "en") {
    return normalizedPath;
  }

  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function getPublicLanguageAlternates(path: string) {
  return {
    en: getLocalizedPublicPath(path, "en"),
    es: getLocalizedPublicPath(path, "es"),
    pt: getLocalizedPublicPath(path, "pt"),
    "x-default": getLocalizedPublicPath(path, "en"),
  };
}

export function isPublicGuidePath(pathname: string) {
  return /^\/guides\/[^/]+$/.test(pathname);
}

export function isPublicMarketingPath(pathname: string) {
  return publicRouteSet.has(pathname) || isPublicGuidePath(pathname);
}

export function stripPublicLocalePrefix(pathname: string) {
  for (const locale of translatedPublicLocales) {
    if (pathname === `/${locale}`) {
      return {
        locale,
        pathname: "/",
      };
    }

    if (pathname.startsWith(`/${locale}/`)) {
      return {
        locale,
        pathname: pathname.slice(locale.length + 1),
      };
    }
  }

  return {
    locale: "en" as const,
    pathname,
  };
}

export function getLocaleSwitchPath(pathname: string, targetLocale: AppLocale) {
  const { pathname: unlocalizedPath } = stripPublicLocalePrefix(pathname);

  if (!isPublicMarketingPath(unlocalizedPath)) {
    return null;
  }

  if (isPublicGuidePath(unlocalizedPath)) {
    return getLocalizedPublicPath("/guides", targetLocale);
  }

  return getLocalizedPublicPath(unlocalizedPath, targetLocale);
}

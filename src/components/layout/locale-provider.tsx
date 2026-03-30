"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { appLocales, defaultLocale, type AppLocale } from "@/lib/locale";

const STORAGE_KEY = "lee-locale";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function isAppLocale(value: string): value is AppLocale {
  return appLocales.includes(value as AppLocale);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    if (typeof window === "undefined") {
      return defaultLocale;
    }

    const storedLocale = window.localStorage.getItem(STORAGE_KEY);

    if (storedLocale && isAppLocale(storedLocale)) {
      return storedLocale;
    }

    return defaultLocale;
  });

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        window.localStorage.setItem(STORAGE_KEY, nextLocale);
      },
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider.");
  }

  return context;
}

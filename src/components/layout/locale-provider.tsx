"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  appLocales,
  defaultLocale,
  resolvePreferredLocale,
  type AppLocale,
} from "@/lib/locale";

const STORAGE_KEY = "lee-locale";
const localeListeners = new Set<() => void>();

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function isAppLocale(value: string): value is AppLocale {
  return appLocales.includes(value as AppLocale);
}

function getBrowserLocale() {
  return resolvePreferredLocale(
    navigator.languages.length > 0 ? navigator.languages : [navigator.language],
  );
}

function getCurrentLocale() {
  const storedLocale = window.localStorage.getItem(STORAGE_KEY);

  if (storedLocale && isAppLocale(storedLocale)) {
    return storedLocale;
  }

  return getBrowserLocale();
}

function subscribeToLocale(callback: () => void) {
  localeListeners.add(callback);

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    localeListeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function emitLocaleChange() {
  for (const listener of localeListeners) {
    listener();
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getCurrentLocale,
    () => defaultLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        window.localStorage.setItem(STORAGE_KEY, nextLocale);
        emitLocaleChange();
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

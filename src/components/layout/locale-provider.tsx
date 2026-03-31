"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { appLocales, defaultLocale, type AppLocale } from "@/lib/locale";

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

function getStoredLocale() {
  const storedLocale = window.localStorage.getItem(STORAGE_KEY);

  if (storedLocale && isAppLocale(storedLocale)) {
    return storedLocale;
  }

  return defaultLocale;
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
    getStoredLocale,
    () => defaultLocale,
  );

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

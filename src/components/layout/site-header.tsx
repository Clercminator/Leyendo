"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  BookOpenText,
  Check,
  ChevronDown,
  Cloud,
  LibraryBig,
  Languages,
  MoonStar,
  ShieldCheck,
  SunMedium,
} from "lucide-react";
import { useTheme } from "next-themes";

import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy, type LocalizedCopy } from "@/lib/locale";

const links = [
  {
    href: "/reader",
    label: { en: "Reader", es: "Lector", pt: "Leitor" },
    icon: BookOpenText,
  },
  {
    href: "/library",
    label: { en: "Library", es: "Biblioteca", pt: "Biblioteca" },
    icon: LibraryBig,
  },
  {
    href: "/privacy",
    label: { en: "Privacy", es: "Privacidad", pt: "Privacidade" },
    icon: ShieldCheck,
  },
  {
    href: "/account",
    label: { en: "Account", es: "Cuenta", pt: "Conta" },
    icon: Cloud,
  },
] as const;

const brandLabel: LocalizedCopy = {
  en: "Read faster, stay in control.",
  es: "Lee mas rapido y manten el control.",
  pt: "Leia mais rapido e mantenha o controle.",
};

const themeLabels = {
  light: { en: "Light", es: "Claro", pt: "Claro" },
  dark: { en: "Dark", es: "Oscuro", pt: "Escuro" },
} as const;

const localeMenuLabel: LocalizedCopy = {
  en: "Language",
  es: "Idioma",
  pt: "Idioma",
};

const localeOptions = {
  en: { short: "EN", name: "English" },
  es: { short: "ES", name: "Espanol" },
  pt: { short: "PT", name: "Portugues" },
} as const;

function controlButtonClass(isActive: boolean) {
  return [
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition",
    isActive
      ? "bg-(--text-strong) text-(--text-on-accent) shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
      : "text-(--text-muted) hover:bg-(--surface-chip) hover:text-(--text-strong)",
  ].join(" ");
}

export function SiteHeader() {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const { signOut, syncStatus, user } = useSupabaseAuth();
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const localeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLocaleMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!localeMenuRef.current?.contains(event.target as Node)) {
        setIsLocaleMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLocaleMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocaleMenuOpen]);

  const activeTheme = resolvedTheme === "light" ? "light" : "dark";

  const localizedLinks = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        label: getLocalizedCopy(locale, link.label),
      })),
    [locale],
  );

  return (
    <header className="sticky top-0 z-90 border-b border-(--border-soft) bg-(--surface-overlay) shadow-[0_14px_40px_rgba(8,12,22,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-(--border-soft) bg-(--surface-chip) text-sm font-semibold tracking-[0.2em] text-(--text-strong) shadow-[0_14px_34px_rgba(20,26,56,0.18)]">
            L
          </span>
          <div>
            <p className="text-sm tracking-[0.18em] text-(--text-muted) uppercase">
              Leyendo
            </p>
            <p className="text-sm text-(--text-strong)">
              {getLocalizedCopy(locale, brandLabel)}
            </p>
          </div>
        </Link>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
          {localizedLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                pathname === href
                  ? "border-(--border-strong) bg-(--surface-strong) text-(--text-strong)"
                  : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs font-medium text-(--text-muted)">
              {user?.email
                ? syncStatus === "synced"
                  ? locale === "en"
                    ? "Cloud synced"
                    : locale === "es"
                      ? "Nube sincronizada"
                      : "Nuvem sincronizada"
                  : syncStatus === "syncing"
                    ? locale === "en"
                      ? "Syncing"
                      : locale === "es"
                        ? "Sincronizando"
                        : "Sincronizando"
                    : user.email
                : locale === "en"
                  ? "Guest mode"
                  : locale === "es"
                    ? "Modo invitado"
                    : "Modo convidado"}
            </span>
            {user ? (
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  void signOut();
                }}
              >
                {locale === "en"
                  ? "Sign out"
                  : locale === "es"
                    ? "Cerrar sesion"
                    : "Sair"}
              </Button>
            ) : null}
          </div>
          <div className="relative z-95" ref={localeMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              onClick={() => {
                setIsLocaleMenuOpen((currentValue) => !currentValue);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              <Languages className="h-4 w-4 text-(--accent-sky)" />
              <span>{getLocalizedCopy(locale, localeMenuLabel)}</span>
              <span className="rounded-full bg-(--surface-chip) px-2 py-0.5 text-xs font-semibold text-(--text-muted)">
                {localeOptions[locale].short}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-(--text-muted) transition ${
                  isLocaleMenuOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {isLocaleMenuOpen ? (
              <div
                aria-label={getLocalizedCopy(locale, localeMenuLabel)}
                className="absolute top-[calc(100%+0.75rem)] right-0 z-95 min-w-56 overflow-hidden rounded-[1.25rem] border border-(--border-soft) bg-(--surface-strong) p-2 shadow-[0_20px_60px_rgba(8,12,22,0.22)] backdrop-blur-xl"
              >
                {(["en", "es", "pt"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setLocale(option);
                      setIsLocaleMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm text-(--text-strong) transition hover:bg-(--surface-soft)"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">
                        {localeOptions[option].name}
                      </span>
                      <span className="text-xs text-(--text-muted)">
                        {localeOptions[option].short}
                      </span>
                    </span>
                    {locale === option ? (
                      <Check className="h-4 w-4 text-(--accent-sky)" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-(--border-soft) bg-(--surface-soft) p-1">
            <button
              type="button"
              title={getLocalizedCopy(locale, themeLabels.light)}
              onClick={() => {
                setTheme("light");
              }}
              className={controlButtonClass(activeTheme === "light")}
            >
              <SunMedium className="h-4 w-4" />
              <span className="hidden sm:inline">
                {getLocalizedCopy(locale, themeLabels.light)}
              </span>
            </button>
            <button
              type="button"
              title={getLocalizedCopy(locale, themeLabels.dark)}
              onClick={() => {
                setTheme("dark");
              }}
              className={controlButtonClass(activeTheme === "dark")}
            >
              <MoonStar className="h-4 w-4" />
              <span className="hidden sm:inline">
                {getLocalizedCopy(locale, themeLabels.dark)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

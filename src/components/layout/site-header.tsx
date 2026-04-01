"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  BookOpenText,
  Check,
  ChevronDown,
  Cloud,
  FileText,
  Info,
  LibraryBig,
  Languages,
  Menu,
  MoonStar,
  ShieldCheck,
  SunMedium,
  X,
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
    href: "/about",
    label: { en: "About", es: "Sobre", pt: "Sobre" },
    icon: Info,
  },
  {
    href: "/guides",
    label: { en: "Guides", es: "Guias", pt: "Guias" },
    icon: FileText,
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

const menuLabel: LocalizedCopy = {
  en: "Menu",
  es: "Menu",
  pt: "Menu",
};

const navigationLabel: LocalizedCopy = {
  en: "Navigation",
  es: "Navegacion",
  pt: "Navegacao",
};

const primaryNavigationLabel: LocalizedCopy = {
  en: "Primary navigation",
  es: "Navegacion principal",
  pt: "Navegacao principal",
};

const accountPanelLabel: LocalizedCopy = {
  en: "Account",
  es: "Cuenta",
  pt: "Conta",
};

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
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const desktopLocaleMenuRef = useRef<HTMLDivElement>(null);
  const mobileLocaleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHeaderMenuOpen && !isLocaleMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!headerMenuRef.current?.contains(target)) {
        setIsHeaderMenuOpen(false);
      }

      const isInsideDesktopLocaleMenu =
        desktopLocaleMenuRef.current?.contains(target) ?? false;
      const isInsideMobileLocaleMenu =
        mobileLocaleMenuRef.current?.contains(target) ?? false;

      if (!isInsideDesktopLocaleMenu && !isInsideMobileLocaleMenu) {
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
  }, [isHeaderMenuOpen, isLocaleMenuOpen]);

  const activeTheme = resolvedTheme === "light" ? "light" : "dark";

  const localizedLinks = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        label: getLocalizedCopy(locale, link.label),
      })),
    [locale],
  );

  const syncStatusLabel = user?.email
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
        : "Modo convidado";

  const signOutLabel =
    locale === "en" ? "Sign out" : locale === "es" ? "Cerrar sesion" : "Sair";

  return (
    <header className="sticky top-0 z-90 border-b border-(--border-soft) bg-(--surface-overlay) shadow-[0_14px_40px_rgba(8,12,22,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-(--border-soft) bg-[radial-gradient(circle_at_30%_20%,rgba(120,231,255,0.2),transparent_55%),linear-gradient(160deg,rgba(17,34,58,0.95),rgba(8,19,29,0.98))] shadow-[0_20px_48px_rgba(6,12,24,0.3)] sm:h-14 sm:w-14 sm:rounded-[1.35rem]">
            <Image
              src="/leyendo-logo.svg"
              alt="Leyendo logo"
              width={44}
              height={44}
              className="h-9 w-9 shrink-0 sm:h-11 sm:w-11"
            />
          </span>
          <div className="min-w-0">
            <p className="text-[0.72rem] tracking-[0.18em] text-(--text-muted) uppercase sm:text-[0.78rem] sm:tracking-[0.22em]">
              Leyendo
            </p>
            <p className="hidden text-sm leading-5 text-(--text-strong) 2xl:block">
              {getLocalizedCopy(locale, brandLabel)}
            </p>
          </div>
        </Link>

        <nav
          aria-label={getLocalizedCopy(locale, primaryNavigationLabel)}
          className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 xl:flex"
        >
          {localizedLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm whitespace-nowrap transition 2xl:px-4",
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

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 2xl:flex">
            <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs font-medium text-(--text-muted)">
              {syncStatusLabel}
            </span>
            {user ? (
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  void signOut();
                }}
              >
                {signOutLabel}
              </Button>
            ) : null}
          </div>

          <div
            className="relative z-95 hidden xl:block"
            ref={desktopLocaleMenuRef}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-label={`${getLocalizedCopy(locale, localeMenuLabel)} ${localeOptions[locale].short}`}
              onClick={() => {
                setIsLocaleMenuOpen((currentValue) => !currentValue);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip) 2xl:px-4"
            >
              <Languages className="h-4 w-4 text-(--accent-sky)" />
              <span className="hidden 2xl:inline">
                {getLocalizedCopy(locale, localeMenuLabel)}
              </span>
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
                role="menu"
                aria-label={getLocalizedCopy(locale, localeMenuLabel)}
                className="absolute top-[calc(100%+0.75rem)] right-0 z-95 min-w-56 overflow-hidden rounded-[1.25rem] border border-(--border-soft) bg-(--surface-strong) p-2 shadow-[0_20px_60px_rgba(8,12,22,0.22)] backdrop-blur-xl"
              >
                {(["en", "es", "pt"] as const).map((option) =>
                  locale === option ? (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-checked="true"
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
                      <Check className="h-4 w-4 text-(--accent-sky)" />
                    </button>
                  ) : (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-checked="false"
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
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>

          <div className="hidden items-center gap-1 rounded-full border border-(--border-soft) bg-(--surface-soft) p-1 xl:flex">
            <button
              type="button"
              title={getLocalizedCopy(locale, themeLabels.light)}
              onClick={() => {
                setTheme("light");
              }}
              className={controlButtonClass(activeTheme === "light")}
            >
              <SunMedium className="h-4 w-4" />
              <span className="hidden 2xl:inline">
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
              <span className="hidden 2xl:inline">
                {getLocalizedCopy(locale, themeLabels.dark)}
              </span>
            </button>
          </div>

          <div className="relative z-95 xl:hidden" ref={headerMenuRef}>
            {isHeaderMenuOpen ? (
              <button
                type="button"
                aria-expanded="true"
                aria-haspopup="menu"
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3.5 py-2 text-sm text-(--text-strong) shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:px-4"
              >
                <X className="h-4 w-4 text-(--accent-sky)" />
                <span>{getLocalizedCopy(locale, menuLabel)}</span>
              </button>
            ) : (
              <button
                type="button"
                aria-expanded="false"
                aria-haspopup="menu"
                onClick={() => {
                  setIsHeaderMenuOpen(true);
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3.5 py-2 text-sm text-(--text-strong) shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:px-4"
              >
                <Menu className="h-4 w-4 text-(--accent-sky)" />
                <span>{getLocalizedCopy(locale, menuLabel)}</span>
              </button>
            )}

            {isHeaderMenuOpen ? (
              <div className="absolute top-[calc(100%+0.6rem)] right-0 z-95 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-[1.35rem] border border-(--border-soft) bg-(--surface-strong) p-2.5 shadow-[0_20px_60px_rgba(8,12,22,0.22)] backdrop-blur-xl sm:top-[calc(100%+0.75rem)] sm:w-[min(24rem,calc(100vw-2rem))] sm:rounded-[1.5rem] sm:p-3">
                <p className="px-2 text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
                  {getLocalizedCopy(locale, navigationLabel)}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {localizedLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                      }}
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm transition sm:px-4 sm:py-3",
                        pathname === href
                          ? "border-(--border-strong) bg-(--surface-strong) text-(--text-strong)"
                          : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </div>

                <div className="mt-3 rounded-[1.15rem] border border-(--border-soft) bg-(--surface-soft) p-3 sm:mt-4 sm:rounded-[1.25rem]">
                  <p className="text-xs tracking-[0.18em] text-(--text-muted) uppercase">
                    {getLocalizedCopy(locale, accountPanelLabel)}
                  </p>
                  <p className="mt-2 text-sm text-(--text-strong)">
                    {syncStatusLabel}
                  </p>
                  {user ? (
                    <Button
                      variant="ghost"
                      className="mt-3 w-full rounded-full"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        void signOut();
                      }}
                    >
                      {signOutLabel}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 space-y-3 sm:mt-4">
                  <div className="relative z-95" ref={mobileLocaleMenuRef}>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      onClick={() => {
                        setIsLocaleMenuOpen((currentValue) => !currentValue);
                      }}
                      className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Languages className="h-4 w-4 text-(--accent-sky)" />
                        <span>{getLocalizedCopy(locale, localeMenuLabel)}</span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="rounded-full bg-(--surface-chip) px-2 py-0.5 text-xs font-semibold text-(--text-muted)">
                          {localeOptions[locale].short}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-(--text-muted) transition ${
                            isLocaleMenuOpen ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </span>
                    </button>

                    {isLocaleMenuOpen ? (
                      <div
                        role="menu"
                        aria-label={getLocalizedCopy(locale, localeMenuLabel)}
                        className="absolute top-[calc(100%+0.75rem)] right-0 left-0 z-95 overflow-hidden rounded-[1.25rem] border border-(--border-soft) bg-(--surface-strong) p-2 shadow-[0_20px_60px_rgba(8,12,22,0.22)] backdrop-blur-xl"
                      >
                        {(["en", "es", "pt"] as const).map((option) =>
                          locale === option ? (
                            <button
                              key={option}
                              type="button"
                              role="menuitemradio"
                              aria-checked="true"
                              onClick={() => {
                                setLocale(option);
                                setIsLocaleMenuOpen(false);
                                setIsHeaderMenuOpen(false);
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
                              <Check className="h-4 w-4 text-(--accent-sky)" />
                            </button>
                          ) : (
                            <button
                              key={option}
                              type="button"
                              role="menuitemradio"
                              aria-checked="false"
                              onClick={() => {
                                setLocale(option);
                                setIsLocaleMenuOpen(false);
                                setIsHeaderMenuOpen(false);
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
                            </button>
                          ),
                        )}
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
                      <span>{getLocalizedCopy(locale, themeLabels.light)}</span>
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
                      <span>{getLocalizedCopy(locale, themeLabels.dark)}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

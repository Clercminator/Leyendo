"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  BookMarked,
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
  Sparkles,
  SunMedium,
  UserRound,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  GuestAuthDialog,
  getGuestAuthDialogCopy,
} from "@/components/auth/guest-auth-dialog";
import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/layout/locale-provider";
import { getLocalizedCopy, type LocalizedCopy } from "@/lib/locale";
import { hasPlanAccess } from "@/lib/plans";
import {
  getLocaleSwitchPath,
  getLocalizedPublicPath,
  isPublicMarketingPath,
  stripPublicLocalePrefix,
} from "@/lib/public-paths";

const links = [
  {
    href: "/reader",
    isPublic: false,
    label: { en: "Reader", es: "Lector", pt: "Leitor" },
    icon: BookOpenText,
  },
  {
    href: "/library",
    isPublic: false,
    label: { en: "Library", es: "Biblioteca", pt: "Biblioteca" },
    icon: LibraryBig,
  },
  {
    href: "/pricing",
    isPublic: true,
    label: { en: "Pricing", es: "Precios", pt: "Precos" },
    icon: Sparkles,
  },
  {
    href: "/about",
    isPublic: true,
    label: { en: "About", es: "Acerca de", pt: "Sobre" },
    icon: Info,
  },
  {
    href: "/guides",
    isPublic: true,
    label: { en: "Guides", es: "Guías", pt: "Guias" },
    icon: FileText,
  },
  {
    href: "/account",
    isPublic: false,
    label: { en: "Account", es: "Cuenta", pt: "Conta" },
    icon: Cloud,
  },
] as const;

const catalogLink = {
  href: "/catalog",
  isPublic: false,
  label: { en: "Catalog", es: "Catálogo", pt: "Catalogo" },
  icon: BookMarked,
} as const;

const brandLabel: LocalizedCopy = {
  en: "Read faster, stay in control.",
  es: "Lee más rápido y mantén el control.",
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
  es: { short: "ES", name: "Español" },
  pt: { short: "PT", name: "Português" },
} as const;

const menuLabel: LocalizedCopy = {
  en: "Menu",
  es: "Menú",
  pt: "Menu",
};

const navigationLabel: LocalizedCopy = {
  en: "Navigation",
  es: "Navegación",
  pt: "Navegacao",
};

const primaryNavigationLabel: LocalizedCopy = {
  en: "Primary navigation",
  es: "Navegación principal",
  pt: "Navegacao principal",
};

const accountPanelLabel: LocalizedCopy = {
  en: "Account",
  es: "Cuenta",
  pt: "Conta",
};

const guestAccountHint: LocalizedCopy = {
  en: "Create or log in",
  es: "Crear cuenta o entrar",
  pt: "Criar ou entrar",
};

const syncStatusLabels = {
  synced: {
    en: "Cloud synced",
    es: "Sincronizado en la nube",
    pt: "Nuvem sincronizada",
  },
  syncing: {
    en: "Syncing",
    es: "Sincronizando",
    pt: "Sincronizando",
  },
  signedIn: {
    en: "Signed in",
    es: "Sesión activa",
    pt: "Sessao ativa",
  },
  offline: {
    en: "Offline",
    es: "Sin conexión",
    pt: "Offline",
  },
  queued: {
    en: "Sync queued",
    es: "Sincronización pendiente",
    pt: "Sincronizacao em fila",
  },
  guest: {
    en: "Guest mode",
    es: "Modo invitado",
    pt: "Modo convidado",
  },
} satisfies Record<string, LocalizedCopy>;

const fullHeaderMediaQuery = "(min-width: 1800px)";

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
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const {
    isLoading: isAuthLoading,
    guestLibrarySummary = {
      bookmarks: 0,
      documents: 0,
      highlights: 0,
      sessions: 0,
    },
    isOnline = true,
    profile,
    signIn,
    signInWithGitHub,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    signUp,
    syncStatus,
    user,
  } = useSupabaseAuth();
  const pendingSyncCount =
    guestLibrarySummary.documents +
    guestLibrarySummary.sessions +
    guestLibrarySummary.bookmarks +
    guestLibrarySummary.highlights;
  const [showsFullHeader, setShowsFullHeader] = useState(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return false;
    }

    return window.matchMedia(fullHeaderMediaQuery).matches;
  });
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const [isGuestAuthOpen, setIsGuestAuthOpen] = useState(false);
  const [hasMountedThemeControls, setHasMountedThemeControls] = useState(false);
  const [guestAuthMode, setGuestAuthMode] = useState<
    "sign-in" | "create-account"
  >("create-account");
  const [guestShowEmailAuth, setGuestShowEmailAuth] = useState(false);
  const [guestUseMagicLink, setGuestUseMagicLink] = useState(false);
  const [guestAuthEmail, setGuestAuthEmail] = useState("");
  const [guestAuthPassword, setGuestAuthPassword] = useState("");
  const [guestAuthPendingAction, setGuestAuthPendingAction] =
    useState<string>();
  const [guestAuthStatusMessage, setGuestAuthStatusMessage] =
    useState<string>();
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const desktopLocaleMenuRef = useRef<HTMLDivElement>(null);
  const mobileLocaleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(fullHeaderMediaQuery);

    function handleMediaChange(event: MediaQueryListEvent) {
      setShowsFullHeader(event.matches);

      if (event.matches) {
        setIsHeaderMenuOpen(false);
        setIsLocaleMenuOpen(false);
      }
    }

    mediaQueryList.addEventListener("change", handleMediaChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    setHasMountedThemeControls(true);
  }, []);

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

  const activeTheme = hasMountedThemeControls
    ? resolvedTheme === "light"
      ? "light"
      : "dark"
    : undefined;

  const publicLocaleContext = useMemo(() => {
    const resolvedPathname = pathname ?? "/";
    const strippedPath = stripPublicLocalePrefix(resolvedPathname);

    return {
      locale: strippedPath.locale,
      isPublicRoute: isPublicMarketingPath(strippedPath.pathname),
    };
  }, [pathname]);

  const localizedLinks = useMemo(() => {
    const visibleLinks = [
      ...links,
      ...(hasPlanAccess(profile, "max") ? [catalogLink] : []),
    ].filter((link) => link.href !== "/account" || Boolean(user));

    return visibleLinks.map((link) => ({
      ...link,
      href:
        link.isPublic && publicLocaleContext.isPublicRoute
          ? getLocalizedPublicPath(link.href, publicLocaleContext.locale)
          : link.href,
      label: getLocalizedCopy(locale, link.label),
    }));
  }, [
    locale,
    profile,
    publicLocaleContext.isPublicRoute,
    publicLocaleContext.locale,
    user,
  ]);

  const guestAuthCopy = getGuestAuthDialogCopy({
    locale,
    variant: "account",
  });

  useEffect(() => {
    if (!isGuestAuthOpen || !user) {
      return;
    }

    setIsGuestAuthOpen(false);
    setGuestAuthPendingAction(undefined);
    setGuestAuthStatusMessage(undefined);
    setGuestShowEmailAuth(false);
    setGuestUseMagicLink(false);
    setGuestAuthPassword("");
  }, [isGuestAuthOpen, user]);

  function handleLocaleChange(nextLocale: typeof locale) {
    const nextPath = getLocaleSwitchPath(pathname ?? "/", nextLocale);

    setLocale(nextLocale);

    if (nextPath) {
      router.push(nextPath);
    }

    setIsLocaleMenuOpen(false);
  }

  const syncStatusLabel = user?.email
    ? !isOnline
      ? getLocalizedCopy(locale, syncStatusLabels.offline)
      : pendingSyncCount > 0
        ? getLocalizedCopy(locale, syncStatusLabels.queued)
        : syncStatus === "synced"
          ? getLocalizedCopy(locale, syncStatusLabels.synced)
          : syncStatus === "syncing"
            ? getLocalizedCopy(locale, syncStatusLabels.syncing)
            : user.email
    : getLocalizedCopy(locale, syncStatusLabels.guest);

  const desktopSyncStatusLabel = user?.email
    ? !isOnline
      ? getLocalizedCopy(locale, syncStatusLabels.offline)
      : pendingSyncCount > 0
        ? getLocalizedCopy(locale, syncStatusLabels.queued)
        : syncStatus === "synced"
          ? getLocalizedCopy(locale, syncStatusLabels.synced)
          : syncStatus === "syncing"
            ? getLocalizedCopy(locale, syncStatusLabels.syncing)
            : getLocalizedCopy(locale, syncStatusLabels.signedIn)
    : undefined;

  const signOutLabel =
    locale === "en" ? "Sign out" : locale === "es" ? "Cerrar sesión" : "Sair";

  const openGuestAuthModal = () => {
    setIsHeaderMenuOpen(false);
    setGuestAuthMode("create-account");
    setGuestShowEmailAuth(false);
    setGuestUseMagicLink(false);
    setGuestAuthEmail("");
    setGuestAuthPassword("");
    setGuestAuthPendingAction(undefined);
    setGuestAuthStatusMessage(undefined);
    setIsGuestAuthOpen(true);
  };

  const closeGuestAuthModal = () => {
    setIsGuestAuthOpen(false);
    setGuestAuthPendingAction(undefined);
    setGuestAuthStatusMessage(undefined);
    setGuestShowEmailAuth(false);
    setGuestUseMagicLink(false);
    setGuestAuthPassword("");
  };

  async function handleGuestAuthSubmit() {
    setGuestAuthPendingAction(guestUseMagicLink ? "magic-link" : "email");
    setGuestAuthStatusMessage(undefined);

    try {
      if (guestUseMagicLink) {
        await signInWithMagicLink(guestAuthEmail, window.location.href);
        setGuestAuthStatusMessage(guestAuthCopy.emailSent);
        return;
      }

      if (guestAuthMode === "create-account") {
        await signUp(guestAuthEmail, guestAuthPassword, window.location.href);
        setGuestAuthStatusMessage(guestAuthCopy.createSuccess);
      } else {
        await signIn(guestAuthEmail, guestAuthPassword);
        setGuestAuthStatusMessage(guestAuthCopy.signInSuccess);
      }
    } catch (error) {
      setGuestAuthStatusMessage(
        error instanceof Error ? error.message : guestAuthCopy.authFailed,
      );
    } finally {
      setGuestAuthPendingAction(undefined);
    }
  }

  async function handleGuestAuthOAuth(
    provider: "github" | "google",
    signInWithProvider: (redirectTo?: string) => Promise<void>,
  ) {
    setGuestAuthPendingAction(provider);
    setGuestAuthStatusMessage(undefined);

    try {
      await signInWithProvider(window.location.href);
    } catch (error) {
      setGuestAuthStatusMessage(
        error instanceof Error ? error.message : guestAuthCopy.authFailed,
      );
      setGuestAuthPendingAction(undefined);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-90 border-b border-(--border-soft) bg-(--surface-overlay) shadow-[0_14px_40px_rgba(8,12,22,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-(--border-soft) bg-[radial-gradient(circle_at_30%_20%,rgba(120,231,255,0.2),transparent_55%),linear-gradient(160deg,rgba(17,34,58,0.95),rgba(8,19,29,0.98))] shadow-[0_20px_48px_rgba(6,12,24,0.3)] sm:h-14 sm:w-14 sm:rounded-[1.35rem]">
              <Image
                src="/leyendo-logo.svg"
                alt="Leyendo logo"
                width={44}
                height={44}
                loading="eager"
                fetchPriority="high"
                className="h-9 w-9 shrink-0 sm:h-11 sm:w-11"
              />
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="text-[0.72rem] tracking-[0.18em] text-(--text-muted) uppercase sm:text-[0.78rem] sm:tracking-[0.22em]">
                Leyendo
              </p>
              <p className="hidden text-sm leading-5 text-(--text-strong) 2xl:block">
                {getLocalizedCopy(locale, brandLabel)}
              </p>
            </div>
          </Link>

          {showsFullHeader ? (
            <nav
              aria-label={getLocalizedCopy(locale, primaryNavigationLabel)}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5"
            >
              {localizedLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition",
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
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {showsFullHeader ? (
              <div className="hidden items-center gap-2 2xl:flex">
                {desktopSyncStatusLabel ? (
                  <span
                    title={desktopSyncStatusLabel}
                    className="max-w-32 truncate rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs font-medium text-(--text-muted)"
                  >
                    {desktopSyncStatusLabel}
                  </span>
                ) : null}
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
            ) : null}

            {showsFullHeader ? (
              <div
                className="relative z-95 hidden 2xl:block"
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
                            handleLocaleChange(option);
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
                            handleLocaleChange(option);
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
            ) : null}

            {showsFullHeader ? (
              <div className="hidden items-center gap-1 rounded-full border border-(--border-soft) bg-(--surface-soft) p-1 2xl:flex">
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
            ) : null}

            {!showsFullHeader ? (
              <div className="relative z-95" ref={mobileLocaleMenuRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-label={`${getLocalizedCopy(locale, localeMenuLabel)} ${localeOptions[locale].short}`}
                  onClick={() => {
                    setIsLocaleMenuOpen((currentValue) => !currentValue);
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-(--border-soft) bg-(--surface-soft) px-2.5 py-2 text-sm text-(--text-strong) shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:gap-2 sm:px-3.5"
                >
                  <Languages className="h-4 w-4 text-(--accent-sky)" />
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
                    className="absolute top-[calc(100%+0.75rem)] right-0 z-95 min-w-52 overflow-hidden rounded-[1.25rem] border border-(--border-soft) bg-(--surface-strong) p-2 shadow-[0_20px_60px_rgba(8,12,22,0.22)] backdrop-blur-xl"
                  >
                    {(["en", "es", "pt"] as const).map((option) =>
                      locale === option ? (
                        <button
                          key={option}
                          type="button"
                          role="menuitemradio"
                          aria-checked="true"
                          onClick={() => {
                            handleLocaleChange(option);
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
                            handleLocaleChange(option);
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
            ) : null}

            {!showsFullHeader ? (
              <div className="flex items-center gap-0.5 rounded-full border border-(--border-soft) bg-(--surface-soft) p-0.5 sm:gap-1 sm:p-1">
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
            ) : null}

            {!showsFullHeader ? (
              <div className="relative z-95" ref={headerMenuRef}>
                {isHeaderMenuOpen ? (
                  <button
                    type="button"
                    aria-expanded="true"
                    aria-haspopup="menu"
                    aria-label={getLocalizedCopy(locale, menuLabel)}
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                    }}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:px-4"
                  >
                    <X className="h-4 w-4 text-(--accent-sky)" />
                    <span className="hidden sm:inline">
                      {getLocalizedCopy(locale, menuLabel)}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-expanded="false"
                    aria-haspopup="menu"
                    aria-label={getLocalizedCopy(locale, menuLabel)}
                    onClick={() => {
                      setIsHeaderMenuOpen(true);
                    }}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong) shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:min-h-11 sm:px-4"
                  >
                    <Menu className="h-4 w-4 text-(--accent-sky)" />
                    <span className="hidden sm:inline">
                      {getLocalizedCopy(locale, menuLabel)}
                    </span>
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
                      {user ? (
                        <p className="mt-2 text-sm text-(--text-strong)">
                          {syncStatusLabel}
                        </p>
                      ) : (
                        <button
                          type="button"
                          aria-haspopup="dialog"
                          aria-label={`${syncStatusLabel}. ${getLocalizedCopy(locale, guestAccountHint)}`}
                          onClick={() => {
                            openGuestAuthModal();
                          }}
                          className="mt-3 flex w-full items-center gap-3 rounded-[1.1rem] border border-(--border-strong) bg-[linear-gradient(180deg,rgba(17,26,42,0.98),rgba(11,19,31,0.96))] px-3 py-3 text-left shadow-[0_18px_36px_rgba(8,12,22,0.2)] transition hover:border-(--accent-sky) hover:bg-[linear-gradient(180deg,rgba(20,30,48,0.99),rgba(13,21,35,0.97))]"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem] border border-white/16 bg-[linear-gradient(180deg,rgba(8,13,22,0.98),rgba(17,26,40,0.92))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <UserRound className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-(--text-strong)">
                              {syncStatusLabel}
                            </span>
                            <span className="mt-0.5 block text-xs text-(--text-muted)">
                              {getLocalizedCopy(locale, guestAccountHint)}
                            </span>
                          </span>
                        </button>
                      )}
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
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <GuestAuthDialog
        copy={guestAuthCopy}
        email={guestAuthEmail}
        isAuthLoading={isAuthLoading}
        isOpen={isGuestAuthOpen}
        mode={guestAuthMode}
        onClose={closeGuestAuthModal}
        onContinueWithEmail={() => {
          setGuestShowEmailAuth(true);
          setGuestUseMagicLink(false);
          setGuestAuthStatusMessage(undefined);
        }}
        onContinueWithGitHub={() => {
          void handleGuestAuthOAuth("github", signInWithGitHub);
        }}
        onContinueWithGoogle={() => {
          void handleGuestAuthOAuth("google", signInWithGoogle);
        }}
        onEmailChange={setGuestAuthEmail}
        onPasswordChange={setGuestAuthPassword}
        onSelectCreateAccount={() => {
          setGuestAuthMode("create-account");
          setGuestShowEmailAuth(false);
          setGuestUseMagicLink(false);
          setGuestAuthStatusMessage(undefined);
        }}
        onSelectSignIn={() => {
          setGuestAuthMode("sign-in");
          setGuestShowEmailAuth(false);
          setGuestUseMagicLink(false);
          setGuestAuthStatusMessage(undefined);
        }}
        onSubmit={() => {
          void handleGuestAuthSubmit();
        }}
        onToggleMagicLink={() => {
          setGuestUseMagicLink((current) => !current);
          setGuestAuthStatusMessage(undefined);
        }}
        password={guestAuthPassword}
        pendingAction={guestAuthPendingAction}
        showEmailAuth={guestShowEmailAuth}
        statusMessage={guestAuthStatusMessage}
        useMagicLink={guestUseMagicLink}
      />
    </>
  );
}

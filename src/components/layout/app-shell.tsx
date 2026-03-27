"use client";

import type { ReactNode } from "react";

import { useLocale } from "@/components/layout/locale-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { getLocalizedCopy, type LocalizedCopy } from "@/lib/locale";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  eyebrow?: string | LocalizedCopy;
  title?: string | LocalizedCopy;
  description?: string | LocalizedCopy;
  centerIntro?: boolean;
  mainId?: string;
  mainClassName?: string;
  secondarySkipTargetId?: string;
  secondarySkipLabel?: string;
}

function resolveCopy(
  value: string | LocalizedCopy | undefined,
  locale: ReturnType<typeof useLocale>["locale"],
) {
  if (!value) {
    return undefined;
  }

  return typeof value === "string" ? value : getLocalizedCopy(locale, value);
}

export function AppShell({
  children,
  eyebrow,
  title,
  description,
  centerIntro = false,
  mainId = "main-content",
  mainClassName,
  secondarySkipTargetId,
  secondarySkipLabel,
}: AppShellProps) {
  const { locale } = useLocale();
  const eyebrowText = resolveCopy(eyebrow, locale);
  const titleText = resolveCopy(title, locale);
  const descriptionText = resolveCopy(description, locale);

  return (
    <div className="text-foreground bg-background min-h-screen">
      <a href={`#${mainId}`} className="skip-link">
        Skip to content
      </a>
      {secondarySkipTargetId && secondarySkipLabel ? (
        <a
          href={`#${secondarySkipTargetId}`}
          className="skip-link skip-link-secondary"
        >
          {secondarySkipLabel}
        </a>
      ) : null}
      <div className="app-shell-background pointer-events-none fixed inset-0" />
      <div className="relative flex min-h-screen flex-col">
        <SiteHeader />
        <main
          id={mainId}
          tabIndex={-1}
          className={cn(
            "mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10",
            mainClassName,
          )}
        >
          {(eyebrowText || titleText || descriptionText) && (
            <section
              className={`fade-rise mb-12 ${
                centerIntro ? "mx-auto max-w-5xl text-center" : "max-w-4xl"
              }`}
            >
              {eyebrowText ? (
                <p
                  className={`editorial-kicker mb-4 text-(--accent-amber) ${
                    centerIntro ? "justify-center" : ""
                  }`}
                >
                  {eyebrowText}
                </p>
              ) : null}
              {titleText ? (
                <h1
                  className={`font-heading text-5xl leading-[0.96] font-semibold tracking-[-0.04em] text-balance text-(--text-strong) sm:text-6xl xl:text-7xl ${
                    centerIntro ? "mx-auto max-w-5xl" : "max-w-4xl"
                  }`}
                >
                  {titleText}
                </h1>
              ) : null}
              {descriptionText ? (
                <p
                  className={`mt-6 text-lg leading-8 text-(--text-muted) sm:text-xl ${
                    centerIntro ? "mx-auto max-w-3xl" : "max-w-3xl"
                  }`}
                >
                  {descriptionText}
                </p>
              ) : null}
            </section>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

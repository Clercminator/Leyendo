import Link from "next/link";

import { ArrowRight, Clock3 } from "lucide-react";

interface ResumeCardProps {
  href: string;
  title: string;
  excerpt: string;
  progressLabel: string;
  onSecondaryAction?: () => void;
  secondaryActionAriaLabel?: string;
  secondaryActionDisabled?: boolean;
  secondaryActionText?: string;
}

export function ResumeCard({
  href,
  title,
  excerpt,
  progressLabel,
  onSecondaryAction,
  secondaryActionAriaLabel,
  secondaryActionDisabled = false,
  secondaryActionText,
}: ResumeCardProps) {
  return (
    <article className="editorial-panel hover-lift rounded-[1.5rem] border border-(--border-soft) bg-(--surface-card) p-5 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl sm:rounded-[1.75rem] sm:p-6">
      <div className="flex items-center gap-2 text-sm text-(--accent-sky)">
        <Clock3 className="h-4 w-4" />
        Resume where you left off
      </div>
      <h3 className="font-heading mt-3 text-2xl leading-tight font-semibold text-(--text-strong) sm:mt-4 sm:text-3xl">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-(--text-muted) sm:leading-7">{excerpt}</p>
      <div className="mt-5 flex flex-col items-stretch gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span className="self-start rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)">
          {progressLabel}
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {onSecondaryAction && secondaryActionText ? (
            <button
              type="button"
              aria-label={secondaryActionAriaLabel}
              disabled={secondaryActionDisabled}
              onClick={onSecondaryAction}
              className="w-full rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-center text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {secondaryActionText}
            </button>
          ) : null}
          <Link
            href={href}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) sm:w-auto"
          >
            Open reader
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

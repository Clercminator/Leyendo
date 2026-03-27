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
    <article className="editorial-panel hover-lift rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm text-(--accent-sky)">
        <Clock3 className="h-4 w-4" />
        Resume where you left off
      </div>
      <h3 className="font-heading mt-4 text-3xl leading-tight font-semibold text-(--text-strong)">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-(--text-muted)">{excerpt}</p>
      <div className="mt-6 flex items-center justify-between gap-4">
        <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)">
          {progressLabel}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {onSecondaryAction && secondaryActionText ? (
            <button
              type="button"
              aria-label={secondaryActionAriaLabel}
              disabled={secondaryActionDisabled}
              onClick={onSecondaryAction}
              className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {secondaryActionText}
            </button>
          ) : null}
          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            Open reader
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

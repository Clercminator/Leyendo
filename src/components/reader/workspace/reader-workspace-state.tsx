import Link from "next/link";

type ReaderWorkspaceStateVariant = "ready" | "loading" | "warning";

interface ReaderWorkspaceStateProps {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  descriptionMaxWidth?: boolean;
  eyebrow: string;
  title: string;
  variant: ReaderWorkspaceStateVariant;
}

const panelClassNames: Record<ReaderWorkspaceStateVariant, string> = {
  loading:
    "editorial-panel fade-rise rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-10 text-center shadow-[0_20px_80px_rgba(20,26,56,0.12)] backdrop-blur-xl",
  ready:
    "editorial-panel fade-rise rounded-[2rem] border border-dashed border-(--border-soft) bg-(--surface-card) p-10 text-center shadow-[0_20px_80px_rgba(20,26,56,0.12)] backdrop-blur-xl",
  warning:
    "editorial-panel fade-rise rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-10 text-center shadow-[0_20px_80px_rgba(20,26,56,0.12)] backdrop-blur-xl",
};

const eyebrowClassNames: Record<ReaderWorkspaceStateVariant, string> = {
  loading: "text-(--accent-sky)",
  ready: "text-(--accent-sky)",
  warning: "text-(--accent-amber)",
};

export function ReaderWorkspaceState({
  actionHref,
  actionLabel,
  description,
  descriptionMaxWidth = true,
  eyebrow,
  title,
  variant,
}: ReaderWorkspaceStateProps) {
  return (
    <section className={panelClassNames[variant]}>
      <p className={`editorial-kicker ${eyebrowClassNames[variant]}`}>
        {eyebrow}
      </p>
      <h2 className="font-heading mt-4 text-4xl leading-tight font-semibold text-(--text-strong)">
        {title}
      </h2>
      <p
        className={`${descriptionMaxWidth ? "mx-auto max-w-2xl " : ""}mt-4 text-base leading-8 text-(--text-muted)`}
      >
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-6 py-3 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
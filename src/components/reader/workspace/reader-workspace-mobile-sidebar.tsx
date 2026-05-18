import type { ReactNode } from "react";

interface ReaderWorkspaceMobileSidebarProps {
  sidebarCompactLabel: string;
  children: ReactNode;
  isOpen: boolean;
  sidebarClosedLabel: string;
  sidebarOpenLabel: string;
  sidebarSummary: string;
  sidebarToggleLabel: string;
  onToggle: () => void;
}

export function ReaderWorkspaceMobileSidebar({
  sidebarCompactLabel,
  children,
  isOpen,
  sidebarClosedLabel,
  sidebarOpenLabel,
  sidebarSummary,
  sidebarToggleLabel,
  onToggle,
}: ReaderWorkspaceMobileSidebarProps) {
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-controls="reader-sidebar-mobile"
        aria-expanded={isOpen}
        aria-label={sidebarToggleLabel}
        onClick={onToggle}
        className="flex w-full touch-manipulation items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-card) px-2.5 py-1.5 text-left shadow-[0_10px_24px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip) active:scale-[0.99]"
      >
        <span className="sr-only">{sidebarToggleLabel}</span>
        <span className="inline-flex shrink-0 items-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-2.5 py-1 text-[0.62rem] tracking-[0.18em] text-(--accent-sky) uppercase">
          {sidebarCompactLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.72rem] text-(--text-muted)">
          {sidebarSummary}
        </span>
        <span className="shrink-0 rounded-full border border-(--border-soft) bg-(--surface-soft) px-2.5 py-1 text-[0.62rem] font-medium tracking-[0.12em] text-(--text-strong) uppercase">
          {isOpen ? sidebarOpenLabel : sidebarClosedLabel}
        </span>
      </button>
      {isOpen ? (
        <div id="reader-sidebar-mobile" className="mt-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
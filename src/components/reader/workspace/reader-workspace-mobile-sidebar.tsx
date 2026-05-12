import type { ReactNode } from "react";

interface ReaderWorkspaceMobileSidebarProps {
  children: ReactNode;
  isOpen: boolean;
  sidebarClosedLabel: string;
  sidebarOpenLabel: string;
  sidebarSummary: string;
  sidebarToggleLabel: string;
  onToggle: () => void;
}

export function ReaderWorkspaceMobileSidebar({
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
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 rounded-[1.35rem] border border-(--border-soft) bg-(--surface-card) px-4 py-3 text-left shadow-[0_14px_40px_rgba(20,26,56,0.08)] transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
      >
        <span>
          <span className="block text-xs tracking-[0.2em] text-(--accent-sky) uppercase">
            {sidebarToggleLabel}
          </span>
          <span className="mt-1 block text-sm text-(--text-muted)">
            {sidebarSummary}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1.5 text-xs font-medium text-(--text-strong)">
          {isOpen ? sidebarOpenLabel : sidebarClosedLabel}
        </span>
      </button>
      {isOpen ? (
        <div id="reader-sidebar-mobile" className="mt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
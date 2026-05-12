import type { ReactNode } from "react";

interface PdfReaderWorkspaceMobileSidebarProps {
  children: ReactNode;
  closeLabel: string;
  closeToolsLabel: string;
  isOpen: boolean;
  sidebarClosedLabel: string;
  sidebarOpenLabel: string;
  sidebarSummary: string;
  sidebarToggleLabel: string;
  onClose: () => void;
  onOpen: () => void;
}

export function PdfReaderWorkspaceMobileSidebar({
  children,
  closeLabel,
  closeToolsLabel,
  isOpen,
  sidebarClosedLabel,
  sidebarOpenLabel,
  sidebarSummary,
  sidebarToggleLabel,
  onClose,
  onOpen,
}: PdfReaderWorkspaceMobileSidebarProps) {
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-controls="pdf-reader-sidebar-mobile"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="flex w-full items-start justify-between gap-4 rounded-[1.35rem] border border-slate-300 bg-white px-4 py-3 text-left text-slate-700 shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition hover:border-slate-400 hover:bg-slate-50"
      >
        <span>
          <span className="block text-xs tracking-[0.2em] text-sky-700 uppercase">
            {sidebarToggleLabel}
          </span>
          <span className="mt-1 block text-sm text-slate-500">
            {sidebarSummary}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
          {isOpen ? sidebarOpenLabel : sidebarClosedLabel}
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-80 lg:hidden">
          <button
            type="button"
            aria-label={closeToolsLabel}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />
          <div
            id="pdf-reader-sidebar-mobile"
            role="dialog"
            aria-modal="true"
            aria-label={sidebarToggleLabel}
            className="absolute inset-x-0 bottom-0 max-h-[82svh] overflow-hidden rounded-t-[1.75rem] border border-slate-300 bg-slate-50 shadow-[0_-24px_80px_rgba(15,23,42,0.2)]"
          >
            <div className="flex items-center justify-between border-b border-slate-300 px-4 py-3">
              <div>
                <p className="text-xs tracking-[0.2em] text-sky-700 uppercase">
                  {sidebarToggleLabel}
                </p>
                <p className="mt-1 text-sm text-slate-500">{sidebarSummary}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                {closeLabel}
              </button>
            </div>
            <div className="max-h-[calc(82svh-4.75rem)] overflow-y-auto p-4">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
import { CloudUpload, LoaderCircle } from "lucide-react";

import type { AccountPanelCopy } from "@/components/auth/account-panel-copy";
import { Button } from "@/components/ui/button";

interface AccountPanelCloudActivitySectionProps {
  cloudActivityOpen: boolean;
  cloudActivitySectionId: string;
  cloudActivitySummary: string;
  cloudActivityTitle: string;
  guestDocuments: number;
  helperCopy: AccountPanelCopy;
  isOnline: boolean;
  lastSyncedLabel?: string;
  lastSyncResultLabel?: string;
  lastSyncSummary?: {
    bookmarks: number;
    documents: number;
    highlights: number;
    sessions: number;
    uploadedDocuments: number;
  };
  offlineCachedCopy: string;
  pendingAction?: string;
  pendingBreakdownLabel: string;
  pendingChangesLabel: string;
  pendingSyncCount: number;
  syncCopy: string;
  toggleClosedLabel: string;
  toggleOpenLabel: string;
  onBackup: () => void | Promise<void>;
  onToggle: () => void;
}

export function AccountPanelCloudActivitySection({
  cloudActivityOpen,
  cloudActivitySectionId,
  cloudActivitySummary,
  cloudActivityTitle,
  guestDocuments,
  helperCopy,
  isOnline,
  lastSyncedLabel,
  lastSyncResultLabel,
  lastSyncSummary,
  offlineCachedCopy,
  pendingAction,
  pendingBreakdownLabel,
  pendingChangesLabel,
  pendingSyncCount,
  syncCopy,
  toggleClosedLabel,
  toggleOpenLabel,
  onBackup,
  onToggle,
}: AccountPanelCloudActivitySectionProps) {
  return (
    <div className="mt-4 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
            {cloudActivityTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-(--text-muted)">
            {cloudActivitySummary}
          </p>
        </div>
        {cloudActivityOpen ? (
          <button
            type="button"
            onClick={onToggle}
            aria-controls={cloudActivitySectionId}
            aria-expanded="true"
            aria-label={`${toggleOpenLabel} ${cloudActivityTitle}`}
            className="inline-flex items-center rounded-full border border-(--border-soft) bg-(--surface-card) px-4 py-2 text-xs font-medium tracking-[0.18em] text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            {toggleOpenLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-controls={cloudActivitySectionId}
            aria-expanded="false"
            aria-label={`${toggleClosedLabel} ${cloudActivityTitle}`}
            className="inline-flex items-center rounded-full border border-(--border-soft) bg-(--surface-card) px-4 py-2 text-xs font-medium tracking-[0.18em] text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            {toggleClosedLabel}
          </button>
        )}
      </div>

      {cloudActivityOpen ? (
        <div
          id={cloudActivitySectionId}
          role="region"
          aria-label={cloudActivityTitle}
        >
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
              {helperCopy.syncResultTitle}
            </p>
            <p className="text-xs text-(--text-muted)">
              {lastSyncResultLabel ?? "-"}
            </p>
          </div>

          {lastSyncSummary ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) p-4">
                <p className="text-xs tracking-[0.16em] text-(--text-muted) uppercase">
                  {helperCopy.uploadedFromDevice}
                </p>
                <p className="mt-2 text-2xl font-semibold text-(--text-strong)">
                  {lastSyncSummary.uploadedDocuments}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) p-4">
                <p className="text-xs tracking-[0.16em] text-(--text-muted) uppercase">
                  {helperCopy.cloudDocuments}
                </p>
                <p className="mt-2 text-2xl font-semibold text-(--text-strong)">
                  {lastSyncSummary.documents}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) p-4">
                <p className="text-xs tracking-[0.16em] text-(--text-muted) uppercase">
                  {helperCopy.cloudSessions}
                </p>
                <p className="mt-2 text-2xl font-semibold text-(--text-strong)">
                  {lastSyncSummary.sessions}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) p-4">
                <p className="text-xs tracking-[0.16em] text-(--text-muted) uppercase">
                  {helperCopy.cloudBookmarks} / {helperCopy.cloudHighlights}
                </p>
                <p className="mt-2 text-2xl font-semibold text-(--text-strong)">
                  {lastSyncSummary.bookmarks} / {lastSyncSummary.highlights}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-(--text-muted)">
              {helperCopy.syncResultEmpty}
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-4">
              <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                {helperCopy.syncStatusLabel}
              </p>
              <p className="mt-3 text-lg font-semibold text-(--text-strong)">
                {syncCopy}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-4">
              <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                {pendingChangesLabel}
              </p>
              <p className="mt-3 text-3xl font-semibold text-(--text-strong)">
                {pendingSyncCount}
              </p>
              <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                {pendingSyncCount > 0
                  ? pendingBreakdownLabel
                  : !isOnline
                    ? offlineCachedCopy
                    : helperCopy.backupDone}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-4">
              <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                {helperCopy.lastCloudSync}
              </p>
              <p className="mt-3 text-lg font-semibold text-(--text-strong)">
                {lastSyncedLabel ?? "-"}
              </p>
            </div>
          </div>

          {guestDocuments > 0 ? (
            <div className="mt-4 flex justify-start">
              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                disabled={pendingAction === "backup" || !isOnline}
                onClick={() => {
                  void onBackup();
                }}
              >
                {pendingAction === "backup" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
                {helperCopy.backupAction}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
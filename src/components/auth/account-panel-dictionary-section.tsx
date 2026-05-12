import { KeyRound, LoaderCircle, Trash2 } from "lucide-react";

import type { DictionaryFormState } from "@/components/auth/account-panel-helpers";
import type { AccountPanelCopy } from "@/components/auth/account-panel-copy";
import { Button } from "@/components/ui/button";
import type { UserSavedWord } from "@/lib/supabase/profile";

interface AccountPanelDictionarySectionProps {
  dictionaryForm: DictionaryFormState;
  dictionarySectionId: string;
  dictionarySectionOpen: boolean;
  dictionarySummary: string;
  helperCopy: AccountPanelCopy;
  isProfileSaving: boolean;
  pendingAction: string | undefined;
  savedWords: UserSavedWord[];
  toggleClosedLabel: string;
  toggleOpenLabel: string;
  onFieldChange: <Key extends keyof DictionaryFormState>(
    key: Key,
    value: DictionaryFormState[Key],
  ) => void;
  onRemove: (word: string) => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onToggle: () => void;
}

export function AccountPanelDictionarySection({
  dictionaryForm,
  dictionarySectionId,
  dictionarySectionOpen,
  dictionarySummary,
  helperCopy,
  isProfileSaving,
  pendingAction,
  savedWords,
  toggleClosedLabel,
  toggleOpenLabel,
  onFieldChange,
  onRemove,
  onSave,
  onToggle,
}: AccountPanelDictionarySectionProps) {
  return (
    <div className="mt-4 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
            {helperCopy.dictionaryTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-(--text-muted)">
            {dictionarySummary}
          </p>
        </div>
        {dictionarySectionOpen ? (
          <button
            type="button"
            onClick={onToggle}
            aria-controls={dictionarySectionId}
            aria-expanded="true"
            aria-label={`${toggleOpenLabel} ${helperCopy.dictionaryTitle}`}
            className="inline-flex items-center rounded-full border border-(--border-soft) bg-(--surface-card) px-4 py-2 text-xs font-medium tracking-[0.18em] text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            {toggleOpenLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-controls={dictionarySectionId}
            aria-expanded="false"
            aria-label={`${toggleClosedLabel} ${helperCopy.dictionaryTitle}`}
            className="inline-flex items-center rounded-full border border-(--border-soft) bg-(--surface-card) px-4 py-2 text-xs font-medium tracking-[0.18em] text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            {toggleClosedLabel}
          </button>
        )}
      </div>

      {dictionarySectionOpen ? (
        <div
          id={dictionarySectionId}
          role="region"
          aria-label={helperCopy.dictionaryTitle}
        >
          <p className="mt-3 text-sm leading-7 text-(--text-muted)">
            {helperCopy.dictionaryIntro}
          </p>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
                <span>{helperCopy.dictionaryWordLabel}</span>
                <input
                  type="text"
                  value={dictionaryForm.word}
                  onChange={(event) => {
                    onFieldChange("word", event.target.value);
                  }}
                  placeholder={helperCopy.dictionaryWordPlaceholder}
                  className="h-12 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
                <span>{helperCopy.dictionaryMeaningLabel}</span>
                <input
                  type="text"
                  value={dictionaryForm.meaning}
                  onChange={(event) => {
                    onFieldChange("meaning", event.target.value);
                  }}
                  placeholder={helperCopy.dictionaryMeaningPlaceholder}
                  className="h-12 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
              <span>{helperCopy.dictionaryNoteLabel}</span>
              <textarea
                rows={3}
                value={dictionaryForm.note}
                onChange={(event) => {
                  onFieldChange("note", event.target.value);
                }}
                placeholder={helperCopy.dictionaryNotePlaceholder}
                className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 py-3 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </label>

            <div className="flex justify-end">
              <Button
                className="h-11 rounded-full px-5"
                disabled={pendingAction === "dictionary" || isProfileSaving}
                onClick={() => {
                  void onSave();
                }}
              >
                {pendingAction === "dictionary" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {helperCopy.dictionaryAddWord}
              </Button>
            </div>
          </div>

          {savedWords.length > 0 ? (
            <div className="mt-5 space-y-3">
              {savedWords.map((entry) => (
                <div
                  key={`${entry.word}-${entry.createdAt}`}
                  className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-(--text-strong)">
                        {entry.word}
                      </p>
                      {entry.meaning ? (
                        <p className="text-sm leading-7 text-(--text-strong)">
                          {entry.meaning}
                        </p>
                      ) : null}
                      {entry.note ? (
                        <p className="text-sm leading-7 text-(--text-muted)">
                          {entry.note}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      className="h-10 rounded-full px-4"
                      disabled={pendingAction === "dictionary" || isProfileSaving}
                      onClick={() => {
                        void onRemove(entry.word);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {helperCopy.dictionaryRemoveWord}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {helperCopy.dictionaryEmpty}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
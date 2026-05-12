import type { ProfileFormState } from "@/components/auth/account-panel-helpers";
import type { AccountPanelCopy } from "@/components/auth/account-panel-copy";

interface AccountPanelPersonalInfoSectionProps {
  formState: ProfileFormState;
  helperCopy: AccountPanelCopy;
  optionalSectionLabel: string;
  profileDetailsOpen: boolean;
  profileDetailsSectionId: string;
  toggleClosedLabel: string;
  toggleOpenLabel: string;
  onFieldChange: <Key extends keyof ProfileFormState>(
    key: Key,
    value: ProfileFormState[Key],
  ) => void;
  onToggle: () => void;
}

export function AccountPanelPersonalInfoSection({
  formState,
  helperCopy,
  optionalSectionLabel,
  profileDetailsOpen,
  profileDetailsSectionId,
  toggleClosedLabel,
  toggleOpenLabel,
  onFieldChange,
  onToggle,
}: AccountPanelPersonalInfoSectionProps) {
  return (
    <div className="mt-8 rounded-[1.75rem] border border-(--border-soft) bg-(--surface-soft) p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="editorial-kicker text-(--accent-amber)">
            {helperCopy.personalInfoTitle}
          </p>
          <p className="mt-4 text-sm leading-7 text-(--text-muted)">
            {helperCopy.personalInfoIntro}
          </p>
        </div>
        {profileDetailsOpen ? (
          <button
            type="button"
            onClick={onToggle}
            aria-controls={profileDetailsSectionId}
            aria-expanded="true"
            aria-label={`${toggleOpenLabel} ${helperCopy.personalInfoTitle}`}
            className="inline-flex items-center rounded-full border border-(--border-soft) bg-(--surface-card) px-4 py-2 text-xs font-medium tracking-[0.18em] text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            {toggleOpenLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-controls={profileDetailsSectionId}
            aria-expanded="false"
            aria-label={`${toggleClosedLabel} ${helperCopy.personalInfoTitle}`}
            className="inline-flex items-center rounded-full border border-(--border-soft) bg-(--surface-card) px-4 py-2 text-xs font-medium tracking-[0.18em] text-(--text-strong) uppercase transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            {toggleClosedLabel}
          </button>
        )}
      </div>

      {!profileDetailsOpen ? (
        <p className="mt-4 text-sm leading-7 text-(--text-muted)">
          {optionalSectionLabel}
        </p>
      ) : (
        <div
          id={profileDetailsSectionId}
          role="region"
          aria-label={helperCopy.personalInfoTitle}
        >
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
              <span>{helperCopy.birthYearLabel}</span>
              <input
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                inputMode="numeric"
                value={formState.birthYear}
                onChange={(event) => {
                  onFieldChange("birthYear", event.target.value);
                }}
                className="h-12 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
              <span>{helperCopy.countryLabel}</span>
              <input
                type="text"
                value={formState.country}
                onChange={(event) => {
                  onFieldChange("country", event.target.value);
                }}
                className="h-12 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
              <span>{helperCopy.cityLabel}</span>
              <input
                type="text"
                value={formState.city}
                onChange={(event) => {
                  onFieldChange("city", event.target.value);
                }}
                className="h-12 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
              <span>{helperCopy.occupationLabel}</span>
              <input
                type="text"
                value={formState.occupation}
                onChange={(event) => {
                  onFieldChange("occupation", event.target.value);
                }}
                className="h-12 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
              <span>{helperCopy.industryLabel}</span>
              <input
                type="text"
                value={formState.industry}
                onChange={(event) => {
                  onFieldChange("industry", event.target.value);
                }}
                className="h-12 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
              <span>{helperCopy.interestsLabel}</span>
              <input
                type="text"
                value={formState.interests}
                onChange={(event) => {
                  onFieldChange("interests", event.target.value);
                }}
                placeholder={helperCopy.interestsPlaceholder}
                className="h-12 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-(--text-strong)">
              <span>{helperCopy.profileUseCaseLabel}</span>
              <textarea
                rows={3}
                value={formState.useCase}
                onChange={(event) => {
                  onFieldChange("useCase", event.target.value);
                }}
                placeholder={helperCopy.profileUseCasePlaceholder}
                className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 py-3 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </label>

            <label className="flex gap-3 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) px-4 py-4">
              <input
                type="checkbox"
                checked={formState.marketingConsent}
                onChange={(event) => {
                  onFieldChange("marketingConsent", event.target.checked);
                }}
                className="mt-1 h-4 w-4 rounded border border-(--border-soft) bg-(--surface-input)"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-(--text-strong)">
                  {helperCopy.marketingConsentLabel}
                </span>
                <span className="block text-sm leading-6 text-(--text-muted)">
                  {helperCopy.marketingConsentHint}
                </span>
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
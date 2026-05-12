import type { ChangeEventHandler, RefObject } from "react";

import Link from "next/link";

import { ImagePlus, LoaderCircle, Trash2, UserRound } from "lucide-react";

import type { AccountPanelCopy } from "@/components/auth/account-panel-copy";
import type { ProfileFormState } from "@/components/auth/account-panel-helpers";
import { getAvatarInitials } from "@/components/auth/account-panel-helpers";
import { AccountPanelPersonalInfoSection } from "@/components/auth/account-panel-personal-info-section";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/locale";
import { getLocalizedPublicPath } from "@/lib/public-paths";

interface AccountPanelOverviewSectionProps {
  activeAvatarUrl?: string;
  accountDescription: string;
  accountEyebrow: string;
  activePlanFieldLabel: string;
  avatarHelperText: string;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  avatarLabel: string;
  avatarRenderFailed: boolean;
  currentStatusFieldLabel: string;
  formState: ProfileFormState;
  hasPaidAccountAccess: boolean;
  hasProfileChanges: boolean;
  helperCopy: AccountPanelCopy;
  isProfilePending: boolean;
  locale: AppLocale;
  optionalSectionLabel: string;
  profileDetailsOpen: boolean;
  profileDetailsSectionId: string;
  profileNameInput: string;
  showAvatarRemove: boolean;
  showAvatarUndo: boolean;
  showSubscriptionLinkedNotice: boolean;
  showSubscriptionPendingNotice: boolean;
  showSubscriptionStatusCard: boolean;
  signOutPending: boolean;
  subscriptionDateDisplay: string;
  subscriptionDateLabel: string;
  subscriptionLinkedDescription: string;
  subscriptionLinkedEyebrow: string;
  subscriptionLinkedHeading: string;
  subscriptionPendingDescription: string;
  subscriptionPendingEyebrow: string;
  subscriptionPendingHeading: string;
  subscriptionPlanLabel: string;
  subscriptionStatusCardDescription: string;
  subscriptionStatusCardTitle: string;
  subscriptionStatusLabel: string;
  toggleClosedLabel: string;
  toggleOpenLabel: string;
  userEmail?: string | null;
  onAvatarChange: ChangeEventHandler<HTMLInputElement>;
  onAvatarClear: () => void;
  onAvatarPick: () => void;
  onAvatarRemove: () => void;
  onAvatarRenderError: () => void;
  onDisplayNameChange: (value: string) => void;
  onProfileDetailsToggle: () => void;
  onProfileFieldChange: <Key extends keyof ProfileFormState>(
    key: Key,
    value: ProfileFormState[Key],
  ) => void;
  onProfileSave: () => void;
  onSignOut: () => void;
}

export function AccountPanelOverviewSection({
  activeAvatarUrl,
  accountDescription,
  accountEyebrow,
  activePlanFieldLabel,
  avatarHelperText,
  avatarInputRef,
  avatarLabel,
  avatarRenderFailed,
  currentStatusFieldLabel,
  formState,
  hasPaidAccountAccess,
  hasProfileChanges,
  helperCopy,
  isProfilePending,
  locale,
  optionalSectionLabel,
  profileDetailsOpen,
  profileDetailsSectionId,
  profileNameInput,
  showAvatarRemove,
  showAvatarUndo,
  showSubscriptionLinkedNotice,
  showSubscriptionPendingNotice,
  showSubscriptionStatusCard,
  signOutPending,
  subscriptionDateDisplay,
  subscriptionDateLabel,
  subscriptionLinkedDescription,
  subscriptionLinkedEyebrow,
  subscriptionLinkedHeading,
  subscriptionPendingDescription,
  subscriptionPendingEyebrow,
  subscriptionPendingHeading,
  subscriptionPlanLabel,
  subscriptionStatusCardDescription,
  subscriptionStatusCardTitle,
  subscriptionStatusLabel,
  toggleClosedLabel,
  toggleOpenLabel,
  userEmail,
  onAvatarChange,
  onAvatarClear,
  onAvatarPick,
  onAvatarRemove,
  onAvatarRenderError,
  onDisplayNameChange,
  onProfileDetailsToggle,
  onProfileFieldChange,
  onProfileSave,
  onSignOut,
}: AccountPanelOverviewSectionProps) {
  return (
    <article className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
      {showSubscriptionLinkedNotice ? (
        <div className="mb-6 rounded-[1.75rem] border border-emerald-400/30 bg-emerald-500/10 px-5 py-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-emerald-200 uppercase">
            {subscriptionLinkedEyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {subscriptionLinkedHeading}
          </h3>
          <p className="mt-2 text-sm leading-7 text-emerald-50/90">
            {subscriptionLinkedDescription}
          </p>
        </div>
      ) : null}

      {showSubscriptionPendingNotice ? (
        <div className="mb-6 rounded-[1.75rem] border border-amber-300/30 bg-amber-500/10 px-5 py-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-100 uppercase">
            {subscriptionPendingEyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {subscriptionPendingHeading}
          </h3>
          <p className="mt-2 text-sm leading-7 text-amber-50/90">
            {subscriptionPendingDescription}
          </p>
        </div>
      ) : null}

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*,.avif,.bmp,.gif,.heic,.heif,.ico,.jfif,.jpeg,.jpg,.png,.svg,.tif,.tiff,.webp"
        className="sr-only"
        aria-label="Profile photo"
        title="Profile photo"
        onChange={onAvatarChange}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="editorial-kicker text-(--accent-sky)">{accountEyebrow}</p>
          <h2 className="font-heading mt-4 text-4xl font-semibold text-(--text-strong)">
            {avatarLabel}
          </h2>
          <p className="mt-3 text-sm text-(--text-muted)">{userEmail}</p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-(--text-muted)">
            {accountDescription}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[2rem] border border-(--border-soft) bg-(--surface-soft) text-lg font-semibold text-(--text-strong)">
              {activeAvatarUrl && !avatarRenderFailed ? (
                <img
                  src={activeAvatarUrl}
                  alt={avatarLabel}
                  className="h-full w-full object-cover"
                  onError={onAvatarRenderError}
                />
              ) : (
                <span>{getAvatarInitials(avatarLabel)}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                disabled={isProfilePending}
                onClick={onAvatarPick}
              >
                <ImagePlus className="h-4 w-4" />
                {helperCopy.avatarPick}
              </Button>

              {showAvatarUndo ? (
                <Button
                  variant="ghost"
                  className="h-10 rounded-full px-4"
                  disabled={isProfilePending}
                  onClick={onAvatarClear}
                >
                  <Trash2 className="h-4 w-4" />
                  {helperCopy.avatarUndo}
                </Button>
              ) : showAvatarRemove ? (
                <Button
                  variant="ghost"
                  className="h-10 rounded-full px-4"
                  disabled={isProfilePending}
                  onClick={onAvatarRemove}
                >
                  <Trash2 className="h-4 w-4" />
                  {helperCopy.avatarRemove}
                </Button>
              ) : null}
            </div>
          </div>

          <p className="max-w-xs text-right text-xs leading-6 text-(--text-muted)">
            {avatarHelperText}
          </p>
        </div>
      </div>

      {showSubscriptionStatusCard ? (
        <div className="mt-8 rounded-[1.75rem] border border-(--border-soft) bg-(--surface-soft) p-5">
          <p className="editorial-kicker text-(--accent-sky)">
            {subscriptionStatusCardTitle}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-(--text-muted)">
            {subscriptionStatusCardDescription}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) p-4">
              <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                {activePlanFieldLabel}
              </p>
              <p className="mt-3 text-xl font-semibold text-(--text-strong)">
                {subscriptionPlanLabel}
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) p-4">
              <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                {currentStatusFieldLabel}
              </p>
              <p className="mt-3 text-xl font-semibold text-(--text-strong)">
                {subscriptionStatusLabel}
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-card) p-4">
              <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                {subscriptionDateLabel}
              </p>
              <p className="mt-3 text-xl font-semibold text-(--text-strong)">
                {subscriptionDateDisplay}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-8 rounded-[1.75rem] border border-(--border-soft) bg-(--surface-soft) p-5">
        <div className="grid gap-3">
          <label
            className="text-sm font-medium text-(--text-strong)"
            htmlFor="profile-display-name"
          >
            {helperCopy.displayNameLabel}
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="profile-display-name"
              type="text"
              value={profileNameInput}
              onChange={(event) => {
                onDisplayNameChange(event.target.value);
              }}
              className="h-12 flex-1 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              placeholder={helperCopy.displayNamePlaceholder}
            />
            <Button
              className="h-12 rounded-[1.25rem] px-5"
              disabled={isProfilePending || !hasProfileChanges}
              onClick={onProfileSave}
            >
              {isProfilePending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <UserRound className="h-4 w-4" />
              )}
              {helperCopy.profileSaveLabel}
            </Button>
          </div>
        </div>
      </div>

      <AccountPanelPersonalInfoSection
        formState={formState}
        helperCopy={helperCopy}
        optionalSectionLabel={optionalSectionLabel}
        profileDetailsOpen={profileDetailsOpen}
        profileDetailsSectionId={profileDetailsSectionId}
        toggleClosedLabel={toggleClosedLabel}
        toggleOpenLabel={toggleOpenLabel}
        onFieldChange={onProfileFieldChange}
        onToggle={onProfileDetailsToggle}
      />

      <div className="mt-8 flex flex-wrap gap-3">
        {!hasPaidAccountAccess ? (
          <Link
            href={getLocalizedPublicPath("/pricing", locale)}
            className="inline-flex h-11 items-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            {helperCopy.accountUpgradeCta}
          </Link>
        ) : null}
        <Button
          variant="ghost"
          className="h-11 rounded-full px-5"
          disabled={signOutPending}
          onClick={onSignOut}
        >
          {helperCopy.signOut}
        </Button>
      </div>
    </article>
  );
}
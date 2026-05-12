import { KeyRound, LoaderCircle, Mail, UserRound } from "lucide-react";

import type { AccountPanelCopy } from "@/components/auth/account-panel-copy";
import type { AuthMode } from "@/components/auth/account-panel-helpers";
import { modes } from "@/components/auth/account-panel-helpers";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/locale";

interface AccountPanelAuthFormProps {
  activationSteps: string[];
  authModeDescription: string;
  checkoutPlanLabel?: string;
  email: string;
  helperCopy: AccountPanelCopy;
  isOAuthPending: boolean;
  isPreCheckoutFlow: boolean;
  locale: AppLocale;
  message?: string;
  mode: AuthMode;
  paidSignupPlan?: string;
  password: string;
  paymentEmailHint?: string;
  pendingAction?: string;
  showOAuthButtons: boolean;
  onEmailChange: (value: string) => void;
  onGitHubSignIn: () => void;
  onGoogleSignIn: () => void;
  onPasswordChange: (value: string) => void;
  onSelectMode: (mode: AuthMode) => void;
  onStatusReset: () => void;
  onSubmit: () => void;
}

export function AccountPanelAuthForm({
  activationSteps,
  authModeDescription,
  checkoutPlanLabel,
  email,
  helperCopy,
  isOAuthPending,
  isPreCheckoutFlow,
  locale,
  message,
  mode,
  paidSignupPlan,
  password,
  paymentEmailHint,
  pendingAction,
  showOAuthButtons,
  onEmailChange,
  onGitHubSignIn,
  onGoogleSignIn,
  onPasswordChange,
  onSelectMode,
  onStatusReset,
  onSubmit,
}: AccountPanelAuthFormProps) {
  return (
    <section className="grid gap-4">
      <article className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl sm:p-8">
        {activationSteps.length > 0 ? (
          <div className="rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) px-5 py-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-(--accent-sky) uppercase">
              {locale === "en"
                ? "Exact next steps"
                : locale === "es"
                  ? "Siguientes pasos exactos"
                  : "Proximos passos exatos"}
            </p>
            <ol className="mt-4 space-y-2 text-sm leading-7 text-(--text-strong)">
              {activationSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-card) text-xs font-semibold text-(--text-strong)">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div
          className={`${activationSteps.length > 0 ? "mt-6" : ""} flex flex-wrap gap-2`}
        >
          {modes.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => {
                onSelectMode(entry);
                onStatusReset();
              }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                mode === entry
                  ? "border-(--border-strong) bg-(--surface-strong) text-(--text-strong)"
                  : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)"
              }`}
            >
              {entry === "sign-in"
                ? helperCopy.signIn
                : entry === "create-account"
                  ? helperCopy.createAccount
                  : helperCopy.useMagicLink}
            </button>
          ))}
        </div>

        <p className="mt-4 rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm leading-7 text-(--text-strong)">
          {authModeDescription}
        </p>

        <div className="mt-6 grid gap-4">
          {showOAuthButtons ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-12 rounded-[1.25rem]"
                  disabled={isOAuthPending}
                  onClick={onGitHubSignIn}
                >
                  {pendingAction === "github" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-sm font-semibold tracking-[0.18em]">
                      GH
                    </span>
                  )}
                  {helperCopy.githubSignIn}
                </Button>

                <Button
                  variant="outline"
                  className="h-12 rounded-[1.25rem]"
                  disabled={isOAuthPending}
                  onClick={onGoogleSignIn}
                >
                  {pendingAction === "google" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-base font-semibold">G</span>
                  )}
                  {helperCopy.googleSignIn}
                </Button>
              </div>

              <div className="flex items-center gap-3 text-xs tracking-[0.24em] text-(--text-muted) uppercase">
                <span className="h-px flex-1 bg-(--border-soft)" />
                <span>
                  {locale === "en"
                    ? "Or use email"
                    : locale === "es"
                      ? "O usa email"
                      : "Ou use email"}
                </span>
                <span className="h-px flex-1 bg-(--border-soft)" />
              </div>
            </>
          ) : null}

          <label
            className="text-sm font-medium text-(--text-strong)"
            htmlFor="account-email"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-(--text-muted)" />
            <input
              id="account-email"
              type="email"
              value={email}
              onChange={(event) => {
                onEmailChange(event.target.value);
              }}
              className="h-12 w-full rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) pr-4 pl-11 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              placeholder="reader@example.com"
            />
          </div>

          {paidSignupPlan ? (
            <p className="text-xs leading-6 text-(--text-muted)">
              {paymentEmailHint}
            </p>
          ) : isPreCheckoutFlow ? (
            <p className="text-xs leading-6 text-(--text-muted)">
              {locale === "en"
                ? `Use the account that should continue to ${checkoutPlanLabel}. Leyendo keeps that same account attached to the upgrade after payment.`
                : locale === "es"
                  ? `Usa la cuenta que debe continuar a ${checkoutPlanLabel}. Leyendo mantiene esa misma cuenta vinculada a la mejora despues del pago.`
                  : `Use a conta que deve continuar para ${checkoutPlanLabel}. O Leyendo mantem essa mesma conta vinculada ao upgrade apos o pagamento.`}
            </p>
          ) : null}

          {mode !== "magic-link" ? (
            <>
              <label
                className="text-sm font-medium text-(--text-strong)"
                htmlFor="account-password"
              >
                {helperCopy.password}
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-(--text-muted)" />
                <input
                  id="account-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    onPasswordChange(event.target.value);
                  }}
                  className="h-12 w-full rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) pr-4 pl-11 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
                  placeholder="At least 6 characters"
                />
              </div>
            </>
          ) : null}

          <Button
            className="mt-2 h-12 rounded-[1.25rem]"
            disabled={
              pendingAction === "auth" ||
              !email ||
              (mode !== "magic-link" && password.length < 6)
            }
            onClick={onSubmit}
          >
            {pendingAction === "auth" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : mode === "magic-link" ? (
              <Mail className="h-4 w-4" />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
            {mode === "sign-in"
              ? helperCopy.signIn
              : mode === "create-account"
                ? helperCopy.createAccount
                : helperCopy.magicLink}
          </Button>

          {message ? (
            <p className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm leading-7 text-(--text-strong)">
              {message}
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
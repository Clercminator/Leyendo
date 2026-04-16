"use client";

import { useEffect } from "react";

import { LoaderCircle, Mail, X } from "lucide-react";

export type GuestAuthDialogMode = "sign-in" | "create-account";

type GuestAuthDialogVariant = "account" | "checkout";
type LocaleCode = "en" | "es" | "pt";

export interface GuestAuthDialogCopy {
  accountRequired: string;
  authFailed: string;
  close: string;
  continueWithEmail: string;
  continueWithGitHub: string;
  continueWithGoogle: string;
  createAccount: string;
  createDescription: string;
  createSuccess: string;
  createTitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailSent: string;
  existingAccount: string;
  eyebrow: string;
  magicLink: string;
  or: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  signInDescription: string;
  signInSuccess: string;
  signInTitle: string;
  submitCreate: string;
  submitSignIn: string;
  useMagicLink: string;
  usePassword: string;
}

interface BuildGuestAuthDialogCopyArgs {
  locale: LocaleCode;
  planLabel?: string;
  variant: GuestAuthDialogVariant;
}

interface GuestAuthDialogProps {
  copy: GuestAuthDialogCopy;
  email: string;
  isAuthLoading: boolean;
  isOpen: boolean;
  mode: GuestAuthDialogMode;
  onClose: () => void;
  onContinueWithEmail: () => void;
  onContinueWithGitHub: () => void;
  onContinueWithGoogle: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSelectCreateAccount: () => void;
  onSelectSignIn: () => void;
  onSubmit: () => void;
  onToggleMagicLink: () => void;
  password: string;
  pendingAction?: string;
  showEmailAuth: boolean;
  statusMessage?: string;
  useMagicLink: boolean;
}

export function getGuestAuthDialogCopy({
  locale,
  planLabel = "Focus",
  variant,
}: BuildGuestAuthDialogCopyArgs): GuestAuthDialogCopy {
  if (variant === "account") {
    if (locale === "es") {
      return {
        accountRequired:
          "Crea tu cuenta gratis de Basic Reader o entra cuando quieras.",
        authFailed: "La autenticacion fallo.",
        close: "Cerrar",
        continueWithEmail: "Continuar con email",
        continueWithGitHub: "Continuar con GitHub",
        continueWithGoogle: "Continuar con Google",
        createAccount: "Crear cuenta",
        createDescription:
          "Crea tu cuenta gratis de Basic Reader ahora. Luego puedes subir a Focus o Max si quieres sincronizacion y palabras guardadas.",
        createSuccess:
          "Cuenta Basic Reader creada. Revisa tu correo si la confirmacion por email esta activa.",
        createTitle: "Crear cuenta gratis",
        emailLabel: "Email",
        emailPlaceholder: "reader@example.com",
        emailSent: "Revisa tu correo. Abre el enlace para entrar a Leyendo.",
        existingAccount: "Entrar",
        eyebrow: "Modo invitado",
        magicLink: "Enviar enlace de acceso",
        or: "o",
        passwordLabel: "Contrasena",
        passwordPlaceholder: "Al menos 6 caracteres",
        signInDescription:
          "Entra con la cuenta Basic Reader que ya usas en Leyendo.",
        signInSuccess: "Entrando...",
        signInTitle: "Entrar a tu cuenta",
        submitCreate: "Crear Basic Reader",
        submitSignIn: "Entrar",
        useMagicLink: "Usar enlace de acceso en su lugar",
        usePassword: "Usar contrasena en su lugar",
      };
    }

    if (locale === "pt") {
      return {
        accountRequired:
          "Crie sua conta gratis de Basic Reader ou entre quando quiser.",
        authFailed: "A autenticacao falhou.",
        close: "Fechar",
        continueWithEmail: "Continuar com email",
        continueWithGitHub: "Continuar com GitHub",
        continueWithGoogle: "Continuar com Google",
        createAccount: "Criar conta",
        createDescription:
          "Crie sua conta gratis de Basic Reader agora. Depois voce pode subir para Focus ou Max se quiser sincronizacao e palavras salvas.",
        createSuccess:
          "Conta Basic Reader criada. Verifique seu email se a confirmacao estiver ativa.",
        createTitle: "Criar conta gratis",
        emailLabel: "Email",
        emailPlaceholder: "reader@example.com",
        emailSent: "Verifique seu email. Abra o link para entrar no Leyendo.",
        existingAccount: "Entrar",
        eyebrow: "Modo convidado",
        magicLink: "Enviar link de acesso",
        or: "ou",
        passwordLabel: "Senha",
        passwordPlaceholder: "Pelo menos 6 caracteres",
        signInDescription:
          "Entre com a conta Basic Reader que voce ja usa no Leyendo.",
        signInSuccess: "Entrando...",
        signInTitle: "Entrar na sua conta",
        submitCreate: "Criar Basic Reader",
        submitSignIn: "Entrar",
        useMagicLink: "Usar link de acesso no lugar",
        usePassword: "Usar senha no lugar",
      };
    }

    return {
      accountRequired:
        "Create your free Basic Reader account or log in whenever you want.",
      authFailed: "Authentication failed.",
      close: "Close",
      continueWithEmail: "Continue with email",
      continueWithGitHub: "Continue with GitHub",
      continueWithGoogle: "Continue with Google",
      createAccount: "Create account",
      createDescription:
        "Create your free Basic Reader account now. Upgrade later only if you want sync and saved words.",
      createSuccess:
        "Basic Reader account created. Check your inbox if email confirmation is enabled.",
      createTitle: "Create free account",
      emailLabel: "Email",
      emailPlaceholder: "reader@example.com",
      emailSent: "Check your inbox. Open the link to sign in to Leyendo.",
      existingAccount: "Log in",
      eyebrow: "Guest mode",
      magicLink: "Send sign-in link",
      or: "or",
      passwordLabel: "Password",
      passwordPlaceholder: "At least 6 characters",
      signInDescription:
        "Log in with the Basic Reader account you already use in Leyendo.",
      signInSuccess: "Signing you in...",
      signInTitle: "Log in to your account",
      submitCreate: "Create Basic Reader",
      submitSignIn: "Log in",
      useMagicLink: "Use a sign-in link instead",
      usePassword: "Use your password instead",
    };
  }

  if (locale === "es") {
    return {
      accountRequired:
        "La compra empieza con una cuenta Basic Reader gratuita.",
      authFailed: "La autenticacion fallo.",
      close: "Cerrar",
      continueWithEmail: "Continuar con email",
      continueWithGitHub: "Continuar con GitHub",
      continueWithGoogle: "Continuar con Google",
      createAccount: "Crear cuenta",
      createDescription: `Tu cuenta comienza en Basic Reader y ${planLabel} se abre justo despues del registro.`,
      createSuccess: `Cuenta Basic Reader creada. Si la confirmacion por email esta activa, abre el mensaje de Leyendo y el checkout continuara a ${planLabel}.`,
      createTitle: "Crear cuenta gratis",
      emailLabel: "Email",
      emailPlaceholder: "reader@example.com",
      emailSent:
        "Revisa tu correo. En cuanto abras el enlace, Leyendo continuara con el checkout.",
      existingAccount: "Entrar",
      eyebrow: `${planLabel} upgrade`,
      magicLink: "Enviar enlace de acceso",
      or: "o",
      passwordLabel: "Contrasena",
      passwordPlaceholder: "Al menos 6 caracteres",
      signInDescription: `Entra con la cuenta que debe recibir ${planLabel} despues del pago.`,
      signInSuccess: "Continuando al checkout...",
      signInTitle: "Entrar para continuar",
      submitCreate: "Crear Basic Reader",
      submitSignIn: "Continuar al pago",
      useMagicLink: "Usar enlace de acceso en su lugar",
      usePassword: "Usar contrasena en su lugar",
    };
  }

  if (locale === "pt") {
    return {
      accountRequired: "A compra comeca com uma conta Basic Reader gratuita.",
      authFailed: "A autenticacao falhou.",
      close: "Fechar",
      continueWithEmail: "Continuar com email",
      continueWithGitHub: "Continuar com GitHub",
      continueWithGoogle: "Continuar com Google",
      createAccount: "Criar conta",
      createDescription: `Sua conta comeca em Basic Reader e ${planLabel} abre logo depois do cadastro.`,
      createSuccess: `Conta Basic Reader criada. Se a confirmacao por email estiver ativa, abra a mensagem do Leyendo e o checkout continuara para ${planLabel}.`,
      createTitle: "Criar conta gratis",
      emailLabel: "Email",
      emailPlaceholder: "reader@example.com",
      emailSent:
        "Verifique seu email. Assim que abrir o link, o Leyendo continua para o checkout.",
      existingAccount: "Entrar",
      eyebrow: `${planLabel} upgrade`,
      magicLink: "Enviar link de acesso",
      or: "ou",
      passwordLabel: "Senha",
      passwordPlaceholder: "Pelo menos 6 caracteres",
      signInDescription: `Entre com a conta que deve receber ${planLabel} depois do pagamento.`,
      signInSuccess: "Continuando para o checkout...",
      signInTitle: "Entrar para continuar",
      submitCreate: "Criar Basic Reader",
      submitSignIn: "Continuar para o pagamento",
      useMagicLink: "Usar link de acesso no lugar",
      usePassword: "Usar senha no lugar",
    };
  }

  return {
    accountRequired: "Paid checkout starts with a free Basic Reader account.",
    authFailed: "Authentication failed.",
    close: "Close",
    continueWithEmail: "Continue with email",
    continueWithGitHub: "Continue with GitHub",
    continueWithGoogle: "Continue with Google",
    createAccount: "Create account",
    createDescription: `Your account starts on Basic Reader, and ${planLabel} opens right after sign-up.`,
    createSuccess: `Basic Reader account created. If email confirmation is enabled, open the Leyendo message and checkout will continue to ${planLabel}.`,
    createTitle: "Create free account",
    emailLabel: "Email",
    emailPlaceholder: "reader@example.com",
    emailSent:
      "Check your inbox. As soon as you open the link, Leyendo continues to checkout.",
    existingAccount: "Log in",
    eyebrow: `${planLabel} upgrade`,
    magicLink: "Send sign-in link",
    or: "or",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 6 characters",
    signInDescription: `Sign in with the account that should receive ${planLabel} after payment.`,
    signInSuccess: "Continuing to checkout...",
    signInTitle: "Log in to continue",
    submitCreate: "Create Basic Reader",
    submitSignIn: "Continue to payment",
    useMagicLink: "Use a sign-in link instead",
    usePassword: "Use your password instead",
  };
}

export function GuestAuthDialog({
  copy,
  email,
  isAuthLoading,
  isOpen,
  mode,
  onClose,
  onContinueWithEmail,
  onContinueWithGitHub,
  onContinueWithGoogle,
  onEmailChange,
  onPasswordChange,
  onSelectCreateAccount,
  onSelectSignIn,
  onSubmit,
  onToggleMagicLink,
  password,
  pendingAction,
  showEmailAuth,
  statusMessage,
  useMagicLink,
}: GuestAuthDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const dialogTitle =
    mode === "create-account" ? copy.createTitle : copy.signInTitle;
  const dialogDescription =
    mode === "create-account" ? copy.createDescription : copy.signInDescription;
  const isEmailActionPending =
    pendingAction === "email" || pendingAction === "magic-link";

  return (
    <div
      className="fixed inset-0 z-125 flex items-center justify-center bg-[rgba(4,9,19,0.74)] px-4 py-6 backdrop-blur-md"
      onClick={() => {
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dialogTitle}
        className="w-full max-w-md rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(13,17,28,0.98),rgba(16,20,30,0.97))] p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.5)]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(86,191,255,0.46),transparent_55%),rgba(14,23,39,0.98)] px-3 py-2 text-[0.68rem] font-semibold tracking-[0.28em] text-[#d8e7ff] uppercase">
            Leyendo
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition hover:bg-white/12"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{copy.close}</span>
          </button>
        </div>

        <div className="mt-6 flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => {
              onSelectSignIn();
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm transition ${
              mode === "sign-in"
                ? "bg-white text-[#10131c]"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            }`}
          >
            {copy.existingAccount}
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectCreateAccount();
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm transition ${
              mode === "create-account"
                ? "bg-white text-[#10131c]"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            }`}
          >
            {copy.createAccount}
          </button>
        </div>

        <p className="mt-6 text-[0.68rem] font-bold tracking-[0.26em] text-[#ffce91] uppercase">
          {copy.eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          {dialogTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/72">
          {dialogDescription}
        </p>

        {!showEmailAuth ? (
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => {
                onContinueWithGoogle();
              }}
              disabled={Boolean(pendingAction) || isAuthLoading}
              className="flex h-12 items-center justify-center rounded-[1rem] border border-white/12 bg-white/6 px-4 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "google" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-base font-semibold">G</span>
              )}
              <span className="ml-2">{copy.continueWithGoogle}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onContinueWithGitHub();
              }}
              disabled={Boolean(pendingAction) || isAuthLoading}
              className="flex h-12 items-center justify-center rounded-[1rem] border border-white/12 bg-white/6 px-4 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction === "github" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-sm font-semibold tracking-[0.18em]">
                  GH
                </span>
              )}
              <span className="ml-2">{copy.continueWithGitHub}</span>
            </button>

            <div className="flex items-center gap-3 py-1 text-[0.68rem] tracking-[0.24em] text-white/45 uppercase">
              <span className="h-px flex-1 bg-white/10" />
              <span>{copy.or}</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={() => {
                onContinueWithEmail();
              }}
              className="flex h-12 items-center justify-center rounded-[1rem] bg-white px-4 text-sm font-semibold text-[#0f1420] transition hover:bg-[#f3f6fb]"
            >
              <Mail className="h-4 w-4" />
              <span className="ml-2">{copy.continueWithEmail}</span>
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-white">
              <span>{copy.emailLabel}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  onEmailChange(event.target.value);
                }}
                placeholder={copy.emailPlaceholder}
                className="h-12 rounded-[1rem] border border-white/12 bg-white/6 px-4 text-white placeholder:text-white/38 focus:border-white/30 focus:outline-none"
              />
            </label>

            {!useMagicLink ? (
              <label className="grid gap-2 text-sm font-medium text-white">
                <span>{copy.passwordLabel}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    onPasswordChange(event.target.value);
                  }}
                  placeholder={copy.passwordPlaceholder}
                  className="h-12 rounded-[1rem] border border-white/12 bg-white/6 px-4 text-white placeholder:text-white/38 focus:border-white/30 focus:outline-none"
                />
              </label>
            ) : null}

            <button
              type="button"
              onClick={() => {
                onSubmit();
              }}
              disabled={
                Boolean(pendingAction) ||
                !email ||
                (!useMagicLink && password.length < 6)
              }
              className="flex h-12 items-center justify-center rounded-[1rem] bg-white px-4 text-sm font-semibold text-[#0f1420] transition hover:bg-[#f3f6fb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEmailActionPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              <span className={isEmailActionPending ? "ml-2" : ""}>
                {useMagicLink
                  ? copy.magicLink
                  : mode === "create-account"
                    ? copy.submitCreate
                    : copy.submitSignIn}
              </span>
            </button>

            {mode === "sign-in" ? (
              <button
                type="button"
                onClick={() => {
                  onToggleMagicLink();
                }}
                className="text-left text-sm text-white/68 transition hover:text-white"
              >
                {useMagicLink ? copy.usePassword : copy.useMagicLink}
              </button>
            ) : null}
          </div>
        )}

        {statusMessage ? (
          <p className="mt-4 rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-7 text-white/84">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

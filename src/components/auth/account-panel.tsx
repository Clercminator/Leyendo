"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  Cloud,
  CloudUpload,
  LoaderCircle,
} from "lucide-react";

import { AccountPanelAuthForm } from "@/components/auth/account-panel-auth-form";
import { AccountPanelDictionarySection } from "@/components/auth/account-panel-dictionary-section";
import { AccountPanelOverviewSection } from "@/components/auth/account-panel-overview-section";
import { getAccountPanelCopy } from "@/components/auth/account-panel-copy";
import { AccountPanelCloudActivitySection } from "@/components/auth/account-panel-cloud-activity-section";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/layout/locale-provider";
import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildPersonalInfoFromForm,
  buildProfileFormState,
  buildSavedWordFromForm,
  createEmptyDictionaryFormState,
  formatDate,
  getReturnUrlParam,
  getSubscriptionDateLabel,
  getSubscriptionStatusLabel,
  isSamePersonalInfo,
  normalizeSavedWordKey,
  normalizeTextInput,
  type AuthMode,
  type DictionaryFormState,
  type ProfileFormState,
} from "@/components/auth/account-panel-helpers";
import {
  getEffectivePlanTier,
  hasPlanAccess,
  type PaidPlanTier,
  type SubscriptionStatus,
} from "@/lib/plans";

interface AccountPanelProps {
  checkoutPlan?: PaidPlanTier;
  checkoutProvider?: "lemonsqueezy" | "mercadopago";
  paidSignupPlan?: PaidPlanTier;
  paidSignupProvider?: "lemonsqueezy" | "mercadopago";
}

export function AccountPanel({
  paidSignupPlan,
  paidSignupProvider,
  checkoutPlan,
  checkoutProvider,
}: AccountPanelProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const {
    errorMessage,
    guestLibrarySummary,
    isConfigured,
    isLoading,
    isOnline = true,
    isProfileSaving,
    lastSyncedAt,
    lastSyncSummary,
    profile,
    refreshProfile,
    signIn,
    signInWithGitHub,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    signUp,
    syncLocalLibraryToCloud,
    syncStatus,
    syncWithCloud,
    updateProfile,
    user,
  } = useSupabaseAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<ProfileFormState>(() =>
    buildProfileFormState(profile),
  );
  const [dictionaryForm, setDictionaryForm] = useState<DictionaryFormState>(
    () => createEmptyDictionaryFormState(),
  );
  const [avatarDraftFile, setAvatarDraftFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>();
  const [avatarRenderFailed, setAvatarRenderFailed] = useState(false);
  const [removeStoredAvatar, setRemoveStoredAvatar] = useState(false);
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false);
  const [dictionarySectionOpen, setDictionarySectionOpen] = useState(false);
  const [cloudActivityOpen, setCloudActivityOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [pendingAction, setPendingAction] = useState<string>();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const mercadoPagoConfirmationStartedRef = useRef(false);
  const profileDetailsSectionId = useId();
  const dictionarySectionId = useId();
  const cloudActivitySectionId = useId();

  const guestDocuments = guestLibrarySummary.documents;
  const pendingSyncCount =
    guestLibrarySummary.documents +
    guestLibrarySummary.sessions +
    guestLibrarySummary.bookmarks +
    guestLibrarySummary.highlights;
  const lastSyncedLabel = formatDate(lastSyncedAt);
  const lastSyncResultLabel = formatDate(lastSyncSummary?.finishedAt);
  const pendingChangesLabel =
    locale === "en"
      ? "Pending local changes"
      : locale === "es"
        ? "Cambios locales pendientes"
        : "Alteracoes locais pendentes";
  const offlineCachedCopy =
    locale === "en"
      ? "Offline. What is already saved on this device stays available."
      : locale === "es"
        ? "Sin conexion. Lo guardado en este dispositivo sigue disponible."
        : "Offline. O que ja esta salvo neste dispositivo continua disponivel.";
  const offlineQueuedCopy =
    locale === "en"
      ? `Offline. ${pendingSyncCount} local change${pendingSyncCount === 1 ? "" : "s"} will retry when the connection returns.`
      : locale === "es"
        ? `Sin conexion. ${pendingSyncCount} cambio${pendingSyncCount === 1 ? "" : "s"} local${pendingSyncCount === 1 ? "" : "es"} se reintentaran cuando vuelva la conexion.`
        : `Offline. ${pendingSyncCount} alteracao${pendingSyncCount === 1 ? "" : "oes"} local${pendingSyncCount === 1 ? "" : "ais"} vai${pendingSyncCount === 1 ? "" : "s"} tentar sincronizar quando a conexao voltar.`;
  const queuedSyncCopy =
    locale === "en"
      ? `${pendingSyncCount} local change${pendingSyncCount === 1 ? "" : "s"} are queued for automatic cloud retry.`
      : locale === "es"
        ? `${pendingSyncCount} cambio${pendingSyncCount === 1 ? "" : "s"} local${pendingSyncCount === 1 ? "" : "es"} estan en cola para sincronizarse automaticamente.`
        : `${pendingSyncCount} alteracao${pendingSyncCount === 1 ? "" : "oes"} local${pendingSyncCount === 1 ? "" : "ais"} estao na fila para sincronizar automaticamente.`;

  useEffect(() => {
    setFormState(buildProfileFormState(profile));
    setDictionaryForm(createEmptyDictionaryFormState());
    setAvatarDraftFile(null);
    setAvatarPreviewUrl(undefined);
    setAvatarRenderFailed(false);
    setRemoveStoredAvatar(false);
  }, [profile?.userId, user?.id]);

  useEffect(() => {
    if ((paidSignupPlan || checkoutPlan) && !user) {
      setMode("create-account");
    }
  }, [checkoutPlan, paidSignupPlan, user]);

  useEffect(() => {
    if (!paidSignupPlan || !user) {
      return;
    }

    void refreshProfile();
  }, [paidSignupPlan, refreshProfile, user]);

  useEffect(() => {
    if (!user || !checkoutPlan || !checkoutProvider || paidSignupPlan) {
      return;
    }

    router.replace(
      `${getLocalizedPublicPath("/pricing", locale)}?checkout=${checkoutPlan}&provider=${checkoutProvider}`,
    );
  }, [checkoutPlan, checkoutProvider, locale, paidSignupPlan, router, user]);

  useEffect(() => {
    if (!avatarDraftFile) {
      setAvatarPreviewUrl(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarDraftFile);
    setAvatarPreviewUrl(objectUrl);
    setAvatarRenderFailed(false);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarDraftFile]);

  const helperCopy = useMemo(() => getAccountPanelCopy(locale), [locale]);
  const pendingBreakdownLabel =
    pendingSyncCount > 0
      ? locale === "en"
        ? `${guestLibrarySummary.documents} docs · ${guestLibrarySummary.sessions} sessions · ${guestLibrarySummary.bookmarks} bookmarks · ${guestLibrarySummary.highlights} highlights waiting to retry.`
        : locale === "es"
          ? `${guestLibrarySummary.documents} docs · ${guestLibrarySummary.sessions} sesiones · ${guestLibrarySummary.bookmarks} marcadores · ${guestLibrarySummary.highlights} destacados pendientes de reintento.`
          : `${guestLibrarySummary.documents} docs · ${guestLibrarySummary.sessions} sessoes · ${guestLibrarySummary.bookmarks} marcadores · ${guestLibrarySummary.highlights} destaques aguardando nova tentativa.`
      : helperCopy.backupDone;

  const paidSignupPlanLabel =
    paidSignupPlan === "max"
      ? "Max"
      : paidSignupPlan === "focus"
        ? "Focus"
        : undefined;
  const checkoutPlanLabel =
    checkoutPlan === "max"
      ? "Max"
      : checkoutPlan === "focus"
        ? "Focus"
        : undefined;
  const isPreCheckoutFlow = Boolean(checkoutPlanLabel && !paidSignupPlan);
  const profileDisplayName = profile?.displayName ?? "";
  const profileNameInput = formState.displayName;
  const activePlanTier = getEffectivePlanTier(profile);
  const hasPaidAccountAccess = hasPlanAccess(profile, "focus");
  const activePaidPlanLabel = activePlanTier === "max" ? "Max" : "Focus";
  const subscriptionPlanTier =
    profile?.planTier === "focus" || profile?.planTier === "max"
      ? profile.planTier
      : activePlanTier === "focus" || activePlanTier === "max"
        ? activePlanTier
        : undefined;
  const subscriptionPlanLabel =
    subscriptionPlanTier === "max"
      ? "Max"
      : subscriptionPlanTier === "focus"
        ? "Focus"
        : undefined;
  const subscriptionStatus =
    profile?.subscriptionStatus ??
    (subscriptionPlanTier
      ? hasPaidAccountAccess
        ? "active"
        : "inactive"
      : undefined);
  const subscriptionStatusLabel = subscriptionStatus
    ? getSubscriptionStatusLabel(locale, subscriptionStatus)
    : undefined;
  const subscriptionDateValue =
    subscriptionStatus === "grace_period"
      ? (profile?.subscriptionGraceUntil ?? profile?.subscriptionExpiresAt)
      : (profile?.subscriptionExpiresAt ?? profile?.subscriptionGraceUntil);
  const subscriptionDateLabel = subscriptionStatus
    ? getSubscriptionDateLabel(locale, subscriptionStatus)
    : locale === "en"
      ? "Renewal date"
      : locale === "es"
        ? "Fecha de renovacion"
        : "Data de renovacao";
  const subscriptionDateDisplay =
    formatDate(subscriptionDateValue, {
      dateStyle: "medium",
      timeStyle: undefined,
    }) ??
    (locale === "en"
      ? "Awaiting provider sync"
      : locale === "es"
        ? "Esperando sincronizacion del proveedor"
        : "Aguardando sincronizacao do provedor");
  const showSubscriptionStatusCard = Boolean(
    subscriptionPlanLabel &&
    (hasPaidAccountAccess || subscriptionStatus || subscriptionDateValue),
  );
  const subscriptionStatusCardTitle =
    locale === "en"
      ? "Subscription status"
      : locale === "es"
        ? "Estado de la suscripcion"
        : "Status da assinatura";
  const subscriptionStatusCardDescription =
    locale === "en"
      ? "Check this card to confirm the paid entitlement, billing state, and renewal window currently attached to this account."
      : locale === "es"
        ? "Consulta esta tarjeta para confirmar la suscripcion pagada, el estado de cobro y la ventana de renovacion que ahora estan vinculados a esta cuenta."
        : "Consulte este cartao para confirmar a assinatura paga, o estado da cobranca e a janela de renovacao agora vinculados a esta conta.";
  const activePlanFieldLabel =
    locale === "en"
      ? "Active plan"
      : locale === "es"
        ? "Plan activo"
        : "Plano ativo";
  const currentStatusFieldLabel =
    locale === "en"
      ? "Current status"
      : locale === "es"
        ? "Estado actual"
        : "Status atual";
  const showSubscriptionPendingNotice = Boolean(
    paidSignupPlan && user && !hasPaidAccountAccess,
  );
  const draftPersonalInfo = buildPersonalInfoFromForm(formState);
  const currentAvatarUrl = removeStoredAvatar ? undefined : profile?.avatarUrl;
  const activeAvatarUrl = avatarPreviewUrl ?? currentAvatarUrl;
  const avatarLabel =
    profileNameInput.trim() ||
    profileDisplayName.trim() ||
    user?.email ||
    "Leyendo";
  const accountEyebrow = hasPaidAccountAccess
    ? helperCopy.accountReady
    : locale === "en"
      ? "Upgrade required"
      : locale === "es"
        ? "Mejora requerida"
        : "Upgrade necessario";
  const accountDescription = hasPaidAccountAccess
    ? helperCopy.accountSync
    : helperCopy.accountUpgradeDetail;
  const hasProfileChanges =
    normalizeTextInput(profileNameInput) !==
      normalizeTextInput(profileDisplayName) ||
    formState.marketingConsent !== (profile?.marketingConsent ?? false) ||
    !isSamePersonalInfo(draftPersonalInfo, profile?.personalInfo) ||
    avatarDraftFile !== null ||
    (removeStoredAvatar && Boolean(profile?.avatarPath));
  const isProfilePending = pendingAction === "profile" || isProfileSaving;
  const avatarHelperText = avatarDraftFile?.name ?? helperCopy.avatarHint;
  const showAvatarUndo = Boolean(avatarDraftFile);
  const showAvatarRemove = Boolean(
    profile?.avatarPath && !removeStoredAvatar && !avatarDraftFile,
  );
  const savedWords = profile?.savedWords ?? [];
  const readerSetupSummary = profile?.readerPreferences
    ? `${profile.readerPreferences.wordsPerMinute} WPM / ${profile.readerPreferences.chunkSize} ${profile.readerPreferences.chunkSize === 1 ? "word" : "words"} / ${profile.readerPreferences.theme}`
    : helperCopy.readerSetupEmpty;
  const showSubscriptionLinkedNotice = Boolean(
    paidSignupPlan && user && hasPaidAccountAccess,
  );
  const subscriptionLinkedEyebrow =
    locale === "en"
      ? "Subscription linked"
      : locale === "es"
        ? "Suscripcion vinculada"
        : "Assinatura vinculada";
  const subscriptionLinkedHeading =
    locale === "en"
      ? `${activePaidPlanLabel} is active on this account.`
      : locale === "es"
        ? `${activePaidPlanLabel} ya esta activa en esta cuenta.`
        : `${activePaidPlanLabel} ja esta ativa nesta conta.`;
  const subscriptionLinkedDescription =
    locale === "en"
      ? `Your ${activePaidPlanLabel} subscription is now linked. Cloud sync, cross-device reading, and the saved-word dictionary are unlocked.`
      : locale === "es"
        ? `Tu suscripcion ${activePaidPlanLabel} ya esta vinculada. La sincronizacion en la nube, la lectura entre dispositivos y el diccionario de palabras guardadas ya estan activos.`
        : `Sua assinatura ${activePaidPlanLabel} ja esta vinculada. A sincronizacao na nuvem, a leitura entre dispositivos e o dicionario de palavras salvas ja estao ativos.`;
  const subscriptionPendingEyebrow =
    locale === "en"
      ? "One step left"
      : locale === "es"
        ? "Falta un paso"
        : "Falta um passo";
  const subscriptionPendingHeading =
    locale === "en"
      ? "This signed-in account is not linked to the new payment yet."
      : locale === "es"
        ? "Esta cuenta iniciada no esta vinculada todavia al nuevo pago."
        : "Esta conta conectada ainda nao esta vinculada ao novo pagamento.";
  const subscriptionPendingDescription =
    locale === "en"
      ? "Stay signed into the Leyendo account that started checkout. If you returned to a different Leyendo account, sign out and use the original one, then wait a moment and reload this page."
      : locale === "es"
        ? "Sigue dentro de la cuenta de Leyendo que inicio el checkout. Si volviste con otra cuenta de Leyendo, cierra sesion y usa la original, luego espera un momento y recarga esta pagina."
        : "Permaneça na conta do Leyendo que iniciou o checkout. Se voce voltou com outra conta do Leyendo, saia e use a original, depois espere um momento e recarregue esta pagina.";
  const activationSteps = isPreCheckoutFlow
    ? locale === "en"
      ? [
          "Create your Basic Reader account or sign in with the account you want to upgrade.",
          `Leyendo continues to the ${checkoutPlanLabel} payment page right after authentication.`,
          "Complete payment and return to this account to confirm the upgraded plan.",
        ]
      : locale === "es"
        ? [
            "Crea tu cuenta Basic Reader o entra con la cuenta que quieres mejorar.",
            `Leyendo continuara a la pagina de pago de ${checkoutPlanLabel} justo despues de la autenticacion.`,
            "Completa el pago y vuelve a esta cuenta para confirmar el plan mejorado.",
          ]
        : [
            "Crie sua conta Basic Reader ou entre com a conta que voce quer atualizar.",
            `O Leyendo vai continuar para a pagina de pagamento de ${checkoutPlanLabel} logo apos a autenticacao.`,
            "Conclua o pagamento e volte para esta conta para confirmar o plano atualizado.",
          ]
    : paidSignupPlan
      ? locale === "en"
        ? [
            "Sign in with the Leyendo account that started this checkout.",
            "If you still need to create that account, finish registration for the account you want linked to this subscription.",
            "Wait for the Subscription linked confirmation before using sync, cloud books, or saved words.",
          ]
        : locale === "es"
          ? [
              "Entra con la cuenta de Leyendo que inicio este checkout.",
              "Si todavia necesitas crearla, termina el registro de la cuenta que quieres vincular a esta suscripcion.",
              "Espera la confirmacion Subscription linked antes de usar sincronizacion, libros en la nube o palabras guardadas.",
            ]
          : [
              "Entre na conta do Leyendo que iniciou este checkout.",
              "Se ainda precisar cria-la, conclua o cadastro da conta que voce quer vincular a esta assinatura.",
              "Espere a confirmacao Subscription linked antes de usar sincronizacao, livros na nuvem ou palavras salvas.",
            ]
      : [];
  const paymentEmailHint =
    locale === "en"
      ? "Use the same Leyendo account that started checkout so the subscription can link automatically."
      : locale === "es"
        ? "Usa la misma cuenta de Leyendo que inicio el checkout para que la suscripcion se vincule automaticamente."
        : "Use a mesma conta do Leyendo que iniciou o checkout para que a assinatura seja vinculada automaticamente.";

  const syncCopy =
    !isOnline
      ? pendingSyncCount > 0
        ? offlineQueuedCopy
        : offlineCachedCopy
      : pendingSyncCount > 0
        ? queuedSyncCopy
        : syncStatus === "syncing"
          ? helperCopy.syncInProgress
          : syncStatus === "synced"
            ? helperCopy.syncSuccess
            : syncStatus === "error"
              ? helperCopy.syncError
              : helperCopy.syncIdle;
  const toggleClosedLabel =
    locale === "en" ? "Show" : locale === "es" ? "Ver" : "Ver";
  const toggleOpenLabel =
    locale === "en" ? "Hide" : locale === "es" ? "Ocultar" : "Ocultar";
  const optionalSectionLabel =
    locale === "en"
      ? "Optional details"
      : locale === "es"
        ? "Detalles opcionales"
        : "Detalhes opcionais";
  const cloudActivityTitle =
    locale === "en"
      ? "Cloud activity"
      : locale === "es"
        ? "Actividad en la nube"
        : "Atividade na nuvem";
  const dictionarySummary =
    savedWords.length > 0
      ? locale === "en"
        ? `${savedWords.length} saved word${savedWords.length === 1 ? "" : "s"}`
        : locale === "es"
          ? `${savedWords.length} palabra${savedWords.length === 1 ? "" : "s"} guardada${savedWords.length === 1 ? "" : "s"}`
          : `${savedWords.length} palavra${savedWords.length === 1 ? "" : "s"} salva${savedWords.length === 1 ? "" : "s"}`
      : helperCopy.dictionaryEmpty;
  const cloudActivitySummary = lastSyncSummary
    ? !isOnline || pendingSyncCount > 0
      ? syncCopy
      : locale === "en"
        ? `${lastSyncSummary.documents} docs · ${lastSyncSummary.sessions} sessions · ${lastSyncResultLabel ?? "recent sync"}`
        : locale === "es"
          ? `${lastSyncSummary.documents} docs · ${lastSyncSummary.sessions} sesiones · ${lastSyncResultLabel ?? "sincronizacion reciente"}`
          : `${lastSyncSummary.documents} docs · ${lastSyncSummary.sessions} sessoes · ${lastSyncResultLabel ?? "sincronizacao recente"}`
    : syncCopy;

  useEffect(() => {
    mercadoPagoConfirmationStartedRef.current = false;
  }, [paidSignupPlan, paidSignupProvider, user?.id]);

  useEffect(() => {
    if (
      mercadoPagoConfirmationStartedRef.current ||
      !paidSignupPlan ||
      !user ||
      hasPaidAccountAccess
    ) {
      return;
    }

    const rawHref = typeof window === "undefined" ? null : window.location.href;
    const currentUrl = rawHref ? new URL(rawHref) : null;
    const paymentId = getReturnUrlParam(currentUrl, rawHref, [
      "collection_id",
      "payment_id",
      "authorized_payment_id",
    ]);
    const subscriptionId = getReturnUrlParam(currentUrl, rawHref, [
      "preapproval_id",
      "subscription_id",
    ]);

    if (paidSignupProvider !== "mercadopago" && !paymentId && !subscriptionId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    mercadoPagoConfirmationStartedRef.current = true;
    let cancelled = false;
    setStatusMessage(helperCopy.mercadoPagoConfirming);

    void (async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = await supabase.functions.invoke(
          "mercado-pago-webhook",
          {
            body: {
              action: "confirm_return",
              paymentId,
              plan: paidSignupPlan,
              subscriptionId,
            },
          },
        );

        if (cancelled) {
          return;
        }

        if (!error) {
          await refreshProfile();

          if (cancelled) {
            return;
          }

          if (
            data &&
            typeof data === "object" &&
            "confirmed" in data &&
            data.confirmed === true
          ) {
            setStatusMessage(helperCopy.mercadoPagoLinked);
            return;
          }
        }

        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      }

      if (!cancelled) {
        setStatusMessage(helperCopy.mercadoPagoPending);
      }
    })().catch(() => {
      if (!cancelled) {
        setStatusMessage(helperCopy.mercadoPagoPending);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    hasPaidAccountAccess,
    helperCopy.mercadoPagoConfirming,
    helperCopy.mercadoPagoLinked,
    helperCopy.mercadoPagoPending,
    paidSignupPlan,
    paidSignupProvider,
    refreshProfile,
    user,
  ]);
  const isOAuthPending =
    pendingAction === "github" || pendingAction === "google";
  const showOAuthButtons = mode !== "magic-link";
  const authModeDescription =
    mode === "sign-in"
      ? helperCopy.signInModeDescription
      : mode === "create-account"
        ? isPreCheckoutFlow
          ? locale === "en"
            ? `Create your Basic Reader account here. Leyendo will continue to the ${checkoutPlanLabel} payment page as soon as you finish signing in.`
            : locale === "es"
              ? `Crea aqui tu cuenta Basic Reader. Leyendo continuara a la pagina de pago de ${checkoutPlanLabel} en cuanto termines de entrar.`
              : `Crie aqui sua conta Basic Reader. O Leyendo vai continuar para a pagina de pagamento de ${checkoutPlanLabel} assim que voce concluir o login.`
          : paidSignupPlan
            ? helperCopy.createAccountModeDescription
            : locale === "en"
              ? "Create your free Basic Reader account here. You can upgrade to Focus or Max after signing in."
              : locale === "es"
                ? "Crea aqui tu cuenta gratuita Basic Reader. Puedes mejorar a Focus o Max despues de entrar."
                : "Crie aqui sua conta gratuita Basic Reader. Voce pode fazer upgrade para Focus ou Max depois do login."
        : helperCopy.emailLinkModeDescription;

  async function handleSubmit() {
    setPendingAction("auth");
    setStatusMessage(undefined);
    const accountRedirectUrl = window.location.href;

    try {
      if (mode === "sign-in") {
        await signIn(email, password);
        setStatusMessage(helperCopy.syncInProgress);
      } else if (mode === "create-account") {
        await signUp(email, password, accountRedirectUrl);
        setStatusMessage(
          isPreCheckoutFlow
            ? locale === "en"
              ? `Basic Reader account created. Check your inbox if email confirmation is enabled, then Leyendo will continue to ${checkoutPlanLabel}.`
              : locale === "es"
                ? `Cuenta Basic Reader creada. Revisa tu correo si la confirmacion por email esta activa y luego Leyendo continuara a ${checkoutPlanLabel}.`
                : `Conta Basic Reader criada. Verifique seu email se a confirmacao estiver ativa e depois o Leyendo continuara para ${checkoutPlanLabel}.`
            : locale === "en"
              ? "Basic Reader account created. Check your inbox if email confirmation is enabled."
              : locale === "es"
                ? "Cuenta Basic Reader creada. Revisa tu correo si la confirmacion por email esta activa."
                : "Conta Basic Reader criada. Verifique seu email se a confirmacao estiver ativa.",
        );
      } else {
        await signInWithMagicLink(email, accountRedirectUrl);
        setStatusMessage(helperCopy.emailSent);
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function handleOAuthSignIn(
    provider: "github" | "google",
    signInWithProvider: (redirectTo?: string) => Promise<void>,
  ) {
    setPendingAction(provider);
    setStatusMessage(undefined);

    try {
      await signInWithProvider(window.location.href);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
      setPendingAction(undefined);
    }
  }

  async function handleBackup() {
    setPendingAction("backup");
    setStatusMessage(undefined);

    try {
      const uploadedCount = await syncLocalLibraryToCloud();
      setStatusMessage(
        uploadedCount > 0
          ? locale === "en"
            ? `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} uploaded to the cloud.`
            : locale === "es"
              ? `${uploadedCount} documento${uploadedCount === 1 ? "" : "s"} subido${uploadedCount === 1 ? "" : "s"} a la nube.`
              : `${uploadedCount} documento${uploadedCount === 1 ? "" : "s"} enviado${uploadedCount === 1 ? "" : "s"} para a nuvem.`
          : helperCopy.backupDone,
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function handleRefreshSync() {
    setPendingAction("sync");
    setStatusMessage(undefined);

    try {
      await syncWithCloud();
      setStatusMessage(helperCopy.syncSuccess);
    } finally {
      setPendingAction(undefined);
    }
  }

  function updateFormField<Key extends keyof ProfileFormState>(
    key: Key,
    value: ProfileFormState[Key],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDictionaryField<Key extends keyof DictionaryFormState>(
    key: Key,
    value: DictionaryFormState[Key],
  ) {
    setDictionaryForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!selectedFile) {
      return;
    }

    setAvatarDraftFile(selectedFile);
    setRemoveStoredAvatar(false);
    setAvatarRenderFailed(false);
    setStatusMessage(undefined);
  }

  async function handleProfileSave() {
    setPendingAction("profile");
    setStatusMessage(undefined);

    try {
      await updateProfile({
        avatarFile: avatarDraftFile,
        displayName: normalizeTextInput(profileNameInput),
        marketingConsent: formState.marketingConsent,
        personalInfo: draftPersonalInfo ?? null,
        removeAvatar: removeStoredAvatar,
      });
      setAvatarDraftFile(null);
      setAvatarPreviewUrl(undefined);
      setAvatarRenderFailed(false);
      setRemoveStoredAvatar(false);
      setStatusMessage(helperCopy.profileSaved);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : helperCopy.profileSaveFallback,
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function handleDictionarySave() {
    const nextEntry = buildSavedWordFromForm(
      dictionaryForm,
      savedWords.find(
        (entry) =>
          normalizeSavedWordKey(entry.word) ===
          normalizeSavedWordKey(dictionaryForm.word),
      ),
    );

    if (!nextEntry) {
      setStatusMessage(helperCopy.dictionaryWordRequired);
      return;
    }

    setPendingAction("dictionary");
    setStatusMessage(undefined);

    try {
      const nextSavedWords = [
        nextEntry,
        ...savedWords.filter(
          (entry) =>
            normalizeSavedWordKey(entry.word) !==
            normalizeSavedWordKey(nextEntry.word),
        ),
      ];

      await updateProfile({
        savedWords: nextSavedWords,
      });
      setDictionaryForm(createEmptyDictionaryFormState());
      setStatusMessage(helperCopy.dictionarySaved);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : helperCopy.profileSaveFallback,
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function handleDictionaryRemove(word: string) {
    setPendingAction("dictionary");
    setStatusMessage(undefined);

    try {
      await updateProfile({
        savedWords: savedWords.filter(
          (entry) =>
            normalizeSavedWordKey(entry.word) !== normalizeSavedWordKey(word),
        ),
      });
      setStatusMessage(helperCopy.dictionaryRemoved);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : helperCopy.profileSaveFallback,
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  if (!isConfigured) {
    return (
      <section className="editorial-panel rounded-[2rem] border border-dashed border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-(--border-soft) bg-(--surface-soft) p-3 text-(--accent-amber)">
            <Cloud className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h2 className="font-heading text-3xl font-semibold text-(--text-strong)">
              Supabase setup required
            </h2>
            <p className="max-w-3xl text-base leading-8 text-(--text-muted)">
              {helperCopy.cloudSignInRequired}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
        <div className="flex items-center gap-3 text-(--text-muted)">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span>
            {locale === "en"
              ? "Checking session..."
              : locale === "es"
                ? "Comprobando sesión..."
                : "Verificando sessao..."}
          </span>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AccountPanelOverviewSection
          activeAvatarUrl={activeAvatarUrl}
          accountDescription={accountDescription}
          accountEyebrow={accountEyebrow}
          activePlanFieldLabel={activePlanFieldLabel}
          avatarHelperText={avatarHelperText}
          avatarInputRef={avatarInputRef}
          avatarLabel={avatarLabel}
          avatarRenderFailed={avatarRenderFailed}
          currentStatusFieldLabel={currentStatusFieldLabel}
          formState={formState}
          hasPaidAccountAccess={hasPaidAccountAccess}
          hasProfileChanges={hasProfileChanges}
          helperCopy={helperCopy}
          isProfilePending={isProfilePending}
          locale={locale}
          optionalSectionLabel={optionalSectionLabel}
          profileDetailsOpen={profileDetailsOpen}
          profileDetailsSectionId={profileDetailsSectionId}
          profileNameInput={profileNameInput}
          showAvatarRemove={showAvatarRemove}
          showAvatarUndo={showAvatarUndo}
          showSubscriptionLinkedNotice={showSubscriptionLinkedNotice}
          showSubscriptionPendingNotice={showSubscriptionPendingNotice}
          showSubscriptionStatusCard={showSubscriptionStatusCard}
          signOutPending={pendingAction === "signout"}
          subscriptionDateDisplay={subscriptionDateDisplay}
          subscriptionDateLabel={subscriptionDateLabel}
          subscriptionLinkedDescription={subscriptionLinkedDescription}
          subscriptionLinkedEyebrow={subscriptionLinkedEyebrow}
          subscriptionLinkedHeading={subscriptionLinkedHeading}
          subscriptionPendingDescription={subscriptionPendingDescription}
          subscriptionPendingEyebrow={subscriptionPendingEyebrow}
          subscriptionPendingHeading={subscriptionPendingHeading}
          subscriptionPlanLabel={subscriptionPlanLabel ?? ""}
          subscriptionStatusCardDescription={subscriptionStatusCardDescription}
          subscriptionStatusCardTitle={subscriptionStatusCardTitle}
          subscriptionStatusLabel={subscriptionStatusLabel ?? ""}
          toggleClosedLabel={toggleClosedLabel}
          toggleOpenLabel={toggleOpenLabel}
          userEmail={user.email}
          onAvatarChange={handleAvatarChange}
          onAvatarClear={() => {
            setAvatarDraftFile(null);
            setAvatarPreviewUrl(undefined);
            setAvatarRenderFailed(false);
          }}
          onAvatarPick={() => {
            avatarInputRef.current?.click();
          }}
          onAvatarRemove={() => {
            setRemoveStoredAvatar(true);
            setAvatarRenderFailed(false);
          }}
          onAvatarRenderError={() => {
            setAvatarRenderFailed(true);
          }}
          onDisplayNameChange={(value) => {
            updateFormField("displayName", value);
          }}
          onProfileDetailsToggle={() => {
            setProfileDetailsOpen((current) => !current);
          }}
          onProfileFieldChange={updateFormField}
          onProfileSave={() => {
            void handleProfileSave();
          }}
          onSignOut={() => {
            setPendingAction("signout");
            void signOut().finally(() => {
              setPendingAction(undefined);
            });
          }}
        />

        <article className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
          {hasPaidAccountAccess ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="editorial-kicker text-(--accent-amber)">
                    {helperCopy.deviceBackup}
                  </p>
                  <h2 className="font-heading mt-4 text-3xl font-semibold text-(--text-strong)">
                    {helperCopy.syncedLibraryTitle}
                  </h2>
                  <p className="mt-4 text-base leading-8 text-(--text-muted)">
                    {helperCopy.accountSync}
                  </p>
                </div>

                <Button
                  className="h-11 rounded-full px-5"
                  disabled={
                    pendingAction === "sync" ||
                    syncStatus === "syncing" ||
                    !isOnline
                  }
                  onClick={() => {
                    void handleRefreshSync();
                  }}
                >
                  {pendingAction === "sync" || syncStatus === "syncing" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4" />
                  )}
                  {helperCopy.refreshSync}
                </Button>
              </div>

              <ul className="mt-6 space-y-3 text-sm leading-7 text-(--text-muted)">
                {helperCopy.syncChecklist.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-(--accent-amber)">*</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-4">
                <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                  {helperCopy.readerSetupTitle}
                </p>
                <p className="mt-3 text-sm leading-7 text-(--text-strong)">
                  {readerSetupSummary}
                </p>
              </div>

              <AccountPanelDictionarySection
                dictionaryForm={dictionaryForm}
                dictionarySectionId={dictionarySectionId}
                dictionarySectionOpen={dictionarySectionOpen}
                dictionarySummary={dictionarySummary}
                helperCopy={helperCopy}
                isProfileSaving={isProfileSaving}
                pendingAction={pendingAction}
                savedWords={savedWords}
                toggleClosedLabel={toggleClosedLabel}
                toggleOpenLabel={toggleOpenLabel}
                onFieldChange={updateDictionaryField}
                onRemove={handleDictionaryRemove}
                onSave={handleDictionarySave}
                onToggle={() => {
                  setDictionarySectionOpen((current) => !current);
                }}
              />

              <AccountPanelCloudActivitySection
                cloudActivityOpen={cloudActivityOpen}
                cloudActivitySectionId={cloudActivitySectionId}
                cloudActivitySummary={cloudActivitySummary}
                cloudActivityTitle={cloudActivityTitle}
                guestDocuments={guestDocuments}
                helperCopy={helperCopy}
                isOnline={isOnline}
                lastSyncedLabel={lastSyncedLabel}
                lastSyncResultLabel={lastSyncResultLabel}
                lastSyncSummary={lastSyncSummary}
                offlineCachedCopy={offlineCachedCopy}
                pendingAction={pendingAction}
                pendingBreakdownLabel={pendingBreakdownLabel}
                pendingChangesLabel={pendingChangesLabel}
                pendingSyncCount={pendingSyncCount}
                syncCopy={syncCopy}
                toggleClosedLabel={toggleClosedLabel}
                toggleOpenLabel={toggleOpenLabel}
                onBackup={handleBackup}
                onToggle={() => {
                  setCloudActivityOpen((current) => !current);
                }}
              />
            </>
          ) : (
            <>
              <p className="editorial-kicker text-(--accent-amber)">
                {locale === "en"
                  ? "Paid account required"
                  : locale === "es"
                    ? "Cuenta pagada requerida"
                    : "Conta paga obrigatoria"}
              </p>
              <h2 className="font-heading mt-4 text-3xl font-semibold text-(--text-strong)">
                {helperCopy.accountUpgradeTitle}
              </h2>
              <p className="mt-4 text-base leading-8 text-(--text-muted)">
                {helperCopy.accountUpgradeDetail}
              </p>

              <ul className="mt-6 space-y-3 text-sm leading-7 text-(--text-muted)">
                {helperCopy.syncChecklist.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-(--accent-amber)">*</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-4">
                <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                  {locale === "en"
                    ? "Current access"
                    : locale === "es"
                      ? "Acceso actual"
                      : "Acesso atual"}
                </p>
                <p className="mt-3 text-sm leading-7 text-(--text-strong)">
                  {locale === "en"
                    ? "Local reading still works, but this sign-in will not sync documents or saved words until Focus or Max is active."
                    : locale === "es"
                      ? "La lectura local sigue funcionando, pero este acceso no sincronizara documentos ni palabras guardadas hasta que Focus o Max esten activos."
                      : "A leitura local continua funcionando, mas este login nao vai sincronizar documentos nem palavras salvas ate que Focus ou Max estejam ativos."}
                </p>
              </div>

              <Link
                href={getLocalizedPublicPath("/pricing", locale)}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                {helperCopy.accountUpgradeCta}
              </Link>
            </>
          )}

          {statusMessage || errorMessage ? (
            <p className="mt-6 rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm leading-7 text-(--text-strong)">
              {statusMessage ?? errorMessage}
            </p>
          ) : null}
        </article>
      </section>
    );
  }

  return (
    <AccountPanelAuthForm
      activationSteps={activationSteps}
      authModeDescription={authModeDescription}
      checkoutPlanLabel={checkoutPlanLabel}
      email={email}
      helperCopy={helperCopy}
      isOAuthPending={isOAuthPending}
      isPreCheckoutFlow={isPreCheckoutFlow}
      locale={locale}
      message={statusMessage ?? errorMessage}
      mode={mode}
      paidSignupPlan={paidSignupPlan}
      password={password}
      paymentEmailHint={paymentEmailHint}
      pendingAction={pendingAction}
      showOAuthButtons={showOAuthButtons}
      onEmailChange={setEmail}
      onGitHubSignIn={() => {
        void handleOAuthSignIn("github", signInWithGitHub);
      }}
      onGoogleSignIn={() => {
        void handleOAuthSignIn("google", signInWithGoogle);
      }}
      onPasswordChange={setPassword}
      onSelectMode={setMode}
      onStatusReset={() => {
        setStatusMessage(undefined);
      }}
      onSubmit={() => {
        void handleSubmit();
      }}
    />
  );
}

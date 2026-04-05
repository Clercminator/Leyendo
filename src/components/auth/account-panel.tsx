"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Cloud,
  CloudUpload,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  Mail,
  Trash2,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/layout/locale-provider";
import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import type { UserPersonalInfo } from "@/lib/supabase/library-sync";

const modes = ["sign-in", "create-account", "magic-link"] as const;
const avatarAccept =
  "image/*,.avif,.bmp,.gif,.heic,.heif,.ico,.jfif,.jpeg,.jpg,.png,.svg,.tif,.tiff,.webp";

type AuthMode = (typeof modes)[number];

interface ProfileFormState {
  birthYear: string;
  city: string;
  country: string;
  displayName: string;
  industry: string;
  interests: string;
  marketingConsent: boolean;
  occupation: string;
  useCase: string;
}

function formatDate(date: string | undefined) {
  if (!date) {
    return undefined;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function buildProfileFormState(profile?: {
  displayName?: string;
  marketingConsent?: boolean;
  personalInfo?: UserPersonalInfo;
}): ProfileFormState {
  return {
    birthYear: profile?.personalInfo?.birthYear?.toString() ?? "",
    city: profile?.personalInfo?.city ?? "",
    country: profile?.personalInfo?.country ?? "",
    displayName: profile?.displayName ?? "",
    industry: profile?.personalInfo?.industry ?? "",
    interests: profile?.personalInfo?.interests?.join(", ") ?? "",
    marketingConsent: profile?.marketingConsent ?? false,
    occupation: profile?.personalInfo?.occupation ?? "",
    useCase: profile?.personalInfo?.useCase ?? "",
  };
}

function normalizeTextInput(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeBirthYearInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(parsed) || parsed < 1900 || parsed > currentYear) {
    return undefined;
  }

  return parsed;
}

function normalizeInterests(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

function buildPersonalInfoFromForm(form: ProfileFormState) {
  const interests = normalizeInterests(form.interests);
  const normalized = {
    birthYear: normalizeBirthYearInput(form.birthYear),
    city: normalizeTextInput(form.city),
    country: normalizeTextInput(form.country),
    industry: normalizeTextInput(form.industry),
    interests: interests.length > 0 ? interests : undefined,
    occupation: normalizeTextInput(form.occupation),
    useCase: normalizeTextInput(form.useCase),
  } satisfies UserPersonalInfo;

  return Object.values(normalized).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== undefined;
  })
    ? normalized
    : undefined;
}

function isSameList(left?: string[], right?: string[]) {
  if (!left?.length && !right?.length) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) => entry === right[index]);
}

function isSamePersonalInfo(
  left: UserPersonalInfo | undefined,
  right: UserPersonalInfo | undefined,
) {
  return (
    left?.birthYear === right?.birthYear &&
    left?.city === right?.city &&
    left?.country === right?.country &&
    left?.industry === right?.industry &&
    left?.occupation === right?.occupation &&
    left?.useCase === right?.useCase &&
    isSameList(left?.interests, right?.interests)
  );
}

function getAvatarInitials(value: string | undefined) {
  const fallback = (value ?? "Leyendo").trim();
  if (!fallback) {
    return "LY";
  }

  const parts = fallback.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part.slice(0, 1).toUpperCase()).join("");

  return initials || fallback.slice(0, 2).toUpperCase();
}

export function AccountPanel() {
  const { locale } = useLocale();
  const {
    errorMessage,
    guestLibrarySummary,
    isConfigured,
    isLoading,
    isProfileSaving,
    lastSyncedAt,
    lastSyncSummary,
    profile,
    signIn,
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
  const [avatarDraftFile, setAvatarDraftFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>();
  const [avatarRenderFailed, setAvatarRenderFailed] = useState(false);
  const [removeStoredAvatar, setRemoveStoredAvatar] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [pendingAction, setPendingAction] = useState<string>();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const guestDocuments = guestLibrarySummary.documents;
  const lastSyncedLabel = formatDate(lastSyncedAt);
  const lastSyncResultLabel = formatDate(lastSyncSummary?.finishedAt);

  useEffect(() => {
    setFormState(buildProfileFormState(profile));
    setAvatarDraftFile(null);
    setAvatarPreviewUrl(undefined);
    setAvatarRenderFailed(false);
    setRemoveStoredAvatar(false);
  }, [profile?.userId, user?.id]);

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

  const helperCopy = useMemo(() => {
    if (locale === "es") {
      return {
        accountReady: "Cuenta conectada",
        accountSync:
          "Tu biblioteca sincronizada aparecerá en cualquier dispositivo donde entres con esta cuenta.",
        avatarHint:
          "La foto se guarda en esta cuenta y se puede reemplazar cuando quieras.",
        avatarPick: "Subir foto",
        avatarRemove: "Quitar foto",
        avatarUndo: "Deshacer cambio de foto",
        backupAction: "Respaldar este dispositivo",
        backupDone:
          "La biblioteca local de este dispositivo ya está en la nube.",
        backupHint:
          "Los documentos que importaste antes de iniciar sesión todavía viven solo en este dispositivo. Puedes subirlos a la nube ahora.",
        birthYearLabel: "Año de nacimiento",
        cityLabel: "Ciudad",
        cloudBookmarks: "Marcadores",
        cloudDocuments: "Docs en la nube",
        cloudHighlights: "Destacados",
        cloudSessions: "Sesiones",
        cloudSignInRequired:
          "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para activar cuentas, sincronización y feedback.",
        createAccount: "Crear cuenta",
        createAccountHint:
          "La sincronización es opcional. Sin cuenta, Leyendo sigue funcionando de forma local.",
        countryLabel: "País",
        deviceBackup: "Respaldo del dispositivo",
        displayNameLabel: "Nombre visible",
        displayNamePlaceholder: "Como quieres aparecer en tu cuenta",
        emailSent:
          "Revisa tu bandeja de entrada. El enlace mágico ya fue enviado.",
        googleSignIn: "Continuar con Google",
        industryLabel: "Industria",
        interestsLabel: "Intereses",
        interestsPlaceholder: "lectura, productividad, educación",
        lastCloudSync: "Última sincronización",
        localOnlyDocs: "Solo en este dispositivo",
        magicLink: "Enviar enlace mágico",
        marketingConsentHint:
          "Permite usar estos datos para recomendaciones personalizadas y futuras promociones.",
        marketingConsentLabel:
          "Acepto recomendaciones personalizadas y futuras promociones.",
        occupationLabel: "Ocupación",
        password: "Contraseña",
        personalInfoIntro:
          "Datos opcionales para análisis de audiencia, segmentación y futuras campañas.",
        personalInfoTitle: "Perfil de audiencia",
        profileSaved: "Perfil actualizado.",
        profileSaveFallback: "El perfil no pudo actualizarse.",
        profileSaveLabel: "Guardar perfil",
        profileUseCaseLabel: "Para qué usas Leyendo",
        profileUseCasePlaceholder:
          "Preparación de exámenes, lectura legal, investigación, práctica de idiomas...",
        refreshSync: "Sincronizar ahora",
        readerSetupEmpty:
          "Abre cualquier documento y ajusta el ritmo o el tema para guardar esa configuración en tu cuenta.",
        readerSetupTitle: "Configuración de lectura sincronizada",
        signIn: "Entrar",
        signOut: "Cerrar sesión",
        syncResultEmpty:
          "Pulsa Sincronizar ahora para confirmar cuántos documentos, sesiones, marcadores y destacados puede restaurar esta cuenta.",
        syncResultTitle: "Resultado de la última sincronización",
        syncChecklist: [
          "Tus documentos importados viajan con esta cuenta.",
          "El progreso de lectura se restaura en otros dispositivos.",
          "Marcadores y destacados vuelven a aparecer sin reimportar el archivo.",
        ],
        syncError: "La sincronización no terminó correctamente.",
        syncIdle: "Listo para sincronizar esta biblioteca con la nube.",
        syncInProgress: "Sincronizando documentos, progreso y marcadores...",
        syncStatusLabel: "Estado de sincronización",
        syncSuccess: "Biblioteca sincronizada.",
        syncedLibraryTitle: "Lo que ya se sincroniza",
        uploadedFromDevice: "Subidos desde este dispositivo",
        useMagicLink: "Usar enlace mágico",
      };
    }

    if (locale === "pt") {
      return {
        accountReady: "Conta conectada",
        accountSync:
          "Sua biblioteca sincronizada aparece em qualquer dispositivo onde voce entrar com esta conta.",
        avatarHint:
          "A foto fica salva nesta conta e pode ser trocada quando voce quiser.",
        avatarPick: "Enviar foto",
        avatarRemove: "Remover foto",
        avatarUndo: "Desfazer troca da foto",
        backupAction: "Enviar esta biblioteca para a nuvem",
        backupDone: "A biblioteca local deste dispositivo ja esta na nuvem.",
        backupHint:
          "Os documentos importados antes do login ainda vivem so neste dispositivo. Voce pode envia-los para a nuvem agora.",
        birthYearLabel: "Ano de nascimento",
        cityLabel: "Cidade",
        cloudBookmarks: "Marcadores",
        cloudDocuments: "Docs na nuvem",
        cloudHighlights: "Destaques",
        cloudSessions: "Sessoes",
        cloudSignInRequired:
          "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar contas, sincronizacao e feedback.",
        createAccount: "Criar conta",
        createAccountHint:
          "A sincronizacao e opcional. Sem conta, o Leyendo continua local.",
        countryLabel: "Pais",
        deviceBackup: "Backup do dispositivo",
        displayNameLabel: "Nome de exibicao",
        displayNamePlaceholder: "Como voce quer aparecer na conta",
        emailSent:
          "Confira sua caixa de entrada. O link magico ja foi enviado.",
        googleSignIn: "Continuar com Google",
        industryLabel: "Industria",
        interestsLabel: "Interesses",
        interestsPlaceholder: "leitura, produtividade, educacao",
        lastCloudSync: "Ultima sincronizacao",
        localOnlyDocs: "So neste dispositivo",
        magicLink: "Enviar link magico",
        marketingConsentHint:
          "Permite usar estes dados para recomendacoes personalizadas e futuras promocoes.",
        marketingConsentLabel:
          "Aceito recomendacoes personalizadas e futuras promocoes.",
        occupationLabel: "Ocupacao",
        password: "Senha",
        personalInfoIntro:
          "Dados opcionais para analise de audiencia, segmentacao e futuras campanhas.",
        personalInfoTitle: "Perfil de audiencia",
        profileSaved: "Perfil atualizado.",
        profileSaveFallback: "Nao foi possivel atualizar o perfil.",
        profileSaveLabel: "Salvar perfil",
        profileUseCaseLabel: "Por que voce usa o Leyendo",
        profileUseCasePlaceholder:
          "Preparacao para prova, leitura juridica, pesquisa, pratica de idioma...",
        refreshSync: "Sincronizar agora",
        readerSetupEmpty:
          "Abra qualquer documento e ajuste ritmo ou tema para salvar essa configuracao na sua conta.",
        readerSetupTitle: "Configuracao de leitura sincronizada",
        signIn: "Entrar",
        signOut: "Sair",
        syncResultEmpty:
          "Use Sincronizar agora para confirmar quantos documentos, sessoes, marcadores e destaques esta conta consegue restaurar.",
        syncResultTitle: "Resultado da ultima sincronizacao",
        syncChecklist: [
          "Seus documentos importados acompanham esta conta.",
          "O progresso de leitura reaparece em outros dispositivos.",
          "Marcadores e destaques voltam sem precisar enviar o arquivo de novo.",
        ],
        syncError: "A sincronizacao nao terminou corretamente.",
        syncIdle: "Pronto para sincronizar esta biblioteca com a nuvem.",
        syncInProgress: "Sincronizando documentos, progresso e marcadores...",
        syncStatusLabel: "Estado da sincronizacao",
        syncSuccess: "Biblioteca sincronizada.",
        syncedLibraryTitle: "O que ja sincroniza",
        uploadedFromDevice: "Enviados deste dispositivo",
        useMagicLink: "Usar link magico",
      };
    }

    return {
      accountReady: "Account connected",
      accountSync:
        "Your synced library will appear on any device where you sign in with this account.",
      avatarHint:
        "The photo is stored on this account and can be replaced whenever you want.",
      avatarPick: "Upload photo",
      avatarRemove: "Remove photo",
      avatarUndo: "Undo photo change",
      backupAction: "Back up this device",
      backupDone: "This device already has its local library in the cloud.",
      backupHint:
        "Documents imported before you signed in still live only on this device. You can upload them to the cloud now.",
      birthYearLabel: "Birth year",
      cityLabel: "City",
      cloudBookmarks: "Bookmarks",
      cloudDocuments: "Cloud docs",
      cloudHighlights: "Highlights",
      cloudSessions: "Sessions",
      cloudSignInRequired:
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable accounts, sync, and feedback.",
      createAccount: "Create account",
      createAccountHint:
        "Sync is optional. Without an account, Leyendo still works locally.",
      countryLabel: "Country",
      deviceBackup: "Device backup",
      displayNameLabel: "Display name",
      displayNamePlaceholder: "How you want this account to appear",
      emailSent: "Check your inbox. The magic link has been sent.",
      googleSignIn: "Continue with Google",
      industryLabel: "Industry",
      interestsLabel: "Interests",
      interestsPlaceholder: "reading, productivity, education",
      lastCloudSync: "Last cloud sync",
      localOnlyDocs: "Local-only docs",
      magicLink: "Send magic link",
      marketingConsentHint:
        "Allow Leyendo to use this profile for personalized recommendations and future promotions.",
      marketingConsentLabel:
        "I consent to personalized recommendations and future promotions.",
      occupationLabel: "Occupation",
      password: "Password",
      personalInfoIntro:
        "Optional details for audience analysis, segmentation, and future campaign targeting.",
      personalInfoTitle: "Audience profile",
      profileSaved: "Profile updated.",
      profileSaveFallback: "Profile could not be updated.",
      profileSaveLabel: "Save profile",
      profileUseCaseLabel: "Why are you using Leyendo?",
      profileUseCasePlaceholder:
        "Exam prep, legal reading, research, language practice...",
      refreshSync: "Sync now",
      readerSetupEmpty:
        "Open any document and adjust pacing or theme once to save that setup to your account.",
      readerSetupTitle: "Synced reader setup",
      signIn: "Sign in",
      signOut: "Sign out",
      syncResultEmpty:
        "Run Sync now to confirm how many documents, sessions, bookmarks, and highlights this account can restore.",
      syncResultTitle: "Last sync result",
      syncChecklist: [
        "Imported documents follow this account across devices.",
        "Reading progress comes back when you open Leyendo elsewhere.",
        "Bookmarks and highlights return without uploading the same file again.",
      ],
      syncError: "Cloud sync did not finish correctly.",
      syncIdle: "Ready to sync this library to the cloud.",
      syncInProgress: "Syncing documents, progress, and anchors...",
      syncStatusLabel: "Sync status",
      syncSuccess: "Library synced.",
      syncedLibraryTitle: "What already syncs",
      uploadedFromDevice: "Uploaded from this device",
      useMagicLink: "Use magic link",
    };
  }, [locale]);

  const profileDisplayName = profile?.displayName ?? "";
  const profileNameInput = formState.displayName;
  const draftPersonalInfo = buildPersonalInfoFromForm(formState);
  const currentAvatarUrl = removeStoredAvatar ? undefined : profile?.avatarUrl;
  const activeAvatarUrl = avatarPreviewUrl ?? currentAvatarUrl;
  const avatarLabel =
    profileNameInput.trim() ||
    profileDisplayName.trim() ||
    user?.email ||
    "Leyendo";
  const hasProfileChanges =
    normalizeTextInput(profileNameInput) !==
      normalizeTextInput(profileDisplayName) ||
    formState.marketingConsent !== (profile?.marketingConsent ?? false) ||
    !isSamePersonalInfo(draftPersonalInfo, profile?.personalInfo) ||
    avatarDraftFile !== null ||
    (removeStoredAvatar && Boolean(profile?.avatarPath));
  const readerSetupSummary = profile?.readerPreferences
    ? `${profile.readerPreferences.wordsPerMinute} WPM / ${profile.readerPreferences.chunkSize} ${profile.readerPreferences.chunkSize === 1 ? "word" : "words"} / ${profile.readerPreferences.theme}`
    : helperCopy.readerSetupEmpty;

  const syncCopy =
    syncStatus === "syncing"
      ? helperCopy.syncInProgress
      : syncStatus === "synced"
        ? helperCopy.syncSuccess
        : syncStatus === "error"
          ? helperCopy.syncError
          : helperCopy.syncIdle;

  async function handleSubmit() {
    setPendingAction("auth");
    setStatusMessage(undefined);

    try {
      if (mode === "sign-in") {
        await signIn(email, password);
        setStatusMessage(helperCopy.syncInProgress);
      } else if (mode === "create-account") {
        await signUp(email, password);
        setStatusMessage(
          locale === "en"
            ? "Account created. Check your inbox if email confirmation is enabled."
            : locale === "es"
              ? "Cuenta creada. Revisa tu correo si la confirmación por email está activa."
              : "Conta criada. Verifique seu email se a confirmacao estiver ativa.",
        );
      } else {
        await signInWithMagicLink(email);
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

  async function handleGoogleSignIn() {
    setPendingAction("google");
    setStatusMessage(undefined);

    try {
      await signInWithGoogle();
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
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
          <input
            ref={avatarInputRef}
            type="file"
            accept={avatarAccept}
            className="sr-only"
            aria-label="Profile photo"
            title="Profile photo"
            onChange={handleAvatarChange}
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="editorial-kicker text-(--accent-sky)">
                {helperCopy.accountReady}
              </p>
              <h2 className="font-heading mt-4 text-4xl font-semibold text-(--text-strong)">
                {avatarLabel}
              </h2>
              <p className="mt-3 text-sm text-(--text-muted)">{user.email}</p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-(--text-muted)">
                {helperCopy.accountSync}
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
                      onError={() => {
                        setAvatarRenderFailed(true);
                      }}
                    />
                  ) : (
                    <span>{getAvatarInitials(avatarLabel)}</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-full px-5"
                    disabled={pendingAction === "profile" || isProfileSaving}
                    onClick={() => {
                      avatarInputRef.current?.click();
                    }}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {helperCopy.avatarPick}
                  </Button>

                  {avatarDraftFile ? (
                    <Button
                      variant="ghost"
                      className="h-10 rounded-full px-4"
                      disabled={pendingAction === "profile" || isProfileSaving}
                      onClick={() => {
                        setAvatarDraftFile(null);
                        setAvatarPreviewUrl(undefined);
                        setAvatarRenderFailed(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {helperCopy.avatarUndo}
                    </Button>
                  ) : profile?.avatarPath && !removeStoredAvatar ? (
                    <Button
                      variant="ghost"
                      className="h-10 rounded-full px-4"
                      disabled={pendingAction === "profile" || isProfileSaving}
                      onClick={() => {
                        setRemoveStoredAvatar(true);
                        setAvatarRenderFailed(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {helperCopy.avatarRemove}
                    </Button>
                  ) : null}
                </div>
              </div>

              <p className="max-w-xs text-right text-xs leading-6 text-(--text-muted)">
                {avatarDraftFile?.name ?? helperCopy.avatarHint}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3">
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
                  updateFormField("displayName", event.target.value);
                }}
                className="h-12 flex-1 rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
                placeholder={helperCopy.displayNamePlaceholder}
              />
              <Button
                className="h-12 rounded-[1.25rem] px-5"
                disabled={
                  pendingAction === "profile" ||
                  isProfileSaving ||
                  !hasProfileChanges
                }
                onClick={() => {
                  void handleProfileSave();
                }}
              >
                {pendingAction === "profile" || isProfileSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <UserRound className="h-4 w-4" />
                )}
                {helperCopy.profileSaveLabel}
              </Button>
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-(--border-soft) bg-(--surface-soft) p-5">
            <p className="editorial-kicker text-(--accent-amber)">
              {helperCopy.personalInfoTitle}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-(--text-muted)">
              {helperCopy.personalInfoIntro}
            </p>

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
                    updateFormField("birthYear", event.target.value);
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
                    updateFormField("country", event.target.value);
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
                    updateFormField("city", event.target.value);
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
                    updateFormField("occupation", event.target.value);
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
                    updateFormField("industry", event.target.value);
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
                    updateFormField("interests", event.target.value);
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
                    updateFormField("useCase", event.target.value);
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
                    updateFormField("marketingConsent", event.target.checked);
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

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              className="h-11 rounded-full px-5"
              disabled={pendingAction === "sync" || syncStatus === "syncing"}
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
            <Button
              variant="outline"
              className="h-11 rounded-full px-5"
              disabled={pendingAction === "backup" || guestDocuments === 0}
              onClick={() => {
                void handleBackup();
              }}
            >
              {pendingAction === "backup" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
              )}
              {helperCopy.backupAction}
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-full px-5"
              disabled={pendingAction === "signout"}
              onClick={() => {
                setPendingAction("signout");
                void signOut().finally(() => {
                  setPendingAction(undefined);
                });
              }}
            >
              {helperCopy.signOut}
            </Button>
          </div>
        </article>

        <article className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
          <p className="editorial-kicker text-(--accent-amber)">
            {helperCopy.deviceBackup}
          </p>
          <h2 className="font-heading mt-4 text-3xl font-semibold text-(--text-strong)">
            {helperCopy.syncedLibraryTitle}
          </h2>
          <p className="mt-4 text-base leading-8 text-(--text-muted)">
            {helperCopy.accountSync}
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
              {helperCopy.readerSetupTitle}
            </p>
            <p className="mt-3 text-sm leading-7 text-(--text-strong)">
              {readerSetupSummary}
            </p>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs tracking-[0.24em] text-(--accent-sky) uppercase">
                {helperCopy.syncResultTitle}
              </p>
              <p className="text-xs text-(--text-muted)">
                {lastSyncResultLabel ?? "-"}
              </p>
            </div>

            {lastSyncSummary ? (
              <>
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
              </>
            ) : (
              <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                {helperCopy.syncResultEmpty}
              </p>
            )}
          </div>

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
                {helperCopy.localOnlyDocs}
              </p>
              <p className="mt-3 text-3xl font-semibold text-(--text-strong)">
                {guestDocuments}
              </p>
              <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                {guestDocuments > 0
                  ? helperCopy.backupHint
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
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
        <p className="editorial-kicker text-(--accent-sky)">
          Optional cloud account
        </p>
        <h2 className="font-heading mt-4 text-4xl font-semibold text-(--text-strong)">
          {helperCopy.createAccountHint}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-(--text-muted)">
          {locale === "en"
            ? "Sign in only if you want your documents, reading progress, bookmarks, and highlights to follow you across devices."
            : locale === "es"
              ? "Inicia sesión solo si quieres que tus documentos, progreso, marcadores y destacados te acompañen entre dispositivos."
              : "Entre apenas se quiser que seus documentos, progresso, marcadores e destaques acompanhem voce entre dispositivos."}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {modes.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => {
                setMode(entry);
                setStatusMessage(undefined);
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

        <div className="mt-8 grid gap-4">
          <Button
            variant="outline"
            className="h-12 rounded-[1.25rem]"
            disabled={pendingAction === "google"}
            onClick={() => {
              void handleGoogleSignIn();
            }}
          >
            {pendingAction === "google" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-base font-semibold">G</span>
            )}
            {helperCopy.googleSignIn}
          </Button>

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
                setEmail(event.target.value);
              }}
              className="h-12 w-full rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) pr-4 pl-11 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              placeholder="reader@example.com"
            />
          </div>

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
                    setPassword(event.target.value);
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
            onClick={() => {
              void handleSubmit();
            }}
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

          {statusMessage || errorMessage ? (
            <p className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm leading-7 text-(--text-strong)">
              {statusMessage ?? errorMessage}
            </p>
          ) : null}
        </div>
      </article>

      <article className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
        <p className="editorial-kicker text-(--accent-amber)">Why sign in?</p>
        <ul className="mt-6 space-y-4 text-base leading-8 text-(--text-muted)">
          <li>
            {locale === "en"
              ? "Keep the same library across desktop, laptop, and phone."
              : locale === "es"
                ? "Mantener la misma biblioteca entre escritorio, portatil y telefono."
                : "Manter a mesma biblioteca entre desktop, notebook e telefone."}
          </li>
          <li>
            {locale === "en"
              ? "Sync progress, bookmarks, and highlights after you come back on another device."
              : locale === "es"
                ? "Sincronizar progreso, marcadores y destacados cuando vuelves en otro dispositivo."
                : "Sincronizar progresso, marcadores e destaques quando voce volta em outro dispositivo."}
          </li>
          <li>
            {locale === "en"
              ? "Keep using Leyendo as a guest if you only want local reading on this device."
              : locale === "es"
                ? "Seguir usando Leyendo como invitado si solo quieres lectura local en este dispositivo."
                : "Continuar usando o Leyendo como convidado se quiser leitura local apenas neste dispositivo."}
          </li>
        </ul>
      </article>
    </section>
  );
}

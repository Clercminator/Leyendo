import type { AppLocale } from "@/lib/locale";

export function getAccountPanelCopy(locale: AppLocale) {
  if (locale === "es") {
    return {
      accountReady: "Cuenta conectada",
      accountSync:
        "Tu biblioteca sincronizada aparecerá en cualquier dispositivo donde entres con esta cuenta.",
      accountUpgradeCta: "Ver planes pagados",
      accountUpgradeDetail:
        "La sincronizacion entre dispositivos, el respaldo en la nube y el diccionario de palabras guardadas solo se activan con Focus o Max.",
      accountUpgradeTitle:
        "Activa Focus o Max para usar la cuenta en la nube",
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
        "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY para activar cuentas, sincronización y feedback.",
      createAccount: "Crear cuenta",
      createAccountHint:
        "Focus o Max son obligatorios para crear una cuenta con sincronizacion y palabras guardadas.",
      countryLabel: "País",
      deviceBackup: "Respaldo del dispositivo",
      dictionaryAddWord: "Guardar palabra",
      dictionaryEmpty:
        "Todavia no guardaste palabras. Agrega tu primer termino y su significado aqui.",
      dictionaryIntro:
        "Guarda vocabulario, significado y contexto en esta cuenta. Focus y Max lo mantienen sincronizado.",
      dictionaryMeaningLabel: "Significado",
      dictionaryMeaningPlaceholder: "Que significa esta palabra para ti",
      dictionaryNoteLabel: "Contexto o nota",
      dictionaryNotePlaceholder: "Donde la viste o como quieres recordarla",
      dictionaryRemoved: "Palabra eliminada del diccionario.",
      dictionaryRemoveWord: "Quitar",
      dictionarySaved: "Palabra guardada en tu diccionario.",
      dictionaryTitle: "Diccionario de palabras guardadas",
      dictionaryWordLabel: "Palabra",
      dictionaryWordRequired:
        "Escribe una palabra antes de guardarla en el diccionario.",
      dictionaryWordPlaceholder: "serendipia",
      displayNameLabel: "Nombre visible",
      displayNamePlaceholder: "Como quieres aparecer en tu cuenta",
      emailLinkModeDescription:
        "Te enviaremos un enlace de acceso de un solo uso a tu email. No necesitas contrasena, pero este acceso es solo para cuentas que ya existen.",
      emailSent:
        "Revisa tu bandeja de entrada. Ya enviamos un enlace de acceso de un solo uso.",
      githubSignIn: "Continuar con GitHub",
      googleSignIn: "Continuar con Google",
      industryLabel: "Industria",
      interestsLabel: "Intereses",
      interestsPlaceholder: "lectura, productividad, educación",
      lastCloudSync: "Última sincronización",
      localOnlyDocs: "Solo en este dispositivo",
      magicLink: "Enviar enlace de acceso por email",
      mercadoPagoConfirming:
        "MercadoPago ya aprobó el pago. Leyendo está confirmando ahora la suscripción en esta cuenta.",
      mercadoPagoLinked:
        "Pago de MercadoPago confirmado. Esta cuenta está actualizando el nuevo plan.",
      mercadoPagoPending:
        "MercadoPago aprobó el pago, pero la suscripción todavía se está sincronizando. Espera un momento y vuelve a cargar esta página si el plan aún no aparece.",
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
      signInModeDescription:
        "Usa tu email y contraseña si ya creaste una cuenta.",
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
      useMagicLink: "Enlace por email",
      createAccountModeDescription:
        "Termina la configuracion de tu cuenta pagada con email y contrasena para activar Focus o Max.",
    };
  }

  if (locale === "pt") {
    return {
      accountReady: "Conta conectada",
      accountSync:
        "Sua biblioteca sincronizada aparece em qualquer dispositivo onde voce entrar com esta conta.",
      accountUpgradeCta: "Ver planos pagos",
      accountUpgradeDetail:
        "Sincronizacao entre dispositivos, backup na nuvem e dicionario de palavras salvas so sao ativados com Focus ou Max.",
      accountUpgradeTitle: "Ative Focus ou Max para usar a conta em nuvem",
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
        "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar contas, sincronizacao e feedback.",
      createAccount: "Criar conta",
      createAccountHint:
        "Focus ou Max sao obrigatorios para criar uma conta com sincronizacao e palavras salvas.",
      countryLabel: "Pais",
      deviceBackup: "Backup do dispositivo",
      dictionaryAddWord: "Salvar palavra",
      dictionaryEmpty:
        "Voce ainda nao salvou palavras. Adicione o primeiro termo e significado aqui.",
      dictionaryIntro:
        "Guarde vocabulario, significado e contexto nesta conta. Focus e Max mantem tudo sincronizado.",
      dictionaryMeaningLabel: "Significado",
      dictionaryMeaningPlaceholder: "O que essa palavra quer dizer para voce",
      dictionaryNoteLabel: "Contexto ou nota",
      dictionaryNotePlaceholder:
        "Onde voce viu a palavra ou como quer lembrar dela",
      dictionaryRemoved: "Palavra removida do dicionario.",
      dictionaryRemoveWord: "Remover",
      dictionarySaved: "Palavra salva no dicionario.",
      dictionaryTitle: "Dicionario de palavras salvas",
      dictionaryWordLabel: "Palavra",
      dictionaryWordRequired:
        "Escreva uma palavra antes de salvar no dicionario.",
      dictionaryWordPlaceholder: "serendipidade",
      displayNameLabel: "Nome de exibicao",
      displayNamePlaceholder: "Como voce quer aparecer na conta",
      emailLinkModeDescription:
        "Vamos enviar um link unico de acesso para seu email. Nao precisa de senha, mas este acesso vale apenas para contas que ja existem.",
      emailSent:
        "Confira sua caixa de entrada. Enviamos um link unico de acesso.",
      githubSignIn: "Continuar com GitHub",
      googleSignIn: "Continuar com Google",
      industryLabel: "Industria",
      interestsLabel: "Interesses",
      interestsPlaceholder: "leitura, produtividade, educacao",
      lastCloudSync: "Ultima sincronizacao",
      localOnlyDocs: "So neste dispositivo",
      magicLink: "Enviar link de acesso por email",
      mercadoPagoConfirming:
        "O MercadoPago ja aprovou o pagamento. O Leyendo esta confirmando agora a assinatura nesta conta.",
      mercadoPagoLinked:
        "Pagamento do MercadoPago confirmado. Esta conta esta atualizando o novo plano.",
      mercadoPagoPending:
        "O MercadoPago aprovou o pagamento, mas a assinatura ainda esta sincronizando. Espere um momento e recarregue esta pagina se o plano ainda nao aparecer.",
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
      signInModeDescription:
        "Use seu email e senha se voce ja criou uma conta.",
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
      useMagicLink: "Link por email",
      createAccountModeDescription:
        "Conclua a configuracao da sua conta paga com email e senha para ativar Focus ou Max.",
    };
  }

  return {
    accountReady: "Account connected",
    accountSync:
      "Your synced library will appear on any device where you sign in with this account.",
    accountUpgradeCta: "See paid plans",
    accountUpgradeDetail:
      "Cross-device sync, cloud backup, and the saved-word dictionary only unlock on Focus or Max.",
    accountUpgradeTitle: "Activate Focus or Max to use this cloud account",
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
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY to enable accounts, sync, and feedback.",
    createAccount: "Create account",
    createAccountHint:
      "Focus or Max is required to create an account with sync and saved words.",
    countryLabel: "Country",
    deviceBackup: "Device backup",
    dictionaryAddWord: "Save word",
    dictionaryEmpty:
      "You have not saved any words yet. Add your first term and meaning here.",
    dictionaryIntro:
      "Keep vocabulary, meaning, and context on this account. Focus and Max keep it synced across devices.",
    dictionaryMeaningLabel: "Meaning",
    dictionaryMeaningPlaceholder: "What this word means to you",
    dictionaryNoteLabel: "Context or note",
    dictionaryNotePlaceholder:
      "Where you saw it or how you want to remember it",
    dictionaryRemoved: "Word removed from your dictionary.",
    dictionaryRemoveWord: "Remove",
    dictionarySaved: "Word saved to your dictionary.",
    dictionaryTitle: "Saved-word dictionary",
    dictionaryWordLabel: "Word",
    dictionaryWordRequired: "Enter a word before saving it.",
    dictionaryWordPlaceholder: "serendipity",
    displayNameLabel: "Display name",
    displayNamePlaceholder: "How you want this account to appear",
    emailLinkModeDescription:
      "We'll email you a one-time sign-in link. No password needed, but this only works for accounts that already exist.",
    emailSent: "Check your inbox. We sent a one-time sign-in link.",
    githubSignIn: "Continue with GitHub",
    googleSignIn: "Continue with Google",
    industryLabel: "Industry",
    interestsLabel: "Interests",
    interestsPlaceholder: "reading, productivity, education",
    lastCloudSync: "Last cloud sync",
    localOnlyDocs: "Local-only docs",
    magicLink: "Send email sign-in link",
    mercadoPagoConfirming:
      "MercadoPago approved the payment. Leyendo is confirming the subscription on this account now.",
    mercadoPagoLinked:
      "MercadoPago payment confirmed. This account is refreshing the new plan now.",
    mercadoPagoPending:
      "MercadoPago approved the payment, but the subscription is still syncing. Wait a moment and reload this page if the plan does not appear yet.",
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
    signInModeDescription:
      "Use your email and password if you already created an account.",
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
    useMagicLink: "Email link",
    createAccountModeDescription:
      "Finish setting up your paid account with email and password to unlock Focus or Max.",
  };
}

export type AccountPanelCopy = ReturnType<typeof getAccountPanelCopy>;
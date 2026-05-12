"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Check, Coins, CreditCard, Globe2 } from "lucide-react";

import {
  GuestAuthDialog,
  getGuestAuthDialogCopy,
} from "@/components/auth/guest-auth-dialog";
import { PricingBinanceDialog } from "@/components/pricing/pricing-binance-dialog";
import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { useLocale } from "@/components/layout/locale-provider";
import { focusFileUploadLimit, freeFileUploadLimit } from "@/lib/plans";
import { getLocalizedPublicPath } from "@/lib/public-paths";

type PaymentRegion = "global" | "latam";
type PaymentProvider = "binance" | "lemonsqueezy" | "mercadopago";
type PlanId = "basic" | "focus" | "max";
type PaidPlanId = Exclude<PlanId, "basic">;
type HostedPaymentProvider = Exclude<PaymentProvider, "binance">;

const paymentRegionStorageKey = "leyendo_payment_region";
const paidSignupPlanStorageKey = "leyendo_paid_signup_plan";
const pendingCheckoutPlanStorageKey = "leyendo_pending_checkout_plan";
const pendingCheckoutProviderStorageKey = "leyendo_pending_checkout_provider";
const latamCountryCodes = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "SV",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PY",
  "PE",
  "UY",
  "VE",
]);

interface Copy {
  basicCta: string;
  basicDescription: string;
  basicTag: string;
  bestValue: string;
  binanceCta: string;
  binanceDialogHint: string;
  binanceDialogTitle: string;
  close: string;
  comparisonEyebrow: string;
  continueToAccount: string;
  continueToAccountHint: string;
  contactDavid: string;
  focusCta: string;
  focusDescription: string;
  globalState: string;
  globalSwitch: string;
  heroDescription: string;
  heroTitle: string;
  latamState: string;
  latamSwitch: string;
  maxCta: string;
  maxDescription: string;
  invalidMercadoPagoProvider: string;
  missingProvider: string;
  paymentSuccess: string;
  paymentNote: string;
  priceSuffix: string;
}

function detectInitialRegion(locale: "en" | "es" | "pt"): PaymentRegion {
  if (typeof window === "undefined") {
    return locale === "en" ? "global" : "latam";
  }

  const storedRegion = window.localStorage.getItem(paymentRegionStorageKey);
  if (storedRegion === "latam" || storedRegion === "global") {
    return storedRegion;
  }

  const browserLocale = window.navigator.language;
  const regionCode = browserLocale.split("-")[1]?.toUpperCase();

  if (regionCode && latamCountryCodes.has(regionCode)) {
    return "latam";
  }

  return locale === "en" ? "global" : "latam";
}

function cardClassName(planId: PlanId) {
  const baseClassName =
    "relative flex h-full flex-col rounded-4xl border bg-[rgba(24,25,31,0.96)] p-7 text-white shadow-[0_12px_36px_rgba(0,0,0,0.28)] transition-transform duration-200 lg:p-8";

  if (planId === "basic") {
    return `${baseClassName} border-[#2f80ff] ring-1 ring-[#2f80ff]/40`;
  }

  if (planId === "max") {
    return `${baseClassName} border-white/55 shadow-[0_18px_50px_rgba(0,0,0,0.34)] lg:-translate-y-2`;
  }

  return `${baseClassName} border-white/8`;
}

function primaryButtonClass(planId: PlanId) {
  if (planId === "basic") {
    return "flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#162541] px-5 py-4 text-sm font-bold text-[#2f80ff] transition-all hover:scale-[1.02] hover:bg-[#1b3158] active:scale-[0.98]";
  }

  if (planId === "max") {
    return "flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:bg-zinc-100 active:scale-[0.98] shadow-xl shadow-black/20";
  }

  return "flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#2c2d33] px-5 py-4 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:bg-[#35363d] active:scale-[0.98]";
}

function topBadgeClass(planId: PlanId) {
  if (planId === "basic") {
    return "bg-[#2f80ff] text-white";
  }

  return "bg-white text-black";
}

interface PricingPageContentProps {
  initialCheckoutPlan?: string;
  initialCheckoutProvider?: string;
  initialPlanId?: string;
  initialPaymentStatus?: string;
}

function isHostedPaymentProvider(
  value: unknown,
): value is HostedPaymentProvider {
  return value === "lemonsqueezy" || value === "mercadopago";
}

function isPaidPlanId(value: unknown): value is PaidPlanId {
  return value === "focus" || value === "max";
}

function buildPaidAccountHref(
  planId: PaidPlanId,
  provider?: HostedPaymentProvider,
) {
  const searchParams = new URLSearchParams({
    payment: "success",
    plan: planId,
  });

  if (provider) {
    searchParams.set("provider", provider);
  }

  return `/account?${searchParams.toString()}`;
}

export function PricingPageContent({
  initialCheckoutPlan,
  initialCheckoutProvider,
  initialPlanId,
  initialPaymentStatus,
}: PricingPageContentProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const {
    isConfigured: isAuthConfigured,
    isLoading: isAuthLoading,
    signIn,
    signInWithGitHub,
    signInWithGoogle,
    signInWithMagicLink,
    signUp,
    user,
  } = useSupabaseAuth();
  const checkoutResumeStartedRef = useRef(false);
  const paymentReturnHandledRef = useRef(false);
  const [paymentRegion, setPaymentRegion] = useState<PaymentRegion>(() =>
    detectInitialRegion(locale),
  );
  const [statusMessage, setStatusMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [readySignupPlan, setReadySignupPlan] = useState<PaidPlanId | null>(
    null,
  );
  const [binancePlanId, setBinancePlanId] = useState<PaidPlanId | null>(null);
  const [authIntent, setAuthIntent] = useState<{
    planId: PaidPlanId;
    provider: HostedPaymentProvider;
  } | null>(null);
  const [authMode, setAuthMode] = useState<"sign-in" | "create-account">(
    "create-account",
  );
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPendingAction, setAuthPendingAction] = useState<string>();
  const [authStatusMessage, setAuthStatusMessage] = useState<string>();
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(() =>
    isPaidPlanId(initialPlanId) ? initialPlanId : "max",
  );

  useEffect(() => {
    setPaymentRegion(
      (currentRegion) => currentRegion ?? detectInitialRegion(locale),
    );
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(paymentRegionStorageKey, paymentRegion);
  }, [paymentRegion]);

  useEffect(() => {
    if (!binancePlanId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setBinancePlanId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [binancePlanId]);

  const rememberPendingCheckout = (
    planId: PaidPlanId,
    provider: HostedPaymentProvider,
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(pendingCheckoutPlanStorageKey, planId);
    window.localStorage.setItem(pendingCheckoutProviderStorageKey, provider);
  };

  const clearPendingCheckout = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(pendingCheckoutPlanStorageKey);
    window.localStorage.removeItem(pendingCheckoutProviderStorageKey);
  };

  const closeAuthModal = () => {
    clearPendingCheckout();
    setAuthIntent(null);
    setAuthPendingAction(undefined);
    setAuthStatusMessage(undefined);
    setShowEmailAuth(false);
    setUseMagicLink(false);
    setAuthPassword("");
  };

  const copy = useMemo<Copy>(() => {
    if (locale === "es") {
      return {
        basicCta: "Empezar gratis",
        basicDescription:
          "Quedate en un solo dispositivo, conserva tu lugar de forma local y prueba el flujo antes de pagar por continuidad.",
        basicTag: "Empieza aqui",
        bestValue: "Mas elegido",
        binanceCta: "Pagar con Binance",
        binanceDialogHint:
          "Pago manual. Cuando completes la transferencia, contacta a David desde la pagina Sobre para confirmar la mejora.",
        binanceDialogTitle: "Pago con Binance Pay",
        close: "Cerrar",
        comparisonEyebrow: "Planes",
        continueToAccount: "Continuar con la cuenta pagada",
        continueToAccountHint:
          "Tu pago ya esta aprobado. Termina la misma cuenta de Leyendo que inicio el checkout para activar sincronizacion y palabras guardadas.",
        contactDavid: "Abrir pagina de contacto",
        focusCta: "Obtener Focus",
        focusDescription:
          "Haz que tu biblioteca personal, tu vocabulario guardado y tu progreso te acompanen entre dispositivos.",
        globalState: "Mostrando pago US/EU (LemonSqueezy)",
        globalSwitch: "Pagas desde LATAM? Cambiar",
        heroDescription:
          "Elige cuanta continuidad quieres alrededor de tus documentos: lectura local simple, sincronizacion entre dispositivos o una biblioteca privada mas amplia.",
        heroTitle: "Planes claros para un lector de documentos reales",
        latamState: "Mostrando pago LATAM (MercadoPago)",
        latamSwitch: "Pagas desde US/EU? Cambiar",
        maxCta: "Obtener Max",
        maxDescription:
          "Maneja un flujo mas profundo de documentos con cargas ilimitadas, una estanteria privada mas amplia y acceso incluido a Vector Max.",
        invalidMercadoPagoProvider:
          "MercadoPago no esta configurado correctamente todavia. Usa el preapproval_plan_id real del plan o el init_point completo, no un numero corto del panel.",
        missingProvider:
          "Este checkout todavia no esta conectado. Puedes usar Binance mientras configuramos este proveedor.",
        paymentSuccess:
          "Pago aprobado. Entra en la misma cuenta de Leyendo que inicio el checkout. Leyendo confirmara cuando la suscripcion quede vinculada.",
        paymentNote:
          "Las tarjetas se enrutan segun tu region. El pago manual queda como respaldo cuando no quieras usar el checkout alojado.",
        priceSuffix: "/mes",
      };
    }

    if (locale === "pt") {
      return {
        basicCta: "Comecar gratis",
        basicDescription:
          "Fique em um unico dispositivo, mantenha seu lugar localmente e prove o fluxo antes de pagar por continuidade.",
        basicTag: "Comece aqui",
        bestValue: "Mais escolhido",
        binanceCta: "Pagar com Binance",
        binanceDialogHint:
          "Pagamento manual. Depois da transferencia, fale com David pela pagina Sobre para confirmar o upgrade.",
        binanceDialogTitle: "Pagamento com Binance Pay",
        close: "Fechar",
        comparisonEyebrow: "Planos",
        continueToAccount: "Continuar com a conta paga",
        continueToAccountHint:
          "Seu pagamento ja foi aprovado. Conclua a mesma conta do Leyendo que iniciou o checkout para ativar sincronizacao e palavras salvas.",
        contactDavid: "Abrir pagina de contato",
        focusCta: "Obter Focus",
        focusDescription:
          "Faca sua biblioteca pessoal, seu vocabulario salvo e seu progresso acompanharem voce entre dispositivos.",
        globalState: "Mostrando pagamento US/EU (LemonSqueezy)",
        globalSwitch: "Paga da LATAM? Trocar",
        heroDescription:
          "Escolha quanta continuidade voce quer ao redor dos seus documentos: leitura local simples, sincronizacao entre dispositivos ou uma biblioteca privada maior.",
        heroTitle: "Planos claros para um leitor de documentos reais",
        latamState: "Mostrando pagamento LATAM (MercadoPago)",
        latamSwitch: "Paga dos EUA/Europa? Trocar",
        maxCta: "Obter Max",
        maxDescription:
          "Toque um fluxo mais profundo de documentos com uploads ilimitados, uma estante privada maior e acesso incluido ao Vector Max.",
        invalidMercadoPagoProvider:
          "O MercadoPago ainda nao esta configurado corretamente. Use o preapproval_plan_id real do plano ou o init_point completo, e nao um numero curto do painel.",
        missingProvider:
          "Este checkout ainda nao esta conectado. Voce pode usar Binance enquanto este provedor e configurado.",
        paymentSuccess:
          "Pagamento aprovado. Entre na mesma conta do Leyendo que iniciou o checkout. O Leyendo vai confirmar quando a assinatura estiver vinculada.",
        paymentNote:
          "Os cartoes sao roteados pela sua regiao. O pagamento manual fica como reserva quando voce nao quiser usar o checkout hospedado.",
        priceSuffix: "/mes",
      };
    }

    return {
      basicCta: "Start free",
      basicDescription:
        "Stay on one device, keep your place locally, and prove the workflow before paying for continuity.",
      basicTag: "Start here",
      bestValue: "Most chosen",
      binanceCta: "Pay with Binance",
      binanceDialogHint:
        "Manual payment. After the transfer, contact David from the About page so the upgrade can be confirmed.",
      binanceDialogTitle: "Pay with Binance Pay",
      close: "Close",
      comparisonEyebrow: "Plans",
      continueToAccount: "Continue to paid account setup",
      continueToAccountHint:
        "Your payment is approved. Finish the same Leyendo account that started checkout to unlock sync and the saved-word dictionary.",
      contactDavid: "Open contact page",
      focusCta: "Get Focus",
      focusDescription:
        "Keep your personal library, saved vocabulary, and reading progress moving with you across devices.",
      globalState: "Showing US/EU payment (LemonSqueezy)",
      globalSwitch: "Paying from LATAM? Switch",
      heroDescription:
        "Choose how much continuity you want around your documents: simple local reading, cross-device sync, or a larger private library layer.",
      heroTitle: "Clear plans for a real-document reader",
      latamState: "Showing LATAM payment (MercadoPago)",
      latamSwitch: "Paying from US/EU? Switch",
      maxCta: "Get Max",
      maxDescription:
        "Run a deeper document workflow with unlimited uploads, a larger private shelf, and bundled Vector Max access.",
      invalidMercadoPagoProvider:
        "MercadoPago is not configured correctly yet. Use the real preapproval_plan_id or the full init_point URL, not a short dashboard number.",
      missingProvider:
        "This checkout is not connected yet. You can use Binance while this provider is being configured.",
      paymentSuccess:
        "Payment approved. Go to the same Leyendo account that started checkout. Leyendo will confirm when the subscription is linked.",
      paymentNote:
        "Card payments are routed by region. Manual payment stays available only as a fallback when you do not want the hosted checkout.",
      priceSuffix: "/month",
    };
  }, [locale]);

  useEffect(() => {
    if (isPaidPlanId(initialPlanId)) {
      setReadySignupPlan(initialPlanId);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const storedPlan = window.localStorage.getItem(paidSignupPlanStorageKey);
    setReadySignupPlan(isPaidPlanId(storedPlan) ? storedPlan : null);
  }, [initialPlanId]);

  useEffect(() => {
    if (initialPaymentStatus === "success") {
      setSuccessMessage(copy.paymentSuccess);
      return;
    }

    setSuccessMessage(undefined);
  }, [copy.paymentSuccess, initialPaymentStatus]);

  const resumeCheckoutPlan = isPaidPlanId(initialCheckoutPlan)
    ? initialCheckoutPlan
    : undefined;
  const resumeCheckoutProvider = isHostedPaymentProvider(
    initialCheckoutProvider,
  )
    ? initialCheckoutProvider
    : undefined;
  const paymentReturnProvider =
    initialPaymentStatus === "success" &&
    isHostedPaymentProvider(initialCheckoutProvider)
      ? initialCheckoutProvider
      : undefined;

  useEffect(() => {
    if (
      paymentReturnHandledRef.current ||
      !user ||
      initialPaymentStatus !== "success" ||
      !isPaidPlanId(initialPlanId)
    ) {
      return;
    }

    paymentReturnHandledRef.current = true;
    router.replace(buildPaidAccountHref(initialPlanId, paymentReturnProvider));
  }, [
    initialPaymentStatus,
    initialPlanId,
    paymentReturnProvider,
    router,
    user,
  ]);

  useEffect(() => {
    if (
      user ||
      authIntent ||
      !resumeCheckoutPlan ||
      !resumeCheckoutProvider ||
      initialPaymentStatus === "success"
    ) {
      return;
    }

    rememberPendingCheckout(resumeCheckoutPlan, resumeCheckoutProvider);
    setReadySignupPlan(resumeCheckoutPlan);
    setAuthMode("create-account");
    setShowEmailAuth(false);
    setUseMagicLink(false);
    setAuthStatusMessage(undefined);
    setAuthIntent({
      planId: resumeCheckoutPlan,
      provider: resumeCheckoutProvider,
    });
    window.history.replaceState(
      null,
      "",
      getLocalizedPublicPath("/pricing", locale),
    );
  }, [
    authIntent,
    initialPaymentStatus,
    locale,
    resumeCheckoutPlan,
    resumeCheckoutProvider,
    user,
  ]);

  useEffect(() => {
    if (
      checkoutResumeStartedRef.current ||
      !user ||
      initialPaymentStatus === "success"
    ) {
      return;
    }

    const storedPlan =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(pendingCheckoutPlanStorageKey);
    const storedProvider =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(pendingCheckoutProviderStorageKey);
    const nextCheckoutPlan =
      resumeCheckoutPlan ?? (isPaidPlanId(storedPlan) ? storedPlan : undefined);
    const nextCheckoutProvider =
      resumeCheckoutProvider ??
      (isHostedPaymentProvider(storedProvider) ? storedProvider : undefined);

    if (!nextCheckoutPlan || !nextCheckoutProvider) {
      return;
    }

    checkoutResumeStartedRef.current = true;
    clearPendingCheckout();
    setAuthIntent(null);
    setShowEmailAuth(false);
    setUseMagicLink(false);
    setAuthStatusMessage(undefined);
    window.localStorage.setItem(paidSignupPlanStorageKey, nextCheckoutPlan);
    setReadySignupPlan(nextCheckoutPlan);
    window.history.replaceState(
      null,
      "",
      getLocalizedPublicPath("/pricing", locale),
    );
    void startProviderCheckout(nextCheckoutPlan, nextCheckoutProvider);
  }, [
    initialPaymentStatus,
    locale,
    resumeCheckoutPlan,
    resumeCheckoutProvider,
    user,
  ]);

  const plans = useMemo(
    () => [
      {
        id: "basic" as const,
        cta: copy.basicCta,
        bestFor:
          locale === "en"
            ? "Best for local reading on one device and occasional imports."
            : locale === "es"
              ? "Ideal para lectura local en un solo dispositivo e importaciones ocasionales."
              : "Ideal para leitura local em um so dispositivo e importacoes ocasionais.",
        outcomeSummary:
          locale === "en"
            ? "Prove the workflow on one device before you pay for continuity."
            : locale === "es"
              ? "Comprueba el flujo en un solo dispositivo antes de pagar por continuidad."
              : "Comprove o fluxo em um unico dispositivo antes de pagar por continuidade.",
        outcomes:
          locale === "en"
            ? [
                "Finish with local progress, highlights, and bookmarks still attached to the document.",
                "Learn which modes and pacing actually help before you invest in sync.",
              ]
            : locale === "es"
              ? [
                  "Terminas con progreso, destacados y marcadores todavia unidos al documento.",
                  "Descubres que modos y ritmos te ayudan de verdad antes de invertir en sincronizacion.",
                ]
              : [
                  "Voce termina com progresso, destaques e marcadores ainda ligados ao documento.",
                  "Descobre quais modos e ritmos realmente ajudam antes de investir em sincronizacao.",
                ],
        description: copy.basicDescription,
        features:
          locale === "en"
            ? [
                `Up to ${freeFileUploadLimit} file uploads on this device for PDF, DOCX, RTF, Markdown, and TXT`,
                "Reader modes, bookmarks, highlights, and progress on this device",
                "Paste text instantly without creating an account",
              ]
            : locale === "es"
              ? [
                  `Hasta ${freeFileUploadLimit} cargas de archivos en este dispositivo para PDF, DOCX, RTF, Markdown y TXT`,
                  "Modos de lectura, marcadores, destacados y progreso en este dispositivo",
                  "Pega texto al instante sin obligarte a crear cuenta",
                ]
              : [
                  `Ate ${freeFileUploadLimit} uploads de arquivo neste dispositivo para PDF, DOCX, RTF, Markdown e TXT`,
                  "Modos de leitura, marcadores, destaques e progresso neste dispositivo",
                  "Cole texto na hora sem exigir conta",
                ],
        href: "/reader",
        label: "Basic Reader",
        price: 0,
        tag: copy.basicTag,
        uploadCapLabel:
          locale === "en"
            ? `${freeFileUploadLimit} file uploads`
            : locale === "es"
              ? `${freeFileUploadLimit} cargas de archivos`
              : `${freeFileUploadLimit} uploads de arquivo`,
      },
      {
        id: "focus" as const,
        cta: copy.focusCta,
        bestFor:
          locale === "en"
            ? "Best for readers building a personal library that should follow them across devices."
            : locale === "es"
              ? "Ideal para lectores que estan construyendo una biblioteca personal que debe seguirlos entre dispositivos."
              : "Ideal para leitores que estao montando uma biblioteca pessoal que precisa acompanhar varios dispositivos.",
        outcomeSummary:
          locale === "en"
            ? "Keep your personal reading system intact when the same documents follow you to another device."
            : locale === "es"
              ? "Mantiene tu sistema personal de lectura intacto cuando los mismos documentos te siguen a otro dispositivo."
              : "Mantem seu sistema pessoal de leitura intacto quando os mesmos documentos seguem para outro dispositivo.",
        outcomes:
          locale === "en"
            ? [
                "Your uploads, saved words, highlights, and progress stop being trapped on one machine.",
                "Dense reading becomes a repeatable cross-device habit instead of a one-off session you rebuild.",
              ]
            : locale === "es"
              ? [
                  "Tus archivos, palabras guardadas, destacados y progreso dejan de quedar atrapados en una sola maquina.",
                  "La lectura densa se vuelve un habito repetible entre dispositivos y no una sesion aislada que reconstruyes.",
                ]
              : [
                  "Seus arquivos, palavras salvas, destaques e progresso deixam de ficar presos em uma unica maquina.",
                  "A leitura densa vira um habito repetivel entre dispositivos e nao uma sessao isolada que voce reconstrui.",
                ],
        description: copy.focusDescription,
        features:
          locale === "en"
            ? [
                `${focusFileUploadLimit} file uploads for your personal library`,
                "3 included PDF books to start reading immediately",
                "Cross-device sync for progress, highlights, and bookmarks",
                "Saved-word dictionary for collecting new words and meanings",
              ]
            : locale === "es"
              ? [
                  `${focusFileUploadLimit} cargas de archivos para tu biblioteca personal`,
                  "3 libros PDF incluidos para empezar a leer de inmediato",
                  "Sincronizacion entre dispositivos para progreso, destacados y marcadores",
                  "Diccionario de palabras guardadas para reunir palabras nuevas y su significado",
                ]
              : [
                  `${focusFileUploadLimit} uploads de arquivo para sua biblioteca pessoal`,
                  "3 livros PDF incluidos para comecar a ler imediatamente",
                  "Sincronizacao entre dispositivos para progresso, destaques e marcadores",
                  "Dicionario de palavras salvas para reunir palavras novas e seus significados",
                ],
        label: "Focus",
        price: 6.9,
        uploadCapLabel:
          locale === "en"
            ? `${focusFileUploadLimit} file uploads`
            : locale === "es"
              ? `${focusFileUploadLimit} cargas de archivos`
              : `${focusFileUploadLimit} uploads de arquivo`,
      },
      {
        id: "max" as const,
        cta: copy.maxCta,
        bestFor:
          locale === "en"
            ? "Best for heavy document work, broader private library access, and a deeper reading stack."
            : locale === "es"
              ? "Ideal para trabajo intenso con documentos, acceso a una biblioteca privada mas amplia y una pila de lectura mas profunda."
              : "Ideal para trabalho intenso com documentos, acesso a uma biblioteca privada maior e uma pilha de leitura mais profunda.",
        outcomeSummary:
          locale === "en"
            ? "Support a heavier reading workflow when your backlog, private shelf, and follow-on work all grow together."
            : locale === "es"
              ? "Sostiene un flujo de lectura mas pesado cuando crecen a la vez tu backlog, tu estanteria privada y el trabajo que sigue."
              : "Sustenta um fluxo de leitura mais pesado quando backlog, estante privada e trabalho seguinte crescem juntos.",
        outcomes:
          locale === "en"
            ? [
                "You stop rationing uploads and can keep long-running reading projects inside one stack.",
                "Your private Leyendo library and Vector Max stay close when reading turns into planning or execution.",
              ]
            : locale === "es"
              ? [
                  "Dejas de racionar cargas y puedes mantener proyectos largos de lectura dentro de una sola pila.",
                  "Tu biblioteca privada de Leyendo y Vector Max quedan cerca cuando leer pasa a ser planificacion o ejecucion.",
                ]
              : [
                  "Voce para de racionar uploads e consegue manter projetos longos de leitura dentro de uma unica pilha.",
                  "Sua biblioteca privada do Leyendo e o Vector Max ficam por perto quando ler vira planejamento ou execucao.",
                ],
        description: copy.maxDescription,
        features:
          locale === "en"
            ? [
                "Unlimited file uploads across your reading workflow",
                "Everything in Focus plus 100+ cloud books from David's collection",
                "View the private cloud library inside Leyendo without download access",
                "Bundled access to Vector Max for planning and execution work",
              ]
            : locale === "es"
              ? [
                  "Cargas ilimitadas para todo tu flujo de lectura",
                  "Todo lo de Focus mas 100+ libros en la nube de la coleccion personal de David",
                  "Lee la biblioteca privada en la nube dentro de Leyendo sin descargar archivos",
                  "Acceso incluido a Vector Max para planificacion y ejecucion",
                ]
              : [
                  "Uploads ilimitados para todo o seu fluxo de leitura",
                  "Tudo do Focus mais 100+ livros na nuvem da colecao pessoal de David",
                  "Leia a biblioteca privada na nuvem dentro do Leyendo sem baixar arquivos",
                  "Acesso incluido ao Vector Max para planejamento e execucao",
                ],
        label: "Max",
        price: 15.9,
        tag: copy.bestValue,
        uploadCapLabel:
          locale === "en"
            ? "Unlimited uploads"
            : locale === "es"
              ? "Cargas ilimitadas"
              : "Uploads ilimitados",
      },
    ],
    [copy, locale],
  );

  const successSteps = useMemo(() => {
    if (user) {
      return locale === "es"
        ? [
            "Abre tu cuenta pagada.",
            "Comprueba que aparezca el mensaje Subscription linked.",
          ]
        : locale === "pt"
          ? [
              "Abra sua conta paga.",
              "Confirme que a mensagem Subscription linked aparece.",
            ]
          : [
              "Open your paid account setup.",
              "Confirm that the Subscription linked message appears.",
            ];
    }

    return locale === "es"
      ? [
          "Abre tu cuenta Basic Reader.",
          "Entra con el mismo email usado antes del pago.",
          "Espera el mensaje Subscription linked.",
        ]
      : locale === "pt"
        ? [
            "Abra sua conta Basic Reader.",
            "Entre com o mesmo email usado antes do pagamento.",
            "Espere a mensagem Subscription linked.",
          ]
        : [
            "Open your Basic Reader account.",
            "Sign in with the same email you used before payment.",
            "Wait for the Subscription linked message.",
          ];
  }, [locale, user]);

    const selectedPlan =
      plans.find((plan) => plan.id === selectedPlanId) ??
      plans.find((plan) => plan.id === "max") ??
      plans[0];
    const pricingPanelCopy =
      locale === "es"
        ? {
            bestFit: "Mejor para",
            compareHint:
              "Manten la vista general en las tarjetas y revisa abajo un plan completo a la vez.",
            detailsActive: "Detalle mostrado abajo",
            fullBreakdown: "Detalle completo del plan",
            included: "Todo lo que incluye",
            manualFallback: "Respaldo manual",
            manualFallbackDetail:
              "Binance Pay sigue disponible si no quieres usar el checkout alojado.",
            paymentRoute: "Como se activa",
            viewDetails: "Ver detalle completo",
            whatChanges: "Lo que cambia",
          }
        : locale === "pt"
          ? {
              bestFit: "Melhor para",
              compareHint:
                "Mantenha a visao geral nos cards e revise abaixo um plano completo de cada vez.",
              detailsActive: "Detalhe mostrado abaixo",
              fullBreakdown: "Detalhe completo do plano",
              included: "Tudo o que inclui",
              manualFallback: "Reserva manual",
              manualFallbackDetail:
                "O Binance Pay continua disponivel se voce nao quiser usar o checkout hospedado.",
              paymentRoute: "Como se ativa",
              viewDetails: "Ver detalhe completo",
              whatChanges: "O que muda",
            }
          : {
              bestFit: "Best for",
              compareHint:
                "Keep the card overview visible, then inspect one full plan at a time below.",
              detailsActive: "Details shown below",
              fullBreakdown: "Full plan breakdown",
              included: "Everything included",
              manualFallback: "Manual fallback",
              manualFallbackDetail:
                "Binance Pay stays available if you do not want the hosted checkout.",
              paymentRoute: "How it unlocks",
              viewDetails: "View full details",
              whatChanges: "What changes",
            };
    const primaryProvider =
      paymentRegion === "latam" ? "mercadopago" : "lemonsqueezy";
    const primaryProviderLabel =
      primaryProvider === "mercadopago" ? "MercadoPago" : "LemonSqueezy";
    const primaryProviderDetail =
      paymentRegion === "latam"
        ? locale === "es"
          ? "Este plan usa MercadoPago como checkout principal para tarjetas en LATAM."
          : locale === "pt"
            ? "Este plano usa MercadoPago como checkout principal para cartoes na LATAM."
            : "This plan uses MercadoPago as the primary card checkout in LATAM."
        : locale === "es"
          ? "Este plan usa LemonSqueezy como checkout principal para tarjetas en US/EU."
          : locale === "pt"
            ? "Este plano usa LemonSqueezy como checkout principal para cartoes em US/EU."
            : "This plan uses LemonSqueezy as the primary card checkout in US/EU.";

  async function startProviderCheckout(
    planId: PaidPlanId,
    provider: HostedPaymentProvider,
  ) {
    const checkoutWindow = window.open("", "_blank");
    let providerUrl: string | undefined;

    if (provider === "lemonsqueezy") {
      try {
        const response = await fetch("/api/payments/lemonsqueezy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            plan: planId,
            userEmail: user?.email,
            userId: user?.id,
          }),
        });
        const payload = (await response.json().catch(() => null)) as {
          checkoutUrl?: string;
          error?: string;
        } | null;

        if (!response.ok || !payload?.checkoutUrl) {
          checkoutWindow?.close();
          setStatusMessage(payload?.error ?? copy.missingProvider);
          return;
        }

        providerUrl = payload.checkoutUrl;

        if (checkoutWindow) {
          checkoutWindow.opener = null;
          checkoutWindow.location.href = providerUrl;
        } else {
          window.location.assign(providerUrl);
        }
      } catch {
        checkoutWindow?.close();
        setStatusMessage(copy.missingProvider);
        return;
      }
    } else {
      try {
        const response = await fetch("/api/payments/mercadopago", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            plan: planId,
            userEmail: user?.email,
            userId: user?.id,
          }),
        });
        const payload = (await response.json().catch(() => null)) as {
          checkoutUrl?: string;
          error?: string;
        } | null;

        if (!response.ok || !payload?.checkoutUrl) {
          checkoutWindow?.close();
          setStatusMessage(payload?.error ?? copy.invalidMercadoPagoProvider);
          return;
        }

        providerUrl = payload.checkoutUrl;
      } catch {
        checkoutWindow?.close();
        setStatusMessage(copy.invalidMercadoPagoProvider);
        return;
      }
    }

    if (!providerUrl) {
      checkoutWindow?.close();
      setStatusMessage(
        provider === "mercadopago"
          ? copy.invalidMercadoPagoProvider
          : copy.missingProvider,
      );
      return;
    }

    setStatusMessage(undefined);
    window.localStorage.setItem(paidSignupPlanStorageKey, planId);
    setReadySignupPlan(planId);

    if (checkoutWindow) {
      checkoutWindow.opener = null;
      checkoutWindow.location.href = providerUrl;
    } else {
      window.location.assign(providerUrl);
    }
  }

  function handleProviderClick(
    planId: PaidPlanId,
    provider: HostedPaymentProvider,
  ) {
    setStatusMessage(undefined);
    window.localStorage.setItem(paidSignupPlanStorageKey, planId);
    setReadySignupPlan(planId);

    if (!user) {
      if (!isAuthConfigured) {
        setStatusMessage(copy.missingProvider);
        return;
      }

      rememberPendingCheckout(planId, provider);
      setAuthMode("create-account");
      setShowEmailAuth(false);
      setUseMagicLink(false);
      setAuthEmail("");
      setAuthPassword("");
      setAuthPendingAction(undefined);
      setAuthStatusMessage(undefined);
      setAuthIntent({ planId, provider });
      return;
    }

    clearPendingCheckout();
    void startProviderCheckout(planId, provider);
  }

  async function handleAuthSubmit() {
    if (!authIntent) {
      return;
    }

    setAuthPendingAction(useMagicLink ? "magic-link" : "email");
    setAuthStatusMessage(undefined);

    try {
      if (useMagicLink) {
        await signInWithMagicLink(authEmail, window.location.href);
        setAuthStatusMessage(authDialogCopy.emailSent);
        return;
      }

      if (authMode === "create-account") {
        await signUp(authEmail, authPassword, window.location.href);
        setAuthStatusMessage(authDialogCopy.createSuccess);
      } else {
        await signIn(authEmail, authPassword);
        setAuthStatusMessage(authDialogCopy.signInSuccess);
      }
    } catch (error) {
      setAuthStatusMessage(
        error instanceof Error ? error.message : authDialogCopy.authFailed,
      );
    } finally {
      setAuthPendingAction(undefined);
    }
  }

  async function handleAuthOAuth(
    provider: "github" | "google",
    signInWithProvider: (redirectTo?: string) => Promise<void>,
  ) {
    setAuthPendingAction(provider);
    setAuthStatusMessage(undefined);

    try {
      await signInWithProvider(window.location.href);
    } catch (error) {
      setAuthStatusMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
      setAuthPendingAction(undefined);
    }
  }

  const binancePlan = plans.find((plan) => plan.id === binancePlanId);
  const authPlanLabel =
    authIntent?.planId === "max"
      ? "Max"
      : authIntent?.planId === "focus"
        ? "Focus"
        : undefined;
  const authDialogCopy = getGuestAuthDialogCopy({
    locale,
    planLabel: authPlanLabel ?? "Focus",
    variant: "checkout",
  });

  return (
    <section className="w-full px-6 pt-12 pb-24">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-14 text-center">
          <p className="text-[0.68rem] font-bold tracking-[0.34em] text-[#d49a61] uppercase">
            {copy.comparisonEyebrow}
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl">
            {copy.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 font-light text-[#8f97ab]">
            {copy.heroDescription}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-[#8f97ab]">
            <span className="inline-flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-[#6b7280]" />
              {paymentRegion === "latam" ? copy.latamState : copy.globalState}
            </span>
            <button
              type="button"
              onClick={() => {
                setPaymentRegion((currentRegion) =>
                  currentRegion === "latam" ? "global" : "latam",
                );
                setStatusMessage(undefined);
              }}
              className="cursor-pointer text-sm font-medium text-[#d48dff] transition hover:text-[#ecb7ff] hover:underline"
            >
              {paymentRegion === "latam" ? copy.latamSwitch : copy.globalSwitch}
            </button>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#6b7280]">
            {copy.paymentNote}
          </p>
          {successMessage ? (
            <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm leading-7 text-emerald-100">
              <p>{successMessage}</p>
              {readySignupPlan ? (
                <div className="mt-4">
                  <p className="text-sm text-emerald-50/90">
                    {copy.continueToAccountHint}
                  </p>
                  <ol className="mt-4 space-y-3 text-sm text-emerald-50/90">
                    {successSteps.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-50/10 text-xs font-semibold text-emerald-50">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <Link
                    href={buildPaidAccountHref(
                      readySignupPlan,
                      paymentReturnProvider,
                    )}
                    className="mt-3 inline-flex min-h-11 items-center rounded-full border border-emerald-200/30 bg-emerald-50/10 px-5 py-2.5 font-semibold text-emerald-50 transition hover:bg-emerald-50/16"
                  >
                    {copy.continueToAccount}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
          {statusMessage ? (
            <p className="mx-auto mt-5 max-w-2xl rounded-2xl border border-[#553b20] bg-[#22160a] px-4 py-3 text-sm leading-7 text-[#f7d8a7]">
              {statusMessage}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-3 xl:gap-8">
          {plans.map((plan) => {
            const isSelected = selectedPlan.id === plan.id;

            return (
            <article
              key={plan.id}
              className={`${cardClassName(plan.id)} ${
                isSelected
                  ? "shadow-[0_24px_64px_rgba(0,0,0,0.38)] ring-2 ring-[#d49a61]/50"
                  : "hover:-translate-y-1"
              }`}
            >
              {plan.id === "basic" || plan.id === "max" ? (
                <div
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[10px] font-bold tracking-widest uppercase ${topBadgeClass(plan.id)}`}
                >
                  {plan.tag}
                </div>
              ) : null}

              <div className="mb-8">
                <h2 className="text-[2rem] font-bold tracking-tight text-white">
                  {plan.label}
                </h2>
                <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-5xl font-bold tracking-tight text-white">
                    {plan.price === 0 ? "$0" : `$${plan.price.toFixed(2)}`}
                  </span>
                  {plan.price > 0 ? (
                    <span className="text-sm text-[#7d8598]">
                      ({copy.priceSuffix})
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-[#d49a61]/35 bg-[#26170f] px-4 py-2 text-sm font-semibold text-[#ffd7ab] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                  {plan.uploadCapLabel}
                </div>
                <p className="mt-5 text-sm leading-8 text-[#94a3b8]">
                  {plan.description}
                </p>
                <p className="mt-4 text-sm leading-7 text-white/88">
                  {plan.bestFor}
                </p>
              </div>

              <div className="mt-auto space-y-3">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                  }}
                  className={`inline-flex min-h-11 w-full items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    isSelected
                      ? "border-[#d49a61]/55 bg-[#2a1a12] text-[#ffd7ab]"
                      : "border-white/10 bg-white/4 text-[#d0d4dd] hover:border-white/18 hover:bg-white/8"
                  }`}
                >
                  {isSelected
                    ? pricingPanelCopy.detailsActive
                    : pricingPanelCopy.viewDetails}
                </button>
                {plan.id === "basic" ? (
                  <Link
                    href={plan.href}
                    className={primaryButtonClass(plan.id)}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleProviderClick(plan.id, primaryProvider);
                      }}
                      className={primaryButtonClass(plan.id)}
                    >
                      <CreditCard className="h-4 w-4" />
                      {plan.cta}
                    </button>
                  </>
                )}
              </div>
            </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[rgba(16,18,25,0.92)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] lg:p-8">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[0.68rem] font-bold tracking-[0.28em] text-[#d49a61] uppercase">
                {pricingPanelCopy.fullBreakdown}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-4 py-1 text-[10px] font-bold tracking-widest uppercase ${topBadgeClass(selectedPlan.id)}`}
                >
                  {selectedPlan.label}
                </span>
                <span className="text-4xl font-bold tracking-tight text-white">
                  {selectedPlan.price === 0
                    ? "$0"
                    : `$${selectedPlan.price.toFixed(2)}`}
                </span>
                {selectedPlan.price > 0 ? (
                  <span className="text-sm text-[#7d8598]">
                    ({copy.priceSuffix})
                  </span>
                ) : null}
                <span className="inline-flex rounded-full border border-[#d49a61]/35 bg-[#26170f] px-4 py-2 text-sm font-semibold text-[#ffd7ab] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                  {selectedPlan.uploadCapLabel}
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#c6d1e3]">
                {selectedPlan.description}
              </p>
              <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/16 px-4 py-4">
                <p className="text-[11px] tracking-[0.18em] text-[#94a3b8] uppercase">
                  {pricingPanelCopy.bestFit}
                </p>
                <p className="mt-2 text-sm leading-7 text-white/92">
                  {selectedPlan.bestFor}
                </p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#8f97ab]">
              {pricingPanelCopy.compareHint}
            </p>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/18 px-5 py-5">
              <p className="text-[11px] tracking-[0.18em] text-[#94a3b8] uppercase">
                {pricingPanelCopy.whatChanges}
              </p>
              <p className="mt-2 text-sm leading-7 text-white/92">
                {selectedPlan.outcomeSummary}
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#c6d1e3]">
                {selectedPlan.outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4b722]" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/18 px-5 py-5">
                <p className="text-[11px] tracking-[0.18em] text-[#94a3b8] uppercase">
                  {pricingPanelCopy.included}
                </p>
                <ul className="mt-4 space-y-4 text-sm leading-8 text-[#d0d4dd]">
                  {selectedPlan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#22c55e]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedPlan.id !== "basic" ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-black/18 px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] tracking-[0.18em] text-[#94a3b8] uppercase">
                        {pricingPanelCopy.paymentRoute}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/92">
                        {primaryProviderDetail}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/82">
                      {primaryProviderLabel}
                    </span>
                  </div>

                  <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/4 px-4 py-4">
                    <p className="text-[11px] tracking-[0.18em] text-[#94a3b8] uppercase">
                      {pricingPanelCopy.manualFallback}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#c6d1e3]">
                      {pricingPanelCopy.manualFallbackDetail}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusMessage(undefined);
                        setBinancePlanId(selectedPlan.id);
                      }}
                      className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#f4b722] transition hover:text-[#ffd176]"
                    >
                      <Coins className="h-4 w-4" />
                      {copy.binanceCta}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {!user ? (
          <div className="mt-8 flex justify-center">
            <p className="rounded-full border border-[#30415e] bg-[#111827]/86 px-5 py-3 text-sm text-[#c6d1e3] shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
              {authDialogCopy.accountRequired}
            </p>
          </div>
        ) : null}
      </div>

      <GuestAuthDialog
        copy={authDialogCopy}
        email={authEmail}
        isAuthLoading={isAuthLoading}
        isOpen={Boolean(authIntent)}
        mode={authMode}
        onClose={closeAuthModal}
        onContinueWithEmail={() => {
          setShowEmailAuth(true);
          setUseMagicLink(false);
          setAuthStatusMessage(undefined);
        }}
        onContinueWithGitHub={() => {
          void handleAuthOAuth("github", signInWithGitHub);
        }}
        onContinueWithGoogle={() => {
          void handleAuthOAuth("google", signInWithGoogle);
        }}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSelectCreateAccount={() => {
          setAuthMode("create-account");
          setShowEmailAuth(false);
          setUseMagicLink(false);
          setAuthStatusMessage(undefined);
        }}
        onSelectSignIn={() => {
          setAuthMode("sign-in");
          setShowEmailAuth(false);
          setUseMagicLink(false);
          setAuthStatusMessage(undefined);
        }}
        onSubmit={() => {
          void handleAuthSubmit();
        }}
        onToggleMagicLink={() => {
          setUseMagicLink((current) => !current);
          setAuthStatusMessage(undefined);
        }}
        password={authPassword}
        pendingAction={authPendingAction}
        showEmailAuth={showEmailAuth}
        statusMessage={authStatusMessage}
        useMagicLink={useMagicLink}
      />

      {binancePlan ? (
        <PricingBinanceDialog
          binanceDialogHint={copy.binanceDialogHint}
          binanceDialogTitle={copy.binanceDialogTitle}
          closeLabel={copy.close}
          contactButtonClass={primaryButtonClass("focus")}
          contactDavidLabel={copy.contactDavid}
          locale={locale}
          planLabel={binancePlan.label}
          price={binancePlan.price}
          onClose={() => {
            setBinancePlanId(null);
          }}
        />
      ) : null}
    </section>
  );
}

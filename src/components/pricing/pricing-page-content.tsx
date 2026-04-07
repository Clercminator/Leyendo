"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  Check,
  Coins,
  CreditCard,
  Globe2,
  X,
} from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { founderGitHubUrl, founderLinkedInUrl } from "@/lib/site";

type PaymentRegion = "global" | "latam";
type PaymentProvider = "binance" | "lemonsqueezy" | "mercadopago";
type PlanId = "basic" | "focus" | "max";
type PaidPlanId = Exclude<PlanId, "basic">;

const paymentRegionStorageKey = "leyendo_payment_region";
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

const mercadopagoPlanUrls = {
  focus:
    "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=b9ee7e5887ba41608dbceb39a152073b",
  max:
    "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=9f0352ccb88840e38f5241214e548df4",
} satisfies Record<PaidPlanId, string>;

const checkoutUrls = {
  focus: {
    lemonsqueezy: process.env.NEXT_PUBLIC_LEMONSQUEEZY_FOCUS_URL,
    mercadopago: mercadopagoPlanUrls.focus,
  },
  max: {
    lemonsqueezy: process.env.NEXT_PUBLIC_LEMONSQUEEZY_MAX_URL,
    mercadopago: mercadopagoPlanUrls.max,
  },
} satisfies Record<PaidPlanId, Partial<Record<Exclude<PaymentProvider, "binance">, string | undefined>>>;

const binanceQrPath = "/payment/BinanceQR.png";

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

function cryptoButtonClass() {
  return "flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d8a11c]/55 px-4 py-3 text-sm font-medium text-[#f4b722] transition-colors hover:bg-[#f4b722]/10";
}

function topBadgeClass(planId: PlanId) {
  if (planId === "basic") {
    return "bg-[#2f80ff] text-white";
  }

  return "bg-white text-black";
}

interface PricingPageContentProps {
  initialPaymentStatus?: string;
}

export function PricingPageContent({
  initialPaymentStatus,
}: PricingPageContentProps) {
  const { locale } = useLocale();
  const [paymentRegion, setPaymentRegion] = useState<PaymentRegion>(() =>
    detectInitialRegion(locale),
  );
  const [statusMessage, setStatusMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [binancePlanId, setBinancePlanId] = useState<PaidPlanId | null>(null);

  useEffect(() => {
    setPaymentRegion((currentRegion) => currentRegion ?? detectInitialRegion(locale));
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

  const copy = useMemo<Copy>(() => {
    if (locale === "es") {
      return {
        basicCta: "Empezar gratis",
        basicDescription:
          "Lectura local en un dispositivo con tu progreso y notas guardadas en este equipo.",
        basicTag: "Empieza aqui",
        bestValue: "Mas elegido",
        binanceCta: "Pagar con Binance",
        binanceDialogHint:
          "Pago manual. Cuando completes la transferencia, contacta a David desde la pagina Sobre para confirmar la mejora.",
        binanceDialogTitle: "Pago con Binance Pay",
        close: "Cerrar",
        comparisonEyebrow: "Planes",
        contactDavid: "Abrir pagina de contacto",
        focusCta: "Obtener Focus",
        focusDescription:
          "Para lectores que quieren sincronizacion, vocabulario guardado y tres libros PDF incluidos.",
        globalState: "Mostrando pago US/EU (LemonSqueezy)",
        globalSwitch: "Pagas desde LATAM? Cambiar",
        heroDescription:
          "Elige el nivel de sincronizacion, soporte de vocabulario y acceso a biblioteca que necesitas.",
        heroTitle:
          "Planes de lectura transparentes",
        latamState: "Mostrando pago LATAM (MercadoPago)",
        latamSwitch: "Pagas desde US/EU? Cambiar",
        maxCta: "Obtener Max",
        maxDescription:
          "Todo Focus mas 100+ libros en la nube y acceso incluido a Vector Max.",
        missingProvider:
          "Este checkout todavia no esta conectado. Puedes usar Binance mientras configuramos este proveedor.",
        paymentSuccess:
          "Pago aprobado. Si tu plan no se activa automaticamente, entra a tu cuenta y contacta a David para confirmar la suscripcion.",
        paymentNote:
          "Las tarjetas se enrutan segun tu region. Binance siempre queda disponible como alternativa manual.",
        priceSuffix: "/mes",
      };
    }

    if (locale === "pt") {
      return {
        basicCta: "Comecar gratis",
        basicDescription:
          "Leitura local em um unico dispositivo com progresso e notas guardados neste aparelho.",
        basicTag: "Comece aqui",
        bestValue: "Mais escolhido",
        binanceCta: "Pagar com Binance",
        binanceDialogHint:
          "Pagamento manual. Depois da transferencia, fale com David pela pagina Sobre para confirmar o upgrade.",
        binanceDialogTitle: "Pagamento com Binance Pay",
        close: "Fechar",
        comparisonEyebrow: "Planos",
        contactDavid: "Abrir pagina de contato",
        focusCta: "Obter Focus",
        focusDescription:
          "Para leitores que querem sincronizacao, vocabulario salvo e tres livros PDF incluidos.",
        globalState: "Mostrando pagamento US/EU (LemonSqueezy)",
        globalSwitch: "Paga da LATAM? Trocar",
        heroDescription:
          "Escolha o nivel de sincronizacao, suporte de vocabulario e acesso a biblioteca que voce precisa.",
        heroTitle:
          "Planos de leitura transparentes",
        latamState: "Mostrando pagamento LATAM (MercadoPago)",
        latamSwitch: "Paga dos EUA/Europa? Trocar",
        maxCta: "Obter Max",
        maxDescription:
          "Tudo do Focus mais 100+ livros na nuvem e acesso incluido ao Vector Max.",
        missingProvider:
          "Este checkout ainda nao esta conectado. Voce pode usar Binance enquanto este provedor e configurado.",
        paymentSuccess:
          "Pagamento aprovado. Se o plano nao for ativado automaticamente, entre na sua conta e fale com David para confirmar a assinatura.",
        paymentNote:
          "Cartoes sao roteados pela sua regiao. Binance continua disponivel como alternativa manual.",
        priceSuffix: "/mes",
      };
    }

    return {
      basicCta: "Start free",
      basicDescription:
        "Local reading on one device with your progress, highlights, and notes stored on this device.",
      basicTag: "Start here",
      bestValue: "Most chosen",
      binanceCta: "Pay with Binance",
      binanceDialogHint:
        "Manual payment. After the transfer, contact David from the About page so the upgrade can be confirmed.",
      binanceDialogTitle: "Pay with Binance Pay",
      close: "Close",
      comparisonEyebrow: "Plans",
      contactDavid: "Open contact page",
      focusCta: "Get Focus",
      focusDescription:
        "For readers who want synced reading, saved vocabulary, and 3 included PDF books.",
      globalState: "Showing US/EU payment (LemonSqueezy)",
      globalSwitch: "Paying from LATAM? Switch",
      heroDescription:
        "Choose the level of sync, vocabulary support, and private library access you need.",
      heroTitle:
        "Transparent Reading Plans",
      latamState: "Showing LATAM payment (MercadoPago)",
      latamSwitch: "Paying from US/EU? Switch",
      maxCta: "Get Max",
      maxDescription:
        "Everything in Focus plus 100+ cloud books and bundled Vector Max access.",
      missingProvider:
        "This checkout is not connected yet. You can use Binance while this provider is being configured.",
      paymentSuccess:
        "Payment approved. If your plan does not unlock automatically, go to your account and contact David so the subscription can be confirmed.",
      paymentNote:
        "Card payments are routed by region. Binance stays available as a manual fallback.",
      priceSuffix: "/month",
    };
  }, [locale]);

  useEffect(() => {
    if (initialPaymentStatus === "success") {
      setSuccessMessage(copy.paymentSuccess);
      return;
    }

    setSuccessMessage(undefined);
  }, [copy.paymentSuccess, initialPaymentStatus]);

  const plans = useMemo(
    () => [
      {
        id: "basic" as const,
        cta: copy.basicCta,
        description: copy.basicDescription,
        features:
          locale === "en"
            ? [
                "Local-first reader for PDF, DOCX, RTF, Markdown, TXT, and pasted text",
                "Reader modes, bookmarks, highlights, and progress on this device",
                "Import your own documents without an account requirement",
              ]
            : locale === "es"
              ? [
                  "Lector local para PDF, DOCX, RTF, Markdown, TXT y texto pegado",
                  "Modos de lectura, marcadores, destacados y progreso en este dispositivo",
                  "Importa tus propios documentos sin obligarte a crear cuenta",
                ]
              : [
                  "Leitor local para PDF, DOCX, RTF, Markdown, TXT e texto colado",
                  "Modos de leitura, marcadores, destaques e progresso neste dispositivo",
                  "Importe seus proprios documentos sem exigir conta",
                ],
        href: "/reader",
        label: "Basic Reader",
        price: 0,
        tag: copy.basicTag,
      },
      {
        id: "focus" as const,
        cta: copy.focusCta,
        description: copy.focusDescription,
        features:
          locale === "en"
            ? [
                "3 included PDF books to start reading immediately",
                "Cross-device sync for progress, highlights, and bookmarks",
                "Saved-word dictionary for collecting new words and meanings",
              ]
            : locale === "es"
              ? [
                  "3 libros PDF incluidos para empezar a leer de inmediato",
                  "Sincronizacion entre dispositivos para progreso, destacados y marcadores",
                  "Diccionario de palabras guardadas para reunir palabras nuevas y su significado",
                ]
              : [
                  "3 livros PDF incluidos para comecar a ler imediatamente",
                  "Sincronizacao entre dispositivos para progresso, destaques e marcadores",
                  "Dicionario de palavras salvas para reunir palavras novas e seus significados",
                ],
        label: "Focus",
        price: 6.9,
      },
      {
        id: "max" as const,
        cta: copy.maxCta,
        description: copy.maxDescription,
        features:
          locale === "en"
            ? [
                "Everything in Focus plus 100+ cloud books from David's collection",
                "View the private cloud library inside Leyendo without download access",
                "Bundled access to Vector Max for planning and execution work",
              ]
            : locale === "es"
              ? [
                  "Todo lo de Focus mas 100+ libros en la nube de la coleccion personal de David",
                  "Lee la biblioteca privada en la nube dentro de Leyendo sin descargar archivos",
                  "Acceso incluido a Vector Max para planificacion y ejecucion",
                ]
              : [
                  "Tudo do Focus mais 100+ livros na nuvem da colecao pessoal de David",
                  "Leia a biblioteca privada na nuvem dentro do Leyendo sem baixar arquivos",
                  "Acesso incluido ao Vector Max para planejamento e execucao",
                ],
        label: "Max",
        price: 15.9,
        tag: copy.bestValue,
      },
    ],
    [copy, locale],
  );

  const primaryProvider = paymentRegion === "latam" ? "mercadopago" : "lemonsqueezy";

  function handleProviderClick(planId: PaidPlanId, provider: Exclude<PaymentProvider, "binance">) {
    const providerUrl = checkoutUrls[planId][provider];

    if (!providerUrl) {
      setStatusMessage(copy.missingProvider);
      return;
    }

    setStatusMessage(undefined);
    window.open(providerUrl, "_blank", "noopener,noreferrer");
  }

  const binancePlan = plans.find((plan) => plan.id === binancePlanId);

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
            <p className="mx-auto mt-5 max-w-2xl rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm leading-7 text-emerald-100">
              {successMessage}
            </p>
          ) : null}
          {statusMessage ? (
            <p className="mx-auto mt-5 max-w-2xl rounded-2xl border border-[#553b20] bg-[#22160a] px-4 py-3 text-sm leading-7 text-[#f7d8a7]">
              {statusMessage}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-3 xl:gap-8">
          {plans.map((plan) => (
            <article key={plan.id} className={cardClassName(plan.id)}>
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
                <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-5xl font-bold tracking-tight text-white">
                    {plan.price === 0 ? "$0" : `$${plan.price.toFixed(2)}`}
                  </span>
                  {plan.price > 0 ? (
                    <span className="text-sm text-[#7d8598]">({copy.priceSuffix})</span>
                  ) : null}
                </div>
                <p className="mt-5 text-sm leading-8 text-[#94a3b8]">
                  {plan.description}
                </p>
              </div>

              <ul className="mb-8 grow space-y-4 text-sm leading-8 text-[#d0d4dd]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#22c55e]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-3">
                {plan.id === "basic" ? (
                  <Link href={plan.href} className={primaryButtonClass(plan.id)}>
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
                    <button
                      type="button"
                      onClick={() => {
                        setStatusMessage(undefined);
                        setBinancePlanId(plan.id);
                      }}
                      className={cryptoButtonClass()}
                    >
                      <Coins className="h-4 w-4" />
                      {copy.binanceCta}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {binancePlan ? (
        <div
          className="fixed inset-0 z-120 flex items-center justify-center bg-[rgba(9,14,24,0.72)] px-4 py-6 backdrop-blur-md"
          onClick={() => {
            setBinancePlanId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={copy.binanceDialogTitle}
            className="w-full max-w-md rounded-[2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(11,17,31,0.98),rgba(14,21,36,0.95))] p-6 text-white shadow-[0_30px_110px_rgba(0,0,0,0.45)]"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="editorial-kicker text-[#ffcf88]">Binance Pay</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  {copy.binanceDialogTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBinancePlanId(null);
                }}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/6 text-white transition hover:bg-white/12"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{copy.close}</span>
              </button>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <p className="text-sm text-white/70">
                {locale === "en" ? "Plan" : locale === "es" ? "Plan" : "Plano"}
              </p>
              <p className="mt-1 text-lg font-semibold">{binancePlan.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                ${binancePlan.price.toFixed(2)}
              </p>
            </div>

            <div className="mt-5 flex justify-center rounded-[1.5rem] bg-white p-3">
              <Image
                src={binanceQrPath}
                alt="Binance Pay QR code"
                width={300}
                height={300}
                className="h-auto w-full max-w-70 rounded-[1rem]"
              />
            </div>

            <ol className="mt-5 space-y-3 text-sm leading-7 text-white/80">
              <li className="flex gap-3">
                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  1
                </span>
                <span>
                  {locale === "en"
                    ? "Scan the QR code from Binance Pay and send the exact USD equivalent."
                    : locale === "es"
                      ? "Escanea el QR desde Binance Pay y envia el equivalente exacto en USD."
                      : "Escaneie o QR no Binance Pay e envie o equivalente exato em USD."}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  2
                </span>
                <span>{copy.binanceDialogHint}</span>
              </li>
            </ol>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/about"
                className={primaryButtonClass("focus")}
                onClick={() => {
                  setBinancePlanId(null);
                }}
              >
                {copy.contactDavid}
              </Link>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                <a
                  href={founderLinkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cryptoButtonClass()}
                >
                  LinkedIn
                </a>
                <a
                  href={founderGitHubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cryptoButtonClass()}
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
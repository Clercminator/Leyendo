"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LoaderCircle } from "lucide-react";

import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { useLocale } from "@/components/layout/locale-provider";
import {
  normalizeHostedCheckoutIntent,
  paidSignupPlanStorageKey,
  pendingCheckoutSubscriptionIdStorageKey,
} from "@/lib/hosted-checkout";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import type { HostedPaymentProvider } from "@/lib/payment-config";

interface HostedCheckoutLauncherProps {
  initialPlan?: string;
  initialProvider?: string;
  navigate?: (url: string) => void;
}

interface CheckoutResponsePayload {
  checkoutUrl?: string;
  error?: string;
  providerSubscriptionId?: string;
}

interface LauncherCopy {
  backToPricing: string;
  invalidRequest: string;
  loadingLemonSqueezy: string;
  loadingMercadoPago: string;
  loadingTitle: string;
  missingLemonSqueezy: string;
  missingMercadoPago: string;
  retryHint: string;
}

function getCheckoutApiPath(provider: HostedPaymentProvider) {
  return provider === "mercadopago"
    ? "/api/payments/mercadopago"
    : "/api/payments/lemonsqueezy";
}

export function HostedCheckoutLauncher({
  initialPlan,
  initialProvider,
  navigate,
}: HostedCheckoutLauncherProps) {
  const { locale } = useLocale();
  const { user } = useSupabaseAuth();
  const [errorMessage, setErrorMessage] = useState<string>();
  const { planId, provider } = useMemo(
    () =>
      normalizeHostedCheckoutIntent({
        plan: initialPlan,
        provider: initialProvider,
      }),
    [initialPlan, initialProvider],
  );

  const copy = useMemo<LauncherCopy>(() => {
    if (locale === "es") {
      return {
        backToPricing: "Volver a precios",
        invalidRequest:
          "Esta solicitud de pago no es valida. Vuelve a precios e intenta de nuevo.",
        loadingLemonSqueezy:
          "Leyendo esta preparando tu checkout de LemonSqueezy en esta pestana.",
        loadingMercadoPago:
          "Leyendo esta preparando tu checkout de MercadoPago en esta pestana.",
        loadingTitle: "Abriendo pago seguro",
        missingLemonSqueezy:
          "Leyendo no pudo crear el checkout de LemonSqueezy.",
        missingMercadoPago: "Leyendo no pudo crear el checkout de MercadoPago.",
        retryHint:
          "Deja abierta la pestana original de Leyendo y vuelve a intentarlo desde precios.",
      };
    }

    if (locale === "pt") {
      return {
        backToPricing: "Voltar para precos",
        invalidRequest:
          "Este pedido de pagamento nao e valido. Volte para precos e tente de novo.",
        loadingLemonSqueezy:
          "O Leyendo esta preparando seu checkout do LemonSqueezy nesta aba.",
        loadingMercadoPago:
          "O Leyendo esta preparando seu checkout do MercadoPago nesta aba.",
        loadingTitle: "Abrindo pagamento seguro",
        missingLemonSqueezy:
          "O Leyendo nao conseguiu criar o checkout do LemonSqueezy.",
        missingMercadoPago:
          "O Leyendo nao conseguiu criar o checkout do MercadoPago.",
        retryHint:
          "Mantenha a aba original do Leyendo aberta e tente novamente pela pagina de precos.",
      };
    }

    return {
      backToPricing: "Back to pricing",
      invalidRequest:
        "This payment request is not valid. Go back to pricing and try again.",
      loadingLemonSqueezy:
        "Leyendo is preparing your LemonSqueezy checkout in this tab.",
      loadingMercadoPago:
        "Leyendo is preparing your MercadoPago checkout in this tab.",
      loadingTitle: "Opening secure checkout",
      missingLemonSqueezy:
        "Leyendo could not create the LemonSqueezy checkout.",
      missingMercadoPago: "Leyendo could not create the MercadoPago checkout.",
      retryHint:
        "Keep the original Leyendo tab open and try again from pricing.",
    };
  }, [locale]);

  useEffect(() => {
    if (!planId || !provider) {
      setErrorMessage(copy.invalidRequest);
      return;
    }

    let cancelled = false;
    const fallbackMessage =
      provider === "mercadopago"
        ? copy.missingMercadoPago
        : copy.missingLemonSqueezy;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(paidSignupPlanStorageKey, planId);
      window.localStorage.removeItem(pendingCheckoutSubscriptionIdStorageKey);
    }

    void (async () => {
      try {
        const response = await fetch(getCheckoutApiPath(provider), {
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
        const payload = (await response
          .json()
          .catch(() => null)) as CheckoutResponsePayload | null;

        if (!response.ok || !payload?.checkoutUrl) {
          if (!cancelled) {
            setErrorMessage(payload?.error ?? fallbackMessage);
          }
          return;
        }

        if (typeof window !== "undefined") {
          if (payload.providerSubscriptionId?.trim()) {
            window.localStorage.setItem(
              pendingCheckoutSubscriptionIdStorageKey,
              payload.providerSubscriptionId.trim(),
            );
          } else {
            window.localStorage.removeItem(
              pendingCheckoutSubscriptionIdStorageKey,
            );
          }
        }

        if (!cancelled) {
          (navigate ?? ((url: string) => window.location.replace(url)))(
            payload.checkoutUrl,
          );
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(fallbackMessage);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    copy.invalidRequest,
    copy.missingLemonSqueezy,
    copy.missingMercadoPago,
    locale,
    navigate,
    planId,
    provider,
    user?.email,
    user?.id,
  ]);

  const pricingPath = getLocalizedPublicPath("/pricing", locale);
  const loadingMessage =
    provider === "mercadopago"
      ? copy.loadingMercadoPago
      : copy.loadingLemonSqueezy;

  return (
    <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-8">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[rgba(14,18,35,0.92)] p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur sm:p-10">
        <p className="text-[0.68rem] font-bold tracking-[0.34em] text-[#d49a61] uppercase">
          Leyendo Checkout
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {copy.loadingTitle}
        </h1>
        {errorMessage ? (
          <div className="mt-6 space-y-4 text-[#d7dbea]">
            <p className="text-base leading-7 sm:text-lg">{errorMessage}</p>
            <p className="text-sm leading-6 text-[#9aa4bf]">{copy.retryHint}</p>
            <Link
              href={pricingPath}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/16 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {copy.backToPricing}
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4 text-[#d7dbea]">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#d49a61]/35 bg-[#d49a61]/10 text-[#f5c278]">
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-base leading-7 sm:text-lg">{loadingMessage}</p>
            <p className="text-sm leading-6 text-[#9aa4bf]">{copy.retryHint}</p>
          </div>
        )}
      </div>
    </section>
  );
}

import type { Metadata } from "next";

import { AccountPanel } from "@/components/auth/account-panel";
import { AppShell } from "@/components/layout/app-shell";
import { isPaidPlan, normalizePlanTier, type PaidPlanTier } from "@/lib/plans";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Account",
  description:
    "Paid Leyendo account access for Focus and Max readers who want cloud sync and saved vocabulary.",
  path: "/account",
  index: false,
});

interface AccountPageProps {
  searchParams?: Promise<{
    checkout_intent?: string;
    checkout?: string;
    payment?: string;
    plan?: string;
    provider?: string;
  }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const planTier = normalizePlanTier(resolvedSearchParams.plan);
  const paidSignupPlan: PaidPlanTier | undefined =
    resolvedSearchParams.payment === "success" && isPaidPlan(planTier)
      ? planTier
      : undefined;
  const paymentProvider =
    resolvedSearchParams.provider === "lemonsqueezy" ||
    resolvedSearchParams.provider === "mercadopago"
      ? resolvedSearchParams.provider
      : undefined;
  const requestedCheckoutPlan = normalizePlanTier(
    resolvedSearchParams.checkout ?? resolvedSearchParams.plan,
  );
  const checkoutPlan: PaidPlanTier | undefined =
    resolvedSearchParams.payment === "success" ||
    !isPaidPlan(requestedCheckoutPlan)
      ? undefined
      : requestedCheckoutPlan;
  const checkoutProvider = paymentProvider;
  const accountTitle = checkoutPlan
    ? {
        en: "Create your Basic Reader account first.",
        es: "Crea primero tu cuenta Basic Reader.",
        pt: "Crie primeiro sua conta Basic Reader.",
      }
    : paidSignupPlan
      ? {
          en: `Return to your ${paidSignupPlan === "max" ? "Max" : "Focus"} account.`,
          es: `Vuelve a tu cuenta ${paidSignupPlan === "max" ? "Max" : "Focus"}.`,
          pt: `Volte para sua conta ${paidSignupPlan === "max" ? "Max" : "Focus"}.`,
        }
      : {
          en: "Create or sign in to your Basic Reader account.",
          es: "Crea o entra en tu cuenta Basic Reader.",
          pt: "Crie ou entre na sua conta Basic Reader.",
        };
  const accountDescription = checkoutPlan
    ? {
        en: `${checkoutPlan === "max" ? "Max" : "Focus"} starts after sign-in. Your account begins on Basic Reader and returns here upgraded after payment.`,
        es: `${checkoutPlan === "max" ? "Max" : "Focus"} empieza despues de entrar. Tu cuenta comienza en Basic Reader y vuelve aqui mejorada tras el pago.`,
        pt: `${checkoutPlan === "max" ? "Max" : "Focus"} comeca depois do login. Sua conta começa em Basic Reader e volta aqui atualizada apos o pagamento.`,
      }
    : paidSignupPlan
      ? {
          en: "Payment is approved. Do not pay again. Open the same Leyendo account that started checkout to confirm the upgraded plan.",
          es: "El pago esta aprobado. No pagues otra vez. Abre la misma cuenta de Leyendo que inicio el checkout para confirmar el plan mejorado.",
          pt: "O pagamento foi aprovado. Nao pague de novo. Abra a mesma conta do Leyendo que iniciou o checkout para confirmar o plano atualizado.",
        }
      : {
          en: "Basic Reader is free. Sign in now and upgrade later if you want cloud sync and saved words.",
          es: "Basic Reader es gratis. Entra ahora y mejora despues si quieres sincronizacion en la nube y palabras guardadas.",
          pt: "Basic Reader e gratis. Entre agora e faca upgrade depois se quiser sincronizacao na nuvem e palavras salvas.",
        };

  return (
    <AppShell centerIntro title={accountTitle} description={accountDescription}>
      <AccountPanel
        paidSignupPlan={paidSignupPlan}
        paidSignupProvider={
          resolvedSearchParams.payment === "success"
            ? paymentProvider
            : undefined
        }
        paidSignupCheckoutIntentId={
          resolvedSearchParams.payment === "success"
            ? resolvedSearchParams.checkout_intent
            : undefined
        }
        checkoutPlan={checkoutPlan}
        checkoutProvider={checkoutProvider}
      />
    </AppShell>
  );
}

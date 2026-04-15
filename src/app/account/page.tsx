import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
  const requestedCheckoutPlan = normalizePlanTier(
    resolvedSearchParams.checkout ?? resolvedSearchParams.plan,
  );
  const checkoutPlan: PaidPlanTier | undefined =
    resolvedSearchParams.payment === "success" ||
    !isPaidPlan(requestedCheckoutPlan)
      ? undefined
      : requestedCheckoutPlan;
  const checkoutProvider =
    resolvedSearchParams.provider === "lemonsqueezy" ||
    resolvedSearchParams.provider === "mercadopago"
      ? resolvedSearchParams.provider
      : undefined;

  if (checkoutPlan && checkoutProvider) {
    redirect(`/pricing?checkout=${checkoutPlan}&provider=${checkoutProvider}`);
  }

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
          en: "Account",
          es: "Cuenta",
          pt: "Conta",
        };
  const accountDescription = checkoutPlan
    ? {
        en: `${checkoutPlan === "max" ? "Max" : "Focus"} starts after sign-in. Your account begins on Basic Reader and returns here upgraded after payment.`,
        es: `${checkoutPlan === "max" ? "Max" : "Focus"} empieza despues de entrar. Tu cuenta comienza en Basic Reader y vuelve aqui mejorada tras el pago.`,
        pt: `${checkoutPlan === "max" ? "Max" : "Focus"} comeca depois do login. Sua conta começa em Basic Reader e volta aqui atualizada apos o pagamento.`,
      }
    : paidSignupPlan
      ? {
          en: "Payment is approved. Open this account with the same checkout email to confirm the upgraded plan.",
          es: "El pago esta aprobado. Abre esta cuenta con el mismo email del checkout para confirmar el plan mejorado.",
          pt: "O pagamento foi aprovado. Abra esta conta com o mesmo email do checkout para confirmar o plano atualizado.",
        }
      : {
          en: "Already have a Leyendo account? Sign in here to manage your library, sync, and plan.",
          es: "Ya tienes cuenta en Leyendo? Entra aqui para gestionar tu biblioteca, sincronizacion y plan.",
          pt: "Ja tem conta no Leyendo? Entre aqui para gerenciar sua biblioteca, sincronizacao e plano.",
        };

  return (
    <AppShell centerIntro title={accountTitle} description={accountDescription}>
      <AccountPanel
        paidSignupPlan={paidSignupPlan}
        checkoutPlan={checkoutPlan}
        checkoutProvider={checkoutProvider}
      />
    </AppShell>
  );
}

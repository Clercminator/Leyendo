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
        en: `${checkoutPlan === "max" ? "Max" : "Focus"} checkout starts after you sign in. Leyendo creates your Basic Reader account first, then brings you back here with the upgraded plan after payment.`,
        es: `El checkout de ${checkoutPlan === "max" ? "Max" : "Focus"} empieza despues de entrar. Leyendo crea primero tu cuenta Basic Reader y luego te trae de vuelta aqui con el plan mejorado tras el pago.`,
        pt: `O checkout de ${checkoutPlan === "max" ? "Max" : "Focus"} comeca depois do login. O Leyendo cria primeiro sua conta Basic Reader e depois traz voce de volta aqui com o plano atualizado apos o pagamento.`,
      }
    : paidSignupPlan
      ? {
          en: "Payment is approved. Open this account with the same email used in checkout to confirm the upgraded plan and sync access.",
          es: "El pago esta aprobado. Abre esta cuenta con el mismo email usado en el checkout para confirmar el plan mejorado y el acceso sincronizado.",
          pt: "O pagamento foi aprovado. Abra esta conta com o mesmo email usado no checkout para confirmar o plano atualizado e o acesso sincronizado.",
        }
      : {
          en: "Basic Reader accounts are free. Upgrade to Focus or Max after signing in whenever you want cloud sync and saved-word tools.",
          es: "Las cuentas Basic Reader son gratis. Mejora a Focus o Max despues de entrar cuando quieras sincronizacion en la nube y herramientas de palabras guardadas.",
          pt: "As contas Basic Reader sao gratuitas. Faca upgrade para Focus ou Max depois do login quando quiser sincronizacao na nuvem e ferramentas de palavras salvas.",
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

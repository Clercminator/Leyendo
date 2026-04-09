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
    payment?: string;
    plan?: string;
  }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const planTier = normalizePlanTier(resolvedSearchParams.plan);
  const paidSignupPlan: PaidPlanTier | undefined =
    resolvedSearchParams.payment === "success" && isPaidPlan(planTier)
      ? planTier
      : undefined;

  return (
    <AppShell
      centerIntro
      title={{
        en: "Unlock cloud sync with Focus or Max.",
        es: "Desbloquea la sincronizacion en la nube con Focus o Max.",
        pt: "Desbloqueie a sincronizacao na nuvem com Focus ou Max.",
      }}
      description={{
        en: "Guest reading still works without signing in, but cross-device sync and saved-word tools now require a paid Focus or Max account.",
        es: "La lectura como invitado sigue funcionando sin iniciar sesion, pero la sincronizacion entre dispositivos y las herramientas de palabras guardadas ahora requieren una cuenta pagada Focus o Max.",
        pt: "A leitura como convidado continua funcionando sem login, mas a sincronizacao entre dispositivos e as ferramentas de palavras salvas agora exigem uma conta paga Focus ou Max.",
      }}
    >
      <AccountPanel paidSignupPlan={paidSignupPlan} />
    </AppShell>
  );
}

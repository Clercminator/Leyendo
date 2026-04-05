import type { Metadata } from "next";

import { AccountPanel } from "@/components/auth/account-panel";
import { AppShell } from "@/components/layout/app-shell";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Account",
  description:
    "Optional Leyendo account access for people who want cloud backup and cross-device reading.",
  path: "/account",
  index: false,
});

export default function AccountPage() {
  return (
    <AppShell
      centerIntro
      title={{
        en: "Sync your library across devices.",
        es: "Sincroniza tu biblioteca entre dispositivos.",
        pt: "Sincronize sua biblioteca entre dispositivos.",
      }}
      description={{
        en: "Accounts are only for people who want cloud backup and cross-device reading. Guest reading still works without signing in.",
        es: "Las cuentas son solo para quienes quieren respaldo en la nube y lectura entre dispositivos. El modo invitado sigue funcionando sin iniciar sesión.",
        pt: "As contas sao apenas para quem quer backup na nuvem e leitura entre dispositivos. O modo convidado continua funcionando sem login.",
      }}
    >
      <AccountPanel />
    </AppShell>
  );
}

import { AccountPanel } from "@/components/auth/account-panel";
import { AppShell } from "@/components/layout/app-shell";

export default function AccountPage() {
  return (
    <AppShell
      eyebrow={{
        en: "Optional account",
        es: "Cuenta opcional",
        pt: "Conta opcional",
      }}
      title={{
        en: "Keep Leyendo local by default, or sign in to sync your library across devices.",
        es: "Manten Leyendo local por defecto, o entra para sincronizar tu biblioteca entre dispositivos.",
        pt: "Mantenha o Leyendo local por padrao, ou entre para sincronizar sua biblioteca entre dispositivos.",
      }}
      description={{
        en: "Accounts are only for people who want cloud backup and cross-device reading. Guest reading still works without signing in.",
        es: "Las cuentas son solo para quienes quieren respaldo en la nube y lectura entre dispositivos. El modo invitado sigue funcionando sin iniciar sesion.",
        pt: "As contas sao apenas para quem quer backup na nuvem e leitura entre dispositivos. O modo convidado continua funcionando sem login.",
      }}
    >
      <AccountPanel />
    </AppShell>
  );
}

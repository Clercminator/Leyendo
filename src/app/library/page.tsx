import { AppShell } from "@/components/layout/app-shell";
import { LibraryList } from "@/components/library/library-list";

export default function LibraryPage() {
  return (
    <AppShell
      eyebrow={{
        en: "Library",
        es: "Biblioteca",
        pt: "Biblioteca",
      }}
      title={{
        en: "Your documents, progress, highlights, and return points stay organized here.",
        es: "Tus documentos, progreso, destacados y puntos de regreso se ordenan aqui.",
        pt: "Seus documentos, progresso, destaques e pontos de retorno ficam organizados aqui.",
      }}
      description={{
        en: "Reopen what you were reading, jump back to saved moments, and manage the library stored on this device or synced to your account.",
        es: "Reabre lo que estabas leyendo, vuelve a momentos guardados y gestiona la biblioteca almacenada en este dispositivo o sincronizada con tu cuenta.",
        pt: "Reabra o que voce estava lendo, volte a momentos salvos e gerencie a biblioteca salva neste dispositivo ou sincronizada com sua conta.",
      }}
    >
      <LibraryList />
    </AppShell>
  );
}

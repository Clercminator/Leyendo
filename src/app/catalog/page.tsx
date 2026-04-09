import type { Metadata } from "next";

import { CatalogPageContent } from "@/components/catalog/catalog-page-content";
import { AppShell } from "@/components/layout/app-shell";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Catalog",
  description:
    "A curated Max-only Leyendo catalog with private books opened on demand inside the reader.",
  path: "/catalog",
  index: false,
});

export default function CatalogPage() {
  return (
    <AppShell
      eyebrow={{
        en: "Max catalog",
        es: "Catalogo Max",
        pt: "Catalogo Max",
      }}
      title={{
        en: "Browse the curated private catalog without mixing it into your personal library.",
        es: "Explora el catalogo privado curado sin mezclarlo con tu biblioteca personal.",
        pt: "Explore o catalogo privado curado sem misturar com sua biblioteca pessoal.",
      }}
      description={{
        en: "Only the book you open is brought into Leyendo. The rest stay in the background so storage and local cache stay under control.",
        es: "Solo el libro que abras entra en Leyendo. El resto se queda en segundo plano para mantener controlados el almacenamiento y la cache local.",
        pt: "Apenas o livro que voce abre entra no Leyendo. O restante fica em segundo plano para manter armazenamento e cache local sob controle.",
      }}
    >
      <CatalogPageContent />
    </AppShell>
  );
}

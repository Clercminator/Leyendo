"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useLocale } from "@/components/layout/locale-provider";

export default function PrivacyPage() {
  const { locale } = useLocale();

  const localItems = {
    en: [
      "Uploaded source files for supported formats",
      "Processed reading structures and session progress",
      "Theme and pacing preferences",
      "Bookmarks and onboarding choices",
    ],
    es: [
      "Archivos fuente cargados en formatos compatibles",
      "Estructuras de lectura procesadas y progreso de sesion",
      "Tema y preferencias de ritmo",
      "Marcadores y elecciones iniciales",
    ],
    pt: [
      "Arquivos enviados em formatos compativeis",
      "Estruturas de leitura processadas e progresso da sessao",
      "Tema e preferencias de ritmo",
      "Marcadores e escolhas iniciais",
    ],
  };

  const noCloudItems = {
    en: [
      "No mandatory sign-in",
      "No analytics dependency",
      "No remote document syncing",
      "No hidden upload to a cloud account",
    ],
    es: [
      "Sin inicio de sesion obligatorio",
      "Sin dependencia de analitica",
      "Sin sincronizacion remota de documentos",
      "Sin subidas ocultas a una cuenta en la nube",
    ],
    pt: [
      "Sem login obrigatorio",
      "Sem dependencia de analitica",
      "Sem sincronizacao remota de documentos",
      "Sem envio oculto para uma conta na nuvem",
    ],
  };

  return (
    <AppShell
      eyebrow={{
        en: "Privacy",
        es: "Privacidad",
        pt: "Privacidade",
      }}
      title={{
        en: "Your documents should not need a cloud account to become readable.",
        es: "Tus documentos no deberian necesitar una cuenta en la nube para volverse legibles.",
        pt: "Seus documentos nao deveriam precisar de uma conta na nuvem para ficarem legiveis.",
      }}
      description={{
        en: "Leyendo extracts and processes readable content in the browser whenever possible, then keeps preferences, progress, and saved markers on this device.",
        es: "Leyendo extrae y procesa contenido legible en el navegador cuando es posible, y guarda preferencias, progreso y marcadores en este dispositivo.",
        pt: "Leyendo extrai e processa conteudo legivel no navegador sempre que possivel e guarda preferencias, progresso e marcadores neste dispositivo.",
      }}
    >
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-(--text-strong)">
            {locale === "en"
              ? "What stays local"
              : locale === "es"
                ? "Lo que se queda aqui"
                : "O que fica local"}
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-(--text-muted)">
            {localItems[locale].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-(--text-strong)">
            {locale === "en"
              ? "What Leyendo does not do with your documents"
              : locale === "es"
                ? "Lo que Leyendo no hace con tus documentos"
                : "O que o Leyendo nao faz com seus documentos"}
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-(--text-muted)">
            {noCloudItems[locale].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </AppShell>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";

import { ArrowUpRight, UserRound } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ModeGallery } from "@/components/reader/mode-gallery";
import { getFeaturedGuidesForLocale } from "@/lib/guides";
import { getLocalizedCopy } from "@/lib/locale";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import {
  absoluteUrl,
  founderBio,
  founderGitHubUrl,
  founderLinkedInUrl,
  founderName,
  founderRole,
  siteName,
  siteUrl,
} from "@/lib/site";

const aboutEyebrow = {
  en: "About Leyendo",
  es: "Sobre Leyendo",
  pt: "Sobre o Leyendo",
};

const aboutTitle = {
  en: "Why Leyendo exists and why it is built around real documents.",
  es: "Por que existe Leyendo y por que esta construido alrededor de documentos reales.",
  pt: "Por que o Leyendo existe e por que ele foi construido em torno de documentos reais.",
};

const aboutDescription = {
  en: "Leyendo is a reading workspace for people who need more control over dense material: faster pace when the text allows it, calmer recovery when the document pushes back.",
  es: "Leyendo es un espacio de lectura para quienes necesitan mas control sobre material denso: mas ritmo cuando el texto lo permite y recuperacion mas calmada cuando el documento se pone dificil.",
  pt: "O Leyendo e um espaco de leitura para quem precisa de mais controle sobre material denso: mais ritmo quando o texto permite e retomada mais calma quando o documento aperta.",
};

const firstSessionProofEyebrow = {
  en: "What to verify first",
  es: "Lo que debes verificar primero",
  pt: "O que verificar primeiro",
};

const firstSessionProofTitle = {
  en: "The promise should prove itself on your first real document.",
  es: "La promesa debe notarse en tu primer documento real.",
  pt: "A promessa deveria se provar no seu primeiro documento real.",
};

const firstSessionProofDescription = {
  en: "These are the behaviors Leyendo should make obvious within minutes, not after a long setup or a paid upgrade.",
  es: "Esto debería quedar claro en minutos, no después de una configuración larga ni de subir de plan.",
  pt: "Estes sao os comportamentos que o Leyendo deveria tornar obvios em minutos, nao depois de uma configuracao longa ou de um upgrade pago.",
};

const firstSessionProofCards = {
  en: [
    {
      eyebrow: "Recommendation",
      title: "A reading goal changes the starting setup",
      description:
        "Pick a goal and the starting mode and pace should shift with it before you ever touch a dense settings panel.",
      note: "The system should help first, not wait for manual tuning.",
    },
    {
      eyebrow: "Mode switching",
      title: "You stay in one document while the view changes",
      description:
        "Move from faster text modes into Classic Reader or Standard PDF without opening a second copy or rebuilding your place.",
      note: "Context recovery should be part of the product, not an afterthought.",
    },
    {
      eyebrow: "Continuity",
      title: "Progress stays attached to the document",
      description:
        "Leave, reopen from the library, and keep your pace, highlights, bookmarks, and recovery path tied to the same file.",
      note: "Local-first continuity is part of the promise.",
    },
  ],
  es: [
    {
      eyebrow: "Recomendación",
      title: "Un objetivo de lectura cambia el punto de partida",
      description:
        "Al elegir un objetivo, el modo inicial y el ritmo deberían ajustarse antes de abrir una pantalla llena de ajustes.",
      note: "El sistema debe ayudar primero, no esperar ajustes manuales.",
    },
    {
      eyebrow: "Cambio de modo",
      title: "Sigues en el mismo documento aunque cambie la vista",
      description:
        "Pasa de los modos rápidos al Lector clásico o al PDF estándar sin abrir otra copia ni perder tu lugar.",
      note: "Recuperar contexto debe ser parte del producto, no algo secundario.",
    },
    {
      eyebrow: "Continuidad",
      title: "El progreso sigue unido al documento",
      description:
        "Sal, vuelve desde la biblioteca y conserva el ritmo, los destacados, los marcadores y tu punto de regreso en el mismo archivo.",
      note: "La continuidad local forma parte de la promesa.",
    },
  ],
  pt: [
    {
      eyebrow: "Recomendacao",
      title: "Um objetivo de leitura muda o ponto de partida",
      description:
        "Escolha um objetivo e o modo inicial com seu ritmo deveriam mudar antes de tocar em uma tela densa de ajustes.",
      note: "O sistema deveria ajudar primeiro, nao esperar ajuste manual.",
    },
    {
      eyebrow: "Troca de modo",
      title: "Voce fica no mesmo documento enquanto a vista muda",
      description:
        "Passe dos modos rapidos de texto para Leitor classico ou PDF standard sem abrir uma segunda copia nem reconstruir seu lugar.",
      note: "Recuperar contexto precisa fazer parte do produto, nao ser um detalhe tardio.",
    },
    {
      eyebrow: "Continuidade",
      title: "O progresso continua ligado ao documento",
      description:
        "Saia, volte pela biblioteca e mantenha ritmo, destaques, marcadores e caminho de retomada presos ao mesmo arquivo.",
      note: "A continuidade local-first faz parte da promessa.",
    },
  ],
};

const modesEyebrow = {
  en: "Reading modes",
  es: "Modos de lectura",
  pt: "Modos de leitura",
};

const modesTitle = {
  en: "Choose the reading mode that fits the document, the task, and your current attention.",
  es: "Elige el modo que mejor se adapte al documento, la tarea y tu atención.",
  pt: "Escolha o modo de leitura que combina com o documento, a tarefa e sua atencao atual.",
};

const sectionCopy = {
  purposeTitle: {
    en: "What Leyendo is",
    es: "Que es Leyendo",
    pt: "O que e o Leyendo",
  },
  purposeBody: {
    en: "Leyendo is not built around reading hacks. It is built around the real moment when a chapter, report, article, or PDF starts costing too much attention. The product gives you a calmer way to push pace, recover context, and stay inside the same document instead of bouncing between disconnected tools.",
    es: "Leyendo no esta construido alrededor de trucos de lectura. Esta construido alrededor del momento real en que un capitulo, informe, articulo o PDF empieza a costarte demasiada atencion. El producto te da una forma mas serena de acelerar, recuperar contexto y seguir dentro del mismo documento en vez de saltar entre herramientas desconectadas.",
    pt: "O Leyendo nao foi construido em torno de truques de leitura. Ele foi construido em torno do momento real em que um capitulo, relatorio, artigo ou PDF passa a cobrar atencao demais. O produto oferece um jeito mais calmo de acelerar, recuperar contexto e continuar no mesmo documento em vez de pular entre ferramentas desconectadas.",
  },
  differenceTitle: {
    en: "How it differs from generic fast-reading advice",
    es: "Como se diferencia del consejo generico sobre leer rapido",
    pt: "Como ele se diferencia do conselho generico sobre leitura rapida",
  },
  differenceBody: {
    en: "Most fast-reading advice stays abstract. Leyendo turns it into operating behavior: mode switching without losing place, a classic fallback when speed is no longer helping, progress that stays attached to the document, and local-first reading before any account is required.",
    es: "La mayoria de los consejos sobre leer rapido se queda en lo abstracto. Leyendo lo convierte en comportamiento operativo: cambio de modo sin perder el lugar, una vista clasica de respaldo cuando la velocidad deja de ayudar, progreso unido al documento y lectura local antes de pedirte una cuenta.",
    pt: "Grande parte do conselho sobre leitura rapida fica no abstrato. O Leyendo transforma isso em comportamento real: troca de modo sem perder o lugar, uma vista classica de reserva quando a velocidade para de ajudar, progresso ligado ao documento e leitura local antes de exigir conta.",
  },
  founderTitle: {
    en: "About the developer",
    es: "Sobre el desarrollador",
    pt: "Sobre o desenvolvedor",
  },
  founderBody: {
    en: `${founderName} built ${siteName} from the frustration of reading dense material with tools that were either too passive, too gimmicky, or too detached from real work. The product direction comes from long-form reading, practical AI, and the belief that control and recovery matter as much as raw pace.`,
    es: `${founderName} creo ${siteName} desde la frustracion de leer material denso con herramientas demasiado pasivas, demasiado gimmicky o demasiado alejadas del trabajo real. La direccion del producto nace de la lectura larga, la IA practica y la idea de que el control y la recuperacion importan tanto como la velocidad.`,
    pt: `${founderName} criou o ${siteName} a partir da frustracao de ler material denso com ferramentas passivas demais, apelativas demais ou distantes demais do trabalho real. A direcao do produto vem da leitura longa, da IA pratica e da ideia de que controle e retomada importam tanto quanto a velocidade.`,
  },
};

const bilingualSearchSummary = [
  {
    id: "en",
    title: "If you searched for reading speed or fast reading",
    body: "Leyendo is built for that use case, but with more care for comprehension, control, and real documents than most speed reading pages offer.",
  },
  {
    id: "es",
    title: "Si buscaste lectura rapida o leer mas rapido",
    body: "Leyendo esta hecho para eso, pero con mas cuidado por la comprension, el control y los documentos reales que la mayoria de las paginas sobre lectura rapida.",
  },
];

const publicGuidesCopy = {
  eyebrow: {
    en: "Public reading paths",
    es: "Rutas publicas de lectura",
    pt: "Caminhos publicos de leitura",
  },
  title: {
    en: "Read the operating philosophy behind the product.",
    es: "Lee la filosofia operativa detras del producto.",
    pt: "Leia a filosofia operacional por tras do produto.",
  },
  body: {
    en: "The public guides explain how Leyendo approaches pace, comprehension, and recovery on real documents without forcing users through a single landing page.",
    es: "Las guias publicas explican como Leyendo aborda ritmo, comprension y recuperacion en documentos reales sin obligar a todo el mundo a pasar por una sola landing page.",
    pt: "As guias publicas explicam como o Leyendo trata ritmo, compreensao e retomada em documentos reais sem obrigar todo mundo a passar por uma unica landing page.",
  },
  browseAll: {
    en: "Browse all guides",
    es: "Ver todas las guias",
    pt: "Ver todas as guias",
  },
  readGuide: {
    en: "Read guide",
    es: "Leer guia",
    pt: "Ler guia",
  },
};

const founderPhotoAlt = {
  en: `${founderName} portrait`,
  es: `Retrato de ${founderName}`,
  pt: `Retrato de ${founderName}`,
};

const founderPhotoSrc = "/David%20Clerc%20empresarial%20traje.webp";

export function AboutPageContent() {
  const { locale } = useLocale();
  const featuredGuides = getFeaturedGuidesForLocale(locale);
  const [founderImgError, setFounderImgError] = useState(false);
  const localizedAboutPath = getLocalizedPublicPath("/about", locale);
  const localizedGuidesPath = getLocalizedPublicPath("/guides", locale);

  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
        logo: absoluteUrl("/apple-icon"),
      },
      {
        "@type": "Person",
        name: founderName,
        jobTitle: founderRole,
        description: founderBio,
        url: absoluteUrl(localizedAboutPath),
        sameAs: [founderLinkedInUrl, founderGitHubUrl],
        worksFor: {
          "@type": "Organization",
          name: siteName,
        },
      },
    ],
  };

  return (
    <AppShell
      eyebrow={aboutEyebrow}
      title={aboutTitle}
      description={aboutDescription}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(aboutJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="space-y-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, sectionCopy.purposeTitle)}
            </h2>
            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {getLocalizedCopy(locale, sectionCopy.purposeBody)}
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-(--text-strong)">
              {getLocalizedCopy(locale, sectionCopy.differenceTitle)}
            </h2>
            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {getLocalizedCopy(locale, sectionCopy.differenceBody)}
            </p>
          </article>
        </section>

        <section className="fade-rise-delayed space-y-5">
          <div className="w-full">
            <p className="editorial-kicker text-(--accent-amber)">
              {getLocalizedCopy(locale, firstSessionProofEyebrow)}
            </p>
            <h2 className="font-heading mt-3 text-4xl leading-tight font-semibold text-balance text-(--text-strong) lg:text-[3rem]">
              {getLocalizedCopy(locale, firstSessionProofTitle)}
            </h2>
            <p className="mt-4 text-base leading-8 text-(--text-muted)">
              {getLocalizedCopy(locale, firstSessionProofDescription)}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {firstSessionProofCards[locale].map((card, index) => (
              <article
                key={card.title}
                className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_18px_70px_rgba(20,26,56,0.1)] backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs tracking-[0.18em] text-(--accent-sky) uppercase">
                    {card.eyebrow}
                  </p>
                  <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-1 text-xs font-medium text-(--text-strong)">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-heading mt-4 text-2xl leading-tight font-semibold text-(--text-strong)">
                  {card.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-(--text-muted)">
                  {card.description}
                </p>
                <p className="mt-4 text-sm font-medium text-(--text-strong)">
                  {card.note}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="fade-rise-delayed space-y-5">
          <div className="w-full">
            <p className="editorial-kicker text-(--accent-sky)">
              {getLocalizedCopy(locale, modesEyebrow)}
            </p>
            <h2 className="font-heading mt-3 text-4xl leading-tight font-semibold text-balance text-(--text-strong) lg:text-[3rem]">
              {getLocalizedCopy(locale, modesTitle)}
            </h2>
          </div>
          <ModeGallery />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {bilingualSearchSummary.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.75rem] border border-(--border-soft) bg-(--surface-soft) p-6"
            >
              <h2 className="text-xl font-semibold text-(--text-strong)">
                {entry.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-(--text-muted)">
                {entry.body}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 backdrop-blur-xl">
          <p className="editorial-kicker text-(--accent-amber)">
            {getLocalizedCopy(locale, publicGuidesCopy.eyebrow)}
          </p>
          <h2 className="font-heading mt-4 text-3xl leading-tight font-semibold text-(--text-strong)">
            {getLocalizedCopy(locale, publicGuidesCopy.title)}
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-(--text-muted)">
            {getLocalizedCopy(locale, publicGuidesCopy.body)}
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={getLocalizedPublicPath(`/guides/${guide.slug}`, locale)}
                className="rounded-[1.25rem] border border-(--border-soft) bg-(--surface-soft) px-5 py-5 transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                <p className="text-sm text-(--text-muted)">
                  {guide.clusterLabel}
                </p>
                <h3 className="mt-2 text-base font-semibold text-(--text-strong)">
                  {guide.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                  {guide.description}
                </p>
                <p className="mt-4 text-sm font-semibold text-(--text-strong)">
                  {getLocalizedCopy(locale, publicGuidesCopy.readGuide)}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href={localizedGuidesPath}
              className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              {getLocalizedCopy(locale, publicGuidesCopy.browseAll)}
              <ArrowUpRight className="h-4 w-4 text-(--accent-sky)" />
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-(--border-soft) bg-(--surface-strong) shadow-[0_18px_70px_rgba(20,26,56,0.1)]">
          <div className="px-6 pt-7 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10">
            <p className="editorial-kicker text-(--accent-sky)">
              {getLocalizedCopy(locale, sectionCopy.founderTitle)}
            </p>
          </div>

          <div className="grid gap-8 px-6 pt-6 pb-6 sm:px-8 sm:pb-8 lg:grid-cols-[minmax(17rem,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-12 lg:px-10 lg:pt-8 lg:pb-10 xl:gap-16">
            <figure
              data-testid="about-founder-photo"
              className="mx-auto w-full max-w-md overflow-hidden rounded-[1.5rem] border border-(--border-soft) bg-(--surface-soft) shadow-[0_18px_48px_rgba(20,26,56,0.16)] lg:mx-0"
            >
              {!founderImgError ? (
                <img
                  src={founderPhotoSrc}
                  alt={getLocalizedCopy(locale, founderPhotoAlt)}
                  width={512}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  className="aspect-4/5 w-full object-cover object-top"
                  onError={() => {
                    setFounderImgError(true);
                  }}
                />
              ) : (
                <div className="flex aspect-4/5 w-full items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(20,26,56,0.18))] text-(--text-muted)">
                  <UserRound className="h-10 w-10" aria-hidden />
                </div>
              )}
            </figure>

            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.2em] text-(--accent-amber) uppercase">
                {founderRole}
              </p>
              <h2 className="font-heading mt-3 text-4xl leading-none font-semibold text-(--text-strong) sm:text-5xl">
                {founderName}
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-8 text-(--text-strong) sm:text-lg sm:leading-9">
                {getLocalizedCopy(locale, sectionCopy.founderBody)}
              </p>

              <div className="mt-7 border-t border-(--border-soft) pt-7">
                <p className="max-w-3xl text-sm leading-7 text-(--text-muted) sm:text-base sm:leading-8">
                  {founderBio}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href={founderLinkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-(--text-strong) px-5 py-3 text-sm font-semibold text-(--text-on-accent) transition hover:opacity-90"
                  >
                    LinkedIn
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <a
                    href={founderGitHubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm font-semibold text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    GitHub
                    <ArrowUpRight className="h-4 w-4 text-(--accent-amber)" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

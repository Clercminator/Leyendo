import type { AppLocale } from "@/lib/locale";

type PageCopy = {
  title: string;
  description: string;
  keywords?: string[];
};

type LocalizedPageCopy = Record<AppLocale, PageCopy>;

export const publicPageMetadataCopy: Record<
  "home" | "about" | "guides" | "pricing" | "privacy",
  LocalizedPageCopy
> = {
  home: {
    en: {
      title: "Reading speed for real documents",
      description:
        "Leyendo helps readers searching for reading speed, fast reading, lectura rapida, and leer mas rapido. Read PDFs and dense documents faster with better focus, calmer pacing, and more control.",
      keywords: [
        "reading speed",
        "fast reading",
        "speed reading app",
        "read faster",
        "lectura rapida",
        "leer mas rapido",
        "velocidad de lectura",
        "comprension lectora",
      ],
    },
    es: {
      title: "Lee más rápido en varios modos y formatos",
      description:
        "Importa PDF, DOCX, RTF, Markdown o texto pegado. Lee más rápido en varios modos y cambia de ritmo sin perder tu lugar.",
      keywords: [
        "lectura rapida",
        "leer mas rapido",
        "velocidad de lectura",
        "comprension lectora",
        "lector de PDF",
        "leer PDF mas rapido",
      ],
    },
    pt: {
      title: "Velocidade de leitura para documentos reais",
      description:
        "Leyendo ajuda leitores que procuram velocidade de leitura, ler mais rapido e compreensao. Leia PDFs e documentos densos com mais foco, ritmo mais calmo e mais controle.",
      keywords: [
        "velocidade de leitura",
        "ler mais rapido",
        "leitura rapida",
        "compreensao de leitura",
        "leitor de PDF",
        "ler PDF mais rapido",
      ],
    },
  },
  about: {
    en: {
      title: "About",
      description:
        "Learn what Leyendo is, why it exists, and how David Clerc is building a calmer reading speed tool for English and Spanish readers looking for fast reading and lectura rapida that still respects comprehension.",
      keywords: [
        "about Leyendo",
        "David Clerc",
        "reading speed tool",
        "fast reading",
        "lectura rapida",
        "leer mas rapido",
      ],
    },
    es: {
      title: "Sobre Leyendo",
      description:
        "Conoce que es Leyendo, por que existe y como David Clerc esta construyendo una herramienta de lectura rapida mas calmada para lectores que quieren velocidad sin perder comprension.",
      keywords: [
        "sobre Leyendo",
        "David Clerc",
        "lectura rapida",
        "leer mas rapido",
        "herramienta de lectura",
      ],
    },
    pt: {
      title: "Sobre o Leyendo",
      description:
        "Conheca o que e o Leyendo, por que ele existe e como David Clerc esta construindo uma ferramenta de leitura mais calma para quem quer velocidade sem perder compreensao.",
      keywords: [
        "sobre o Leyendo",
        "David Clerc",
        "velocidade de leitura",
        "ler mais rapido",
        "ferramenta de leitura",
      ],
    },
  },
  guides: {
    en: {
      title: "Guides",
      description:
        "Browse Leyendo guides for reading real documents with better pace, comprehension, and control.",
      keywords: [
        "reading speed guides",
        "fast reading guides",
        "read real documents faster",
        "reading comprehension guides",
        "document reading workflow",
      ],
    },
    es: {
      title: "Guias",
      description:
        "Explora las guias de Leyendo para leer documentos reales con mejor ritmo, comprension y control.",
      keywords: [
        "guias de lectura rapida",
        "leer mas rapido",
        "comprension lectora",
        "leer PDF mas rapido",
      ],
    },
    pt: {
      title: "Guias",
      description:
        "Explore os guias do Leyendo para ler documentos reais com melhor ritmo, compreensao e controle.",
      keywords: [
        "guias de leitura",
        "ler mais rapido",
        "velocidade de leitura",
        "ler PDF mais rapido",
      ],
    },
  },
  pricing: {
    en: {
      title: "Pricing",
      description:
        "Compare Leyendo Basic Reader, Focus, and Max plans, then choose MercadoPago, LemonSqueezy, or Binance depending on how you want to pay.",
      keywords: [
        "Leyendo pricing",
        "reading app pricing",
        "MercadoPago",
        "LemonSqueezy",
        "Binance Pay",
        "PDF reader subscription",
      ],
    },
    es: {
      title: "Precios",
      description:
        "Compara los planes Basic Reader, Focus y Max de Leyendo y elige MercadoPago, LemonSqueezy o Binance segun como quieras pagar.",
      keywords: [
        "precios Leyendo",
        "suscripcion lector PDF",
        "MercadoPago",
        "Binance Pay",
      ],
    },
    pt: {
      title: "Precos",
      description:
        "Compare os planos Basic Reader, Focus e Max do Leyendo e escolha MercadoPago, LemonSqueezy ou Binance conforme a forma de pagamento.",
      keywords: [
        "precos Leyendo",
        "assinatura leitor PDF",
        "MercadoPago",
        "Binance Pay",
      ],
    },
  },
  privacy: {
    en: {
      title: "Privacy",
      description:
        "See how Leyendo keeps reading local-first, avoids hidden guest uploads, and only syncs when you choose a cloud account.",
    },
    es: {
      title: "Privacidad",
      description:
        "Mira como Leyendo mantiene la lectura local-first, evita subidas ocultas y solo sincroniza cuando eliges una cuenta en la nube.",
    },
    pt: {
      title: "Privacidade",
      description:
        "Veja como o Leyendo mantem a leitura local-first, evita envios ocultos e so sincroniza quando voce escolhe uma conta na nuvem.",
    },
  },
};

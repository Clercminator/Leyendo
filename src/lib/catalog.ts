const catalogDocumentIdPrefix = "catalog:";
const catalogOwnerIdPrefix = "catalog:";

export type CatalogCategoryId =
  | "business"
  | "communication"
  | "mindset"
  | "money"
  | "society"
  | "technology"
  | "general";

export type CatalogDurationFilter = "all" | "short" | "medium" | "long";

interface CatalogCategoryDefinition {
  id: CatalogCategoryId;
  keywords: string[];
  labels: {
    en: string;
    es: string;
    pt: string;
  };
}

const pdfDriveSuffixPattern = /\s*\(\s*pdfdrive\s*\)\s*$/iu;

const catalogCategoryDefinitions: CatalogCategoryDefinition[] = [
  {
    id: "business",
    keywords: [
      "leader",
      "leadership",
      "management",
      "manager",
      "strategy",
      "business",
      "marketing",
      "startup",
      "company",
      "execution",
      "organization",
      "productivity",
    ],
    labels: {
      en: "Business",
      es: "Negocios",
      pt: "Negocios",
    },
  },
  {
    id: "communication",
    keywords: [
      "write",
      "writing",
      "writer",
      "story",
      "speaking",
      "conversation",
      "negotiation",
      "language",
      "communication",
      "rhetoric",
    ],
    labels: {
      en: "Communication",
      es: "Comunicacion",
      pt: "Comunicacao",
    },
  },
  {
    id: "mindset",
    keywords: [
      "mind",
      "thinking",
      "psychology",
      "habit",
      "behavior",
      "brain",
      "decision",
      "attention",
      "focus",
      "motivation",
      "mindset",
      "cognitive",
    ],
    labels: {
      en: "Mindset",
      es: "Mentalidad",
      pt: "Mentalidade",
    },
  },
  {
    id: "money",
    keywords: [
      "money",
      "finance",
      "financial",
      "invest",
      "investing",
      "economics",
      "market",
      "wealth",
      "capital",
      "portfolio",
      "trading",
    ],
    labels: {
      en: "Money",
      es: "Dinero",
      pt: "Dinheiro",
    },
  },
  {
    id: "society",
    keywords: [
      "history",
      "politics",
      "society",
      "culture",
      "civilization",
      "war",
      "government",
      "law",
      "education",
      "public",
    ],
    labels: {
      en: "Society",
      es: "Sociedad",
      pt: "Sociedade",
    },
  },
  {
    id: "technology",
    keywords: [
      "technology",
      "software",
      "computer",
      "digital",
      "internet",
      "ai",
      "artificial intelligence",
      "programming",
      "systems",
      "engineering",
      "data",
    ],
    labels: {
      en: "Technology",
      es: "Tecnologia",
      pt: "Tecnologia",
    },
  },
  {
    id: "general",
    keywords: [],
    labels: {
      en: "General",
      es: "General",
      pt: "Geral",
    },
  },
];

export const maxCatalogCacheDocuments = 2;

export function toCatalogDocumentId(catalogBookId: string) {
  return `${catalogDocumentIdPrefix}${catalogBookId}`;
}

export function isCatalogDocumentId(documentId: string | undefined) {
  return (
    typeof documentId === "string" &&
    documentId.startsWith(catalogDocumentIdPrefix)
  );
}

export function getCatalogBookIdFromDocumentId(documentId: string) {
  return isCatalogDocumentId(documentId)
    ? documentId.slice(catalogDocumentIdPrefix.length)
    : undefined;
}

export function toCatalogOwnerId(userId: string) {
  return `${catalogOwnerIdPrefix}${userId}`;
}

export function isCatalogOwnerId(ownerId: string | undefined) {
  return (
    typeof ownerId === "string" && ownerId.startsWith(catalogOwnerIdPrefix)
  );
}

export function sanitizeCatalogTitle(title: string) {
  const trimmedTitle = title.trim();
  const sanitizedTitle = trimmedTitle.replace(pdfDriveSuffixPattern, "").trim();

  return sanitizedTitle || trimmedTitle;
}

export function getCatalogSearchText(input: {
  author?: string;
  description?: string;
  excerpt?: string;
  title: string;
}) {
  return [
    sanitizeCatalogTitle(input.title),
    input.author ?? "",
    input.description ?? "",
    input.excerpt ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function getCatalogCategoryDefinitions() {
  return catalogCategoryDefinitions;
}

export function getCatalogCategoryId(input: {
  author?: string;
  description?: string;
  excerpt?: string;
  title: string;
}) {
  const searchText = getCatalogSearchText(input);

  for (const definition of catalogCategoryDefinitions) {
    if (
      definition.id !== "general" &&
      definition.keywords.some((keyword) => searchText.includes(keyword))
    ) {
      return definition.id;
    }
  }

  return "general";
}

export function matchesCatalogDurationFilter(
  minutes: number,
  filter: CatalogDurationFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "short") {
    return minutes <= 180;
  }

  if (filter === "medium") {
    return minutes > 180 && minutes <= 420;
  }

  return minutes > 420;
}

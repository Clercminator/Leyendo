const catalogDocumentIdPrefix = "catalog:";
const catalogOwnerIdPrefix = "catalog:";
const catalogTitleSourceSuffixPattern = /\s*[\[(]\s*pdfdrive\s*[\])]\s*$/i;

type CatalogSearchableBook = {
  author?: string;
  description?: string;
  excerpt: string;
  language?: string;
  sourceKind?: string;
  title: string;
};

export type CatalogCategoryKey =
  | "business"
  | "communication"
  | "finance"
  | "history"
  | "philosophy"
  | "productivity"
  | "psychology"
  | "technology"
  | "general";

export type CatalogReadingTimeBucket =
  | "self-paced"
  | "quick"
  | "standard"
  | "deep"
  | "marathon";

const catalogCategoryMatchers: Array<{
  category: CatalogCategoryKey;
  keywords: string[];
}> = [
  {
    category: "business",
    keywords: [
      "business",
      "company",
      "drucker",
      "execution",
      "leader",
      "leadership",
      "management",
      "marketing",
      "organization",
      "strategy",
    ],
  },
  {
    category: "psychology",
    keywords: [
      "behavior",
      "behaviour",
      "cognitive",
      "decision",
      "fast and slow",
      "habit",
      "kahneman",
      "mind",
      "psychology",
      "thinking",
    ],
  },
  {
    category: "productivity",
    keywords: [
      "attention",
      "deep work",
      "focus",
      "learning",
      "memory",
      "practice",
      "productivity",
      "research",
      "study",
      "workflow",
    ],
  },
  {
    category: "technology",
    keywords: [
      "ai",
      "computer",
      "data",
      "engineering",
      "programming",
      "software",
      "system",
      "technology",
    ],
  },
  {
    category: "finance",
    keywords: [
      "capital",
      "economics",
      "finance",
      "invest",
      "market",
      "money",
      "trading",
      "wealth",
    ],
  },
  {
    category: "history",
    keywords: [
      "ancient",
      "biography",
      "civilization",
      "history",
      "memoir",
      "war",
    ],
  },
  {
    category: "philosophy",
    keywords: [
      "culture",
      "ethics",
      "justice",
      "meaning",
      "philosophy",
      "politic",
      "society",
      "stoic",
    ],
  },
  {
    category: "communication",
    keywords: [
      "communication",
      "education",
      "essay",
      "grammar",
      "language",
      "writing",
    ],
  },
];

export const maxCatalogCacheDocuments = 2;

export function sanitizeCatalogTitle(title: string) {
  return title.replace(catalogTitleSourceSuffixPattern, "").trim();
}

export function getCatalogCategoryKey(book: CatalogSearchableBook) {
  const catalogText = [
    sanitizeCatalogTitle(book.title),
    book.author,
    book.description,
    book.excerpt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const matcher of catalogCategoryMatchers) {
    if (matcher.keywords.some((keyword) => catalogText.includes(keyword))) {
      return matcher.category;
    }
  }

  return "general";
}

export function getCatalogReadingTimeBucket(minutes: number) {
  if (minutes <= 0) {
    return "self-paced" satisfies CatalogReadingTimeBucket;
  }

  if (minutes <= 120) {
    return "quick" satisfies CatalogReadingTimeBucket;
  }

  if (minutes <= 360) {
    return "standard" satisfies CatalogReadingTimeBucket;
  }

  if (minutes <= 720) {
    return "deep" satisfies CatalogReadingTimeBucket;
  }

  return "marathon" satisfies CatalogReadingTimeBucket;
}

export function buildCatalogSearchText(book: CatalogSearchableBook) {
  return [
    sanitizeCatalogTitle(book.title),
    book.author,
    book.description,
    book.excerpt,
    book.language,
    book.sourceKind,
    getCatalogCategoryKey(book),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

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

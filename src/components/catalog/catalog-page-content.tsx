"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { BookMarked, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";

import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { useLocale } from "@/components/layout/locale-provider";
import {
  buildCatalogSearchText,
  getCatalogCategoryKey,
  getCatalogReadingTimeBucket,
  sanitizeCatalogTitle,
  toCatalogDocumentId,
  type CatalogCategoryKey,
  type CatalogReadingTimeBucket,
} from "@/lib/catalog";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listCatalogBooks, type CatalogBook } from "@/lib/supabase/catalog";
import { hasPlanAccess } from "@/lib/plans";

type CatalogReadingTimeFilter = "all" | CatalogReadingTimeBucket;

interface CatalogCopy {
  allCategories: string;
  allReadingTimes: string;
  categoryLabel: string;
  categoryLabels: Record<CatalogCategoryKey, string>;
  chunksLabel: (count: number) => string;
  empty: string;
  emptyTitle: string;
  filteredEmpty: string;
  filteredEmptyTitle: string;
  loadError: string;
  loading: string;
  lockedDetail: string;
  lockedTitle: string;
  openReader: string;
  readingTimeLabel: string;
  readingTimeOptions: Record<CatalogReadingTimeBucket, string>;
  resultsLabel: (count: number) => string;
  searchLabel: string;
  searchPlaceholder: string;
  sectionsLabel: (count: number) => string;
  signInDetail: string;
  signInTitle: string;
  viewPlans: string;
}

function formatReadingTime(minutes: number, locale: "en" | "es" | "pt") {
  if (minutes <= 0) {
    return locale === "en"
      ? "Self-paced"
      : locale === "es"
        ? "A tu ritmo"
        : "No seu ritmo";
  }

  return locale === "en"
    ? `${minutes} min read`
    : locale === "es"
      ? `${minutes} min de lectura`
      : `${minutes} min de leitura`;
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function CatalogPageContent() {
  const { locale } = useLocale();
  const { isConfigured, profile, user } = useSupabaseAuth();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    CatalogCategoryKey | "all"
  >("all");
  const [selectedReadingTime, setSelectedReadingTime] =
    useState<CatalogReadingTimeFilter>("all");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const canAccessCatalog = hasPlanAccess(profile, "max");

  const copy = useMemo<CatalogCopy>(() => {
    if (locale === "es") {
      return {
        allCategories: "Todas las categorias",
        allReadingTimes: "Todos los tiempos",
        categoryLabel: "Categoria",
        categoryLabels: {
          business: "Negocios",
          communication: "Comunicacion",
          finance: "Finanzas",
          general: "General",
          history: "Historia",
          philosophy: "Filosofia",
          productivity: "Productividad",
          psychology: "Psicologia",
          technology: "Tecnologia",
        },
        chunksLabel: (count) =>
          formatCountLabel(count, "fragmento", "fragmentos"),
        empty:
          "Todavia no hay libros publicados en este catalogo. La coleccion se ira curando segun validemos que cada PDF funciona bien en Leyendo.",
        emptyTitle: "Catalogo en curacion",
        filteredEmpty:
          "Prueba otra busqueda o cambia los filtros para encontrar otro libro del catalogo.",
        filteredEmptyTitle: "Sin resultados con estos filtros",
        loadError: "No se pudo cargar el catalogo.",
        loading: "Cargando catalogo privado...",
        lockedDetail:
          "Este catalogo separado solo se desbloquea con una suscripcion Max activa. Tus documentos personales siguen en tu biblioteca normal.",
        lockedTitle: "Max requerido",
        openReader: "Abrir en el lector",
        readingTimeLabel: "Tiempo de lectura",
        readingTimeOptions: {
          deep: "3 a 6 horas",
          marathon: "Mas de 6 horas",
          quick: "Hasta 2 horas",
          "self-paced": "A tu ritmo",
          standard: "2 a 3 horas",
        },
        resultsLabel: (count) =>
          `${count} ${count === 1 ? "libro visible" : "libros visibles"}`,
        searchLabel: "Buscar",
        searchPlaceholder: "Titulo, autor o tema",
        sectionsLabel: (count) =>
          formatCountLabel(count, "seccion", "secciones"),
        signInDetail:
          "Inicia sesion con una cuenta Max para navegar esta coleccion privada sin mezclarla con tu biblioteca personal.",
        signInTitle: "Inicia sesion para ver el catalogo",
        viewPlans: "Ver planes",
      };
    }

    if (locale === "pt") {
      return {
        allCategories: "Todas as categorias",
        allReadingTimes: "Todos os tempos",
        categoryLabel: "Categoria",
        categoryLabels: {
          business: "Negocios",
          communication: "Comunicacao",
          finance: "Financas",
          general: "Geral",
          history: "Historia",
          philosophy: "Filosofia",
          productivity: "Produtividade",
          psychology: "Psicologia",
          technology: "Tecnologia",
        },
        chunksLabel: (count) => formatCountLabel(count, "trecho", "trechos"),
        empty:
          "Ainda nao ha livros publicados neste catalogo. A colecao sera curada conforme validarmos que cada PDF funciona bem no Leyendo.",
        emptyTitle: "Catalogo em curadoria",
        filteredEmpty:
          "Tente outra busca ou ajuste os filtros para encontrar outro livro neste catalogo.",
        filteredEmptyTitle: "Nenhum resultado com estes filtros",
        loadError: "Nao foi possivel carregar o catalogo.",
        loading: "Carregando catalogo privado...",
        lockedDetail:
          "Este catalogo separado so desbloqueia com uma assinatura Max ativa. Seus documentos pessoais continuam na biblioteca normal.",
        lockedTitle: "Max necessario",
        openReader: "Abrir no leitor",
        readingTimeLabel: "Tempo de leitura",
        readingTimeOptions: {
          deep: "3 a 6 horas",
          marathon: "Mais de 6 horas",
          quick: "Ate 2 horas",
          "self-paced": "No seu ritmo",
          standard: "2 a 3 horas",
        },
        resultsLabel: (count) =>
          `${count} ${count === 1 ? "livro visivel" : "livros visiveis"}`,
        searchLabel: "Buscar",
        searchPlaceholder: "Titulo, autor ou tema",
        sectionsLabel: (count) => formatCountLabel(count, "secao", "secoes"),
        signInDetail:
          "Entre com uma conta Max para navegar esta colecao privada sem misturar com sua biblioteca pessoal.",
        signInTitle: "Entre para ver o catalogo",
        viewPlans: "Ver planos",
      };
    }

    return {
      allCategories: "All categories",
      allReadingTimes: "All reading times",
      categoryLabel: "Category",
      categoryLabels: {
        business: "Business",
        communication: "Communication",
        finance: "Finance",
        general: "General",
        history: "History",
        philosophy: "Philosophy",
        productivity: "Productivity",
        psychology: "Psychology",
        technology: "Technology",
      },
      chunksLabel: (count) => formatCountLabel(count, "chunk", "chunks"),
      empty:
        "No books are published in this catalog yet. The collection will grow as each PDF is validated to work well inside Leyendo.",
      emptyTitle: "Catalog in curation",
      filteredEmpty:
        "Try another search or adjust the filters to find a different book in this catalog.",
      filteredEmptyTitle: "No books match these filters",
      loadError: "Catalog could not be loaded.",
      loading: "Loading private catalog...",
      lockedDetail:
        "This separate catalog only unlocks with an active Max subscription. Your personal documents stay in the normal library.",
      lockedTitle: "Max required",
      openReader: "Open in reader",
      readingTimeLabel: "Reading time",
      readingTimeOptions: {
        deep: "3 to 6 hours",
        marathon: "More than 6 hours",
        quick: "Up to 2 hours",
        "self-paced": "Self-paced",
        standard: "2 to 3 hours",
      },
      resultsLabel: (count) =>
        `${count} ${count === 1 ? "book visible" : "books visible"}`,
      searchLabel: "Search",
      searchPlaceholder: "Title, author, or topic",
      sectionsLabel: (count) => formatCountLabel(count, "section", "sections"),
      signInDetail:
        "Sign in with a Max account to browse this private collection without mixing it into your personal library.",
      signInTitle: "Sign in to view the catalog",
      viewPlans: "View plans",
    };
  }, [locale]);

  useEffect(() => {
    if (!isConfigured || !user || !canAccessCatalog) {
      setBooks([]);
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(undefined);

    void listCatalogBooks(supabase)
      .then((catalogBooks) => {
        if (!cancelled) {
          setBooks(catalogBooks);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : copy.loadError,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canAccessCatalog, copy.loadError, isConfigured, user]);

  const catalogEntries = useMemo(
    () =>
      books.map((book) => ({
        ...book,
        categoryKey: getCatalogCategoryKey(book),
        readingTimeKey: getCatalogReadingTimeBucket(
          book.estimatedReadingMinutes,
        ),
        sanitizedTitle: sanitizeCatalogTitle(book.title),
        searchText: buildCatalogSearchText(book),
      })),
    [books],
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(catalogEntries.map((entry) => entry.categoryKey)),
      ).sort((left, right) =>
        copy.categoryLabels[left].localeCompare(copy.categoryLabels[right]),
      ),
    [catalogEntries, copy.categoryLabels],
  );

  const filteredBooks = useMemo(() => {
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase();

    return catalogEntries.filter((book) => {
      if (selectedCategory !== "all" && book.categoryKey !== selectedCategory) {
        return false;
      }

      if (
        selectedReadingTime !== "all" &&
        book.readingTimeKey !== selectedReadingTime
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return book.searchText.includes(normalizedSearch);
    });
  }, [
    catalogEntries,
    deferredSearchQuery,
    selectedCategory,
    selectedReadingTime,
  ]);

  if (!user) {
    return (
      <section className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-(--border-soft) bg-(--surface-soft) p-3 text-(--accent-amber)">
            <BookMarked className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h2 className="font-heading text-3xl font-semibold text-(--text-strong)">
              {copy.signInTitle}
            </h2>
            <p className="max-w-3xl text-base leading-8 text-(--text-muted)">
              {copy.signInDetail}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!canAccessCatalog) {
    return (
      <section className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-(--border-soft) bg-(--surface-soft) p-3 text-(--accent-amber)">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-3xl font-semibold text-(--text-strong)">
                {copy.lockedTitle}
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-8 text-(--text-muted)">
                {copy.lockedDetail}
              </p>
            </div>
            <Link
              href={getLocalizedPublicPath("/pricing", locale)}
              className="inline-flex h-11 items-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              {copy.viewPlans}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {isLoading ? (
        <div className="editorial-panel flex items-center gap-3 rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 text-(--text-muted) shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span>{copy.loading}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="rounded-[1.35rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm leading-7 text-(--text-strong)">
          {errorMessage}
        </p>
      ) : null}

      {!isLoading && books.length === 0 ? (
        <div className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
          <p className="editorial-kicker text-(--accent-amber)">
            {copy.emptyTitle}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-(--text-muted)">
            {copy.empty}
          </p>
        </div>
      ) : null}

      {!isLoading && books.length > 0 ? (
        <div className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-5 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl sm:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="space-y-2 text-sm text-(--text-muted)">
              <span className="font-medium text-(--text-strong)">
                {copy.searchLabel}
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
                placeholder={copy.searchPlaceholder}
                className="h-12 w-full rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-4 text-sm text-(--text-strong) transition outline-none placeholder:text-(--text-muted) focus:border-(--border-strong) focus:bg-(--surface-chip)"
              />
            </label>

            <label className="space-y-2 text-sm text-(--text-muted)">
              <span className="font-medium text-(--text-strong)">
                {copy.categoryLabel}
              </span>
              <select
                value={selectedCategory}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedCategory(
                    value === "all" ? "all" : (value as CatalogCategoryKey),
                  );
                }}
                className="h-12 w-full rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-4 text-sm text-(--text-strong) transition outline-none focus:border-(--border-strong) focus:bg-(--surface-chip)"
              >
                <option value="all">{copy.allCategories}</option>
                {categoryOptions.map((categoryKey) => (
                  <option key={categoryKey} value={categoryKey}>
                    {copy.categoryLabels[categoryKey]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-(--text-muted)">
              <span className="font-medium text-(--text-strong)">
                {copy.readingTimeLabel}
              </span>
              <select
                value={selectedReadingTime}
                onChange={(event) => {
                  const value = event.target.value as CatalogReadingTimeFilter;
                  setSelectedReadingTime(value);
                }}
                className="h-12 w-full rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-4 text-sm text-(--text-strong) transition outline-none focus:border-(--border-strong) focus:bg-(--surface-chip)"
              >
                <option value="all">{copy.allReadingTimes}</option>
                {(
                  [
                    "self-paced",
                    "quick",
                    "standard",
                    "deep",
                    "marathon",
                  ] as const
                ).map((option) => (
                  <option key={option} value={option}>
                    {copy.readingTimeOptions[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-4 text-sm text-(--text-muted)">
            {copy.resultsLabel(filteredBooks.length)}
          </p>
        </div>
      ) : null}

      {!isLoading && books.length > 0 && filteredBooks.length === 0 ? (
        <div className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
          <p className="editorial-kicker text-(--accent-amber)">
            {copy.filteredEmptyTitle}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-(--text-muted)">
            {copy.filteredEmpty}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredBooks.map((book) => (
          <article
            key={book.id}
            className="editorial-panel flex h-full flex-col rounded-[1.7rem] border border-(--border-soft) bg-(--surface-card) p-5 shadow-[0_18px_50px_rgba(20,26,56,0.1)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="editorial-kicker text-(--accent-amber)">
                    {book.language ?? "PDF"}
                  </span>
                  <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.12em] text-(--text-muted) uppercase">
                    {copy.categoryLabels[book.categoryKey]}
                  </span>
                </div>
                <h2 className="font-heading mt-3 text-[1.9rem] leading-[1.08] font-semibold text-(--text-strong)">
                  {book.sanitizedTitle}
                </h2>
                {book.author ? (
                  <p className="mt-2 text-sm text-(--text-muted)">
                    {book.author}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs font-medium text-(--text-muted)">
                {formatReadingTime(book.estimatedReadingMinutes, locale)}
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {book.description ?? book.excerpt}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-[0.7rem] tracking-[0.16em] text-(--text-muted) uppercase">
              <span>{book.sourceKind.toUpperCase()}</span>
              <span>{copy.sectionsLabel(book.totalSections)}</span>
              <span>{copy.chunksLabel(book.totalChunks)}</span>
            </div>

            <Link
              href={`/reader?document=${encodeURIComponent(toCatalogDocumentId(book.id))}`}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-2.5 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
            >
              <Sparkles className="h-4 w-4" />
              {copy.openReader}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

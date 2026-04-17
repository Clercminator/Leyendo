"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { BookMarked, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";

import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { useLocale } from "@/components/layout/locale-provider";
import {
  getCatalogCategoryDefinitions,
  getCatalogCategoryId,
  getCatalogSearchText,
  matchesCatalogDurationFilter,
  sanitizeCatalogTitle,
  toCatalogDocumentId,
  type CatalogCategoryId,
  type CatalogDurationFilter,
} from "@/lib/catalog";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listCatalogBooks, type CatalogBook } from "@/lib/supabase/catalog";
import { hasPlanAccess } from "@/lib/plans";

type CatalogCategoryFilter = "all" | CatalogCategoryId;

interface Copy {
  allDurations: string;
  allTopics: string;
  chunksLabel: string;
  empty: string;
  emptyFilters: string;
  emptyFiltersTitle: string;
  emptyTitle: string;
  filtersSummary: string;
  loading: string;
  lockedDetail: string;
  lockedTitle: string;
  openReader: string;
  searchLabel: string;
  searchPlaceholder: string;
  sectionsLabel: string;
  signInDetail: string;
  signInTitle: string;
  timeLong: string;
  timeMedium: string;
  timeShort: string;
  timeToReadLabel: string;
  viewPlans: string;
}

interface DisplayCatalogBook extends CatalogBook {
  categoryId: CatalogCategoryId;
  displayTitle: string;
  searchText: string;
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

function getCatalogPreviewText(book: CatalogBook) {
  const sourceText = (book.description ?? book.excerpt).trim();

  if (sourceText.length <= 220) {
    return sourceText;
  }

  return `${sourceText.slice(0, 217).trimEnd()}...`;
}

export function CatalogPageContent() {
  const { locale } = useLocale();
  const { isConfigured, profile, user } = useSupabaseAuth();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CatalogCategoryFilter>("all");
  const [durationFilter, setDurationFilter] =
    useState<CatalogDurationFilter>("all");
  const deferredSearchQuery = useDeferredValue(
    searchQuery.trim().toLocaleLowerCase(),
  );

  const canAccessCatalog = hasPlanAccess(profile, "max");

  const copy = useMemo<Copy>(() => {
    if (locale === "es") {
      return {
        allDurations: "Todos los tiempos",
        allTopics: "Todos los temas",
        chunksLabel: "bloques",
        empty:
          "Todavia no hay libros publicados en este catalogo. La coleccion se ira curando segun validemos que cada PDF funciona bien en Leyendo.",
        emptyFilters:
          "Prueba otro tema, otro rango de lectura o una busqueda mas amplia para encontrar un libro distinto.",
        emptyFiltersTitle: "Ningun libro coincide con estos filtros",
        emptyTitle: "Catalogo en curacion",
        filtersSummary: "libros visibles",
        loading: "Cargando catalogo privado...",
        lockedDetail:
          "Este catalogo separado solo se desbloquea con una suscripcion Max activa. Tus documentos personales siguen en tu biblioteca normal.",
        lockedTitle: "Max requerido",
        openReader: "Abrir en el lector",
        searchLabel: "Buscar en el catalogo",
        searchPlaceholder: "Titulo, autor, tema o palabra clave",
        sectionsLabel: "secciones",
        signInDetail:
          "Inicia sesion con una cuenta Max para navegar esta coleccion privada sin mezclarla con tu biblioteca personal.",
        signInTitle: "Inicia sesion para ver el catalogo",
        timeLong: "Lectura larga",
        timeMedium: "Lectura media",
        timeShort: "Lectura corta",
        timeToReadLabel: "Tiempo de lectura",
        viewPlans: "Ver planes",
      };
    }

    if (locale === "pt") {
      return {
        allDurations: "Todos os tempos",
        allTopics: "Todos os temas",
        chunksLabel: "blocos",
        empty:
          "Ainda nao ha livros publicados neste catalogo. A colecao sera curada conforme validarmos que cada PDF funciona bem no Leyendo.",
        emptyFilters:
          "Tente outro tema, outra faixa de leitura ou uma busca mais ampla para encontrar outro livro.",
        emptyFiltersTitle: "Nenhum livro combina com estes filtros",
        emptyTitle: "Catalogo em curadoria",
        filtersSummary: "livros visiveis",
        loading: "Carregando catalogo privado...",
        lockedDetail:
          "Este catalogo separado so desbloqueia com uma assinatura Max ativa. Seus documentos pessoais continuam na biblioteca normal.",
        lockedTitle: "Max necessario",
        openReader: "Abrir no leitor",
        searchLabel: "Buscar no catalogo",
        searchPlaceholder: "Titulo, autor, tema ou palavra-chave",
        sectionsLabel: "secoes",
        signInDetail:
          "Entre com uma conta Max para navegar esta colecao privada sem misturar com sua biblioteca pessoal.",
        signInTitle: "Entre para ver o catalogo",
        timeLong: "Leitura longa",
        timeMedium: "Leitura media",
        timeShort: "Leitura curta",
        timeToReadLabel: "Tempo de leitura",
        viewPlans: "Ver planos",
      };
    }

    return {
      allDurations: "All reading times",
      allTopics: "All topics",
      chunksLabel: "chunks",
      empty:
        "No books are published in this catalog yet. The collection will grow as each PDF is validated to work well inside Leyendo.",
      emptyFilters:
        "Try another topic, a different reading-time range, or a broader search to surface more books.",
      emptyFiltersTitle: "No books match these filters",
      emptyTitle: "Catalog in curation",
      filtersSummary: "books visible",
      loading: "Loading private catalog...",
      lockedDetail:
        "This separate catalog only unlocks with an active Max subscription. Your personal documents stay in the normal library.",
      lockedTitle: "Max required",
      openReader: "Open in reader",
      searchLabel: "Search the catalog",
      searchPlaceholder: "Title, author, topic, or keyword",
      sectionsLabel: "sections",
      signInDetail:
        "Sign in with a Max account to browse this private collection without mixing it into your personal library.",
      signInTitle: "Sign in to view the catalog",
      timeLong: "Long read",
      timeMedium: "Medium read",
      timeShort: "Short read",
      timeToReadLabel: "Reading time",
      viewPlans: "View plans",
    };
  }, [locale]);

  const categoryOptions = useMemo(
    () => [
      {
        id: "all" as const,
        label: copy.allTopics,
      },
      ...getCatalogCategoryDefinitions().map((definition) => ({
        id: definition.id,
        label: definition.labels[locale],
      })),
    ],
    [copy.allTopics, locale],
  );

  const categoryLabels = useMemo(
    () =>
      Object.fromEntries(
        getCatalogCategoryDefinitions().map((definition) => [
          definition.id,
          definition.labels[locale],
        ]),
      ) as Record<CatalogCategoryId, string>,
    [locale],
  );

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
            error instanceof Error
              ? error.message
              : "Catalog could not be loaded.",
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
  }, [canAccessCatalog, isConfigured, user]);

  const displayBooks = useMemo<DisplayCatalogBook[]>(
    () =>
      books.map((book) => ({
        ...book,
        categoryId: getCatalogCategoryId(book),
        displayTitle: sanitizeCatalogTitle(book.title),
        searchText: getCatalogSearchText(book),
      })),
    [books],
  );

  const filteredBooks = useMemo(
    () =>
      displayBooks.filter((book) => {
        if (
          selectedCategory !== "all" &&
          book.categoryId !== selectedCategory
        ) {
          return false;
        }

        if (
          !matchesCatalogDurationFilter(
            book.estimatedReadingMinutes,
            durationFilter,
          )
        ) {
          return false;
        }

        return (
          !deferredSearchQuery || book.searchText.includes(deferredSearchQuery)
        );
      }),
    [deferredSearchQuery, displayBooks, durationFilter, selectedCategory],
  );

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

      {books.length > 0 ? (
        <div className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-5 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl sm:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_16rem]">
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-medium tracking-[0.18em] text-(--text-muted) uppercase">
                {copy.searchLabel}
              </span>
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
                placeholder={copy.searchPlaceholder}
                className="h-12 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-4 text-sm text-(--text-strong) transition outline-none placeholder:text-(--text-muted) focus:border-(--border-strong) focus:bg-(--surface-chip)"
                type="search"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium tracking-[0.18em] text-(--text-muted) uppercase">
                {copy.timeToReadLabel}
              </span>
              <select
                value={durationFilter}
                onChange={(event) => {
                  setDurationFilter(
                    event.target.value as CatalogDurationFilter,
                  );
                }}
                className="h-12 rounded-[1rem] border border-(--border-soft) bg-(--surface-soft) px-4 text-sm text-(--text-strong) transition outline-none focus:border-(--border-strong) focus:bg-(--surface-chip)"
              >
                <option value="all">{copy.allDurations}</option>
                <option value="short">{copy.timeShort}</option>
                <option value="medium">{copy.timeMedium}</option>
                <option value="long">{copy.timeLong}</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categoryOptions.map((option) => {
              const isActive = selectedCategory === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(option.id);
                  }}
                  className={[
                    "inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm transition",
                    isActive
                      ? "border-(--border-strong) bg-(--surface-strong) text-(--text-strong)"
                      : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-(--text-muted)">
            {filteredBooks.length} {copy.filtersSummary}
          </p>
        </div>
      ) : null}

      {books.length > 0 && filteredBooks.length === 0 ? (
        <div className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
          <p className="editorial-kicker text-(--accent-amber)">
            {copy.emptyFiltersTitle}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-(--text-muted)">
            {copy.emptyFilters}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredBooks.map((book) => (
          <article
            key={book.id}
            className="editorial-panel flex flex-col rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-5 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <p className="editorial-kicker text-(--accent-amber)">
                    {book.language ?? "PDF"}
                  </p>
                  <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.14em] text-(--text-muted) uppercase">
                    {categoryLabels[book.categoryId]}
                  </span>
                </div>
                <h2 className="font-heading mt-4 text-2xl leading-tight font-semibold text-(--text-strong)">
                  {book.displayTitle}
                </h2>
                {book.author ? (
                  <p className="mt-3 text-sm text-(--text-muted)">
                    {book.author}
                  </p>
                ) : null}
              </div>
              <div className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-xs font-medium text-(--text-muted)">
                {formatReadingTime(book.estimatedReadingMinutes, locale)}
              </div>
            </div>

            <p className="mt-5 grow text-sm leading-7 text-(--text-muted)">
              {getCatalogPreviewText(book)}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs tracking-[0.16em] text-(--text-muted) uppercase">
              <span>{book.sourceKind.toUpperCase()}</span>
              <span>
                {book.totalSections} {copy.sectionsLabel}
              </span>
              <span>
                {book.totalChunks} {copy.chunksLabel}
              </span>
            </div>

            <Link
              href={`/reader?document=${encodeURIComponent(toCatalogDocumentId(book.id))}`}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-2.5 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
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

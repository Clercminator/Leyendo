"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookMarked, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";

import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { useLocale } from "@/components/layout/locale-provider";
import { toCatalogDocumentId } from "@/lib/catalog";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listCatalogBooks, type CatalogBook } from "@/lib/supabase/catalog";
import { hasPlanAccess } from "@/lib/plans";

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

export function CatalogPageContent() {
  const { locale } = useLocale();
  const { isConfigured, profile, user } = useSupabaseAuth();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const canAccessCatalog = hasPlanAccess(profile, "max");

  const copy = useMemo(() => {
    if (locale === "es") {
      return {
        empty:
          "Todavia no hay libros publicados en este catalogo. La coleccion se ira curando segun validemos que cada PDF funciona bien en Leyendo.",
        emptyTitle: "Catalogo en curacion",
        loading: "Cargando catalogo privado...",
        lockedDetail:
          "Este catalogo separado solo se desbloquea con una suscripcion Max activa. Tus documentos personales siguen en tu biblioteca normal.",
        lockedTitle: "Max requerido",
        openReader: "Abrir en el lector",
        signInDetail:
          "Inicia sesion con una cuenta Max para navegar esta coleccion privada sin mezclarla con tu biblioteca personal.",
        signInTitle: "Inicia sesion para ver el catalogo",
        viewPlans: "Ver planes",
      };
    }

    if (locale === "pt") {
      return {
        empty:
          "Ainda nao ha livros publicados neste catalogo. A colecao sera curada conforme validarmos que cada PDF funciona bem no Leyendo.",
        emptyTitle: "Catalogo em curadoria",
        loading: "Carregando catalogo privado...",
        lockedDetail:
          "Este catalogo separado so desbloqueia com uma assinatura Max ativa. Seus documentos pessoais continuam na biblioteca normal.",
        lockedTitle: "Max necessario",
        openReader: "Abrir no leitor",
        signInDetail:
          "Entre com uma conta Max para navegar esta colecao privada sem misturar com sua biblioteca pessoal.",
        signInTitle: "Entre para ver o catalogo",
        viewPlans: "Ver planos",
      };
    }

    return {
      empty:
        "No books are published in this catalog yet. The collection will grow as each PDF is validated to work well inside Leyendo.",
      emptyTitle: "Catalog in curation",
      loading: "Loading private catalog...",
      lockedDetail:
        "This separate catalog only unlocks with an active Max subscription. Your personal documents stay in the normal library.",
      lockedTitle: "Max required",
      openReader: "Open in reader",
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

      <div className="grid gap-6 lg:grid-cols-2">
        {books.map((book) => (
          <article
            key={book.id}
            className="editorial-panel rounded-[2rem] border border-(--border-soft) bg-(--surface-card) p-7 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="editorial-kicker text-(--accent-amber)">
                  {book.language ?? "PDF"}
                </p>
                <h2 className="font-heading mt-4 text-3xl font-semibold text-(--text-strong)">
                  {book.title}
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

            <p className="mt-5 text-sm leading-8 text-(--text-muted)">
              {book.description ?? book.excerpt}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs tracking-[0.16em] text-(--text-muted) uppercase">
              <span>{book.sourceKind.toUpperCase()}</span>
              <span>{book.totalSections} sections</span>
              <span>{book.totalChunks} chunks</span>
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

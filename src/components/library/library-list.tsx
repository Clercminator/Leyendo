"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { BookMarked, BookOpenText } from "lucide-react";

import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { useLocale } from "@/components/layout/locale-provider";
import {
  clearSessionForDocument,
  deleteDocumentAndRelatedData,
  getRecentBookmarks,
  getRecentDocuments,
  getRecentHighlights,
  getRecentSessions,
  type RecentBookmarkRecord,
  type RecentHighlightRecord,
  type RecentSessionRecord,
} from "@/db/repositories";
import { ResumeCard } from "@/components/reader/resume-card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteCloudDocumentBundle,
  deleteCloudSession,
} from "@/lib/supabase/library-sync";
import type { DocumentRecord } from "@/types/document";

interface LibraryData {
  documents: DocumentRecord[];
  bookmarks: RecentBookmarkRecord[];
  highlights: RecentHighlightRecord[];
  sessions: RecentSessionRecord[];
}

async function loadLibraryData(): Promise<LibraryData> {
  const [documents, bookmarks, highlights, sessions] = await Promise.all([
    getRecentDocuments(),
    getRecentBookmarks(),
    getRecentHighlights(),
    getRecentSessions(),
  ]);

  return {
    documents,
    bookmarks,
    highlights,
    sessions,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong while updating your local library.";
}

function formatProgressLabel(session: RecentSessionRecord["session"]) {
  const progress = Math.max(
    0,
    Math.min(100, Math.round(session.percentComplete)),
  );
  const paragraphLabel = `Paragraph ${session.currentParagraphIndex + 1}`;

  if (progress <= 0) {
    return `${paragraphLabel} · Just started`;
  }

  if (progress >= 100) {
    return `${paragraphLabel} · Completed`;
  }

  return `${paragraphLabel} · ${progress}% complete`;
}

function formatBookmarkLocation(
  bookmark: RecentBookmarkRecord["bookmark"],
  locale: "en" | "es" | "pt",
) {
  if (typeof bookmark.sourcePageIndex === "number") {
    if (locale === "es") {
      return `Guardado en la pagina ${bookmark.sourcePageIndex + 1}`;
    }

    if (locale === "pt") {
      return `Salvo na pagina ${bookmark.sourcePageIndex + 1}`;
    }

    return `Saved on page ${bookmark.sourcePageIndex + 1}`;
  }

  if (locale === "es") {
    return `Guardado en el parrafo ${bookmark.paragraphIndex + 1}`;
  }

  if (locale === "pt") {
    return `Salvo no paragrafo ${bookmark.paragraphIndex + 1}`;
  }

  return `Saved at paragraph ${bookmark.paragraphIndex + 1}`;
}

export function LibraryList() {
  const { locale } = useLocale();
  const { user } = useSupabaseAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<RecentBookmarkRecord[]>([]);
  const [highlights, setHighlights] = useState<RecentHighlightRecord[]>([]);
  const [sessions, setSessions] = useState<RecentSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingActionKey, setPendingActionKey] = useState<string>();
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string>();
  const overviewItems = [
    {
      label:
        locale === "en"
          ? "Documents"
          : locale === "es"
            ? "Documentos"
            : "Documentos",
      value: documents.length,
      note:
        locale === "en"
          ? "Imported files and pasted text ready to reopen."
          : locale === "es"
            ? "Archivos importados y texto pegado listos para reabrir."
            : "Arquivos importados e texto colado prontos para reabrir.",
    },
    {
      label:
        locale === "en"
          ? "Resume points"
          : locale === "es"
            ? "Puntos de retorno"
            : "Pontos de retorno",
      value: sessions.length,
      note:
        locale === "en"
          ? "Saved progress you can jump back into immediately."
          : locale === "es"
            ? "Progreso guardado al que puedes volver enseguida."
            : "Progresso salvo para retomar imediatamente.",
    },
    {
      label:
        locale === "en" ? "Anchors" : locale === "es" ? "Anclas" : "Ancoras",
      value: bookmarks.length + highlights.length,
      note:
        locale === "en"
          ? "Bookmarks and highlights tied to exact passages."
          : locale === "es"
            ? "Marcadores y destacados unidos a pasajes concretos."
            : "Marcadores e destaques ligados a trechos exatos.",
    },
  ];

  const applyLibraryData = useCallback((data: LibraryData) => {
    setDocuments(data.documents);
    setBookmarks(data.bookmarks);
    setHighlights(data.highlights);
    setSessions(data.sessions);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const data = await loadLibraryData();

      if (cancelled) {
        return;
      }

      applyLibraryData(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyLibraryData]);

  const handleClearProgress = useCallback(
    async (document: DocumentRecord) => {
      const actionKey = `clear:${document.id}`;

      setPendingActionKey(actionKey);
      setStatusMessage("");
      setError(undefined);

      try {
        if (user?.id && document.ownerId === user.id) {
          const supabase = getSupabaseBrowserClient();

          if (supabase) {
            await deleteCloudSession(supabase, user.id, document.id);
          }
        }

        await clearSessionForDocument(document.id);
        applyLibraryData(await loadLibraryData());
        setStatusMessage(`Cleared reading progress for ${document.title}.`);
      } catch (cleanupError) {
        setError(getErrorMessage(cleanupError));
      } finally {
        setPendingActionKey(undefined);
      }
    },
    [applyLibraryData, user?.id],
  );

  const handleRemoveDocument = useCallback(
    async (document: DocumentRecord) => {
      const actionKey = `remove:${document.id}`;

      setPendingActionKey(actionKey);
      setStatusMessage("");
      setError(undefined);

      try {
        if (user?.id && document.ownerId === user.id) {
          const supabase = getSupabaseBrowserClient();

          if (supabase) {
            await deleteCloudDocumentBundle(supabase, user.id, document.id);
          }
        }

        await deleteDocumentAndRelatedData(document.id);
        applyLibraryData(await loadLibraryData());
        setStatusMessage(
          `Removed ${document.title} and its local reading data.`,
        );
      } catch (cleanupError) {
        setError(getErrorMessage(cleanupError));
      } finally {
        setPendingActionKey(undefined);
      }
    },
    [applyLibraryData, user?.id],
  );

  if (isLoading) {
    return (
      <section className="editorial-panel fade-rise rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
        <p className="editorial-kicker text-(--accent-sky)">
          {locale === "en"
            ? "Loading library"
            : locale === "es"
              ? "Cargando biblioteca"
              : "Carregando biblioteca"}
        </p>
        <h2 className="font-heading mt-4 text-4xl leading-tight font-semibold text-(--text-strong)">
          {locale === "en"
            ? "Bringing your saved reading history back into view."
            : locale === "es"
              ? "Devolviendo tu historial de lectura guardado a la vista."
              : "Trazendo seu historico de leitura salvo de volta para a tela."}
        </h2>
      </section>
    );
  }

  if (
    sessions.length === 0 &&
    documents.length === 0 &&
    bookmarks.length === 0 &&
    highlights.length === 0
  ) {
    return (
      <section className="editorial-panel fade-rise rounded-[1.75rem] border border-dashed border-(--border-soft) bg-(--surface-card) p-8 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl">
        <p className="editorial-kicker text-(--accent-sky)">
          {locale === "en"
            ? "Library empty"
            : locale === "es"
              ? "Biblioteca vacia"
              : "Biblioteca vazia"}
        </p>
        <h2 className="font-heading mt-4 text-4xl leading-tight font-semibold text-(--text-strong)">
          {locale === "en"
            ? "Import your first document and this space becomes your return point."
            : locale === "es"
              ? "Importa tu primer documento y este espacio se convierte en tu punto de regreso."
              : "Importe seu primeiro documento e este espaco vira seu ponto de retorno."}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-(--text-muted)">
          {locale === "en"
            ? "Import a PDF, DOCX, RTF, Markdown file, or pasted text from the home page and it will appear here with progress, bookmarks, and highlights."
            : locale === "es"
              ? "Importa un PDF, DOCX, RTF, Markdown o texto pegado desde la pagina principal y aparecera aqui con progreso, marcadores y destacados."
              : "Importe um PDF, DOCX, RTF, Markdown ou texto colado pela pagina inicial e ele aparecera aqui com progresso, marcadores e destaques."}
        </p>
        <Link
          href="/#upload-panel"
          className="mt-6 inline-flex min-h-14 items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
        >
          {locale === "en"
            ? "Import a document"
            : locale === "es"
              ? "Importar documento"
              : "Importar documento"}
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>

      <div className="fade-rise-delayed grid gap-4 lg:grid-cols-3">
        {overviewItems.map((item) => (
          <article
            key={item.label}
            className="editorial-panel hover-lift rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-5 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl"
          >
            <p className="editorial-kicker text-(--accent-sky)">{item.label}</p>
            <h2 className="font-heading mt-4 text-4xl leading-none font-semibold text-(--text-strong)">
              {item.value}
            </h2>
            <p className="mt-3 text-sm leading-7 text-(--text-muted)">
              {item.note}
            </p>
          </article>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-[1.5rem] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </p>
      ) : null}

      {sessions.length > 0 ? (
        <div>
          <h2 className="font-heading text-3xl font-semibold text-(--text-strong)">
            Resume where you left off
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {sessions.map(({ session, document }) => (
              <ResumeCard
                key={session.id}
                href={`/reader?document=${document.id}`}
                title={document.title}
                excerpt={document.excerpt}
                progressLabel={formatProgressLabel(session)}
                secondaryActionText="Clear progress"
                secondaryActionAriaLabel={`Clear progress for ${document.title}`}
                secondaryActionDisabled={
                  pendingActionKey === `clear:${document.id}`
                }
                onSecondaryAction={() => {
                  void handleClearProgress(document);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {highlights.length > 0 ? (
        <div>
          <h2 className="font-heading text-3xl font-semibold text-(--text-strong)">
            Recent highlights
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {highlights.map(({ highlight, document }) => (
              <article
                key={highlight.id}
                className="editorial-panel hover-lift rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-sm text-(--accent-amber)">
                  <BookMarked className="h-4 w-4" />
                  {document.title}
                </div>
                <h3 className="font-heading mt-4 text-3xl leading-tight font-semibold text-(--text-strong)">
                  {highlight.label}
                </h3>
                <p className="mt-3 text-sm leading-7 text-(--text-strong)">
                  {highlight.quote}
                </p>
                <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                  {highlight.note ?? document.excerpt}
                </p>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)">
                    Paragraph {highlight.paragraphIndex + 1}
                  </span>
                  <Link
                    href={`/reader?document=${document.id}&highlight=${highlight.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    Open highlight
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {bookmarks.length > 0 ? (
        <div>
          <h2 className="font-heading text-3xl font-semibold text-(--text-strong)">
            Recent bookmarks
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {bookmarks.map(({ bookmark, document }) => (
              <article
                key={bookmark.id}
                className="editorial-panel hover-lift rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-sm text-(--accent-amber)">
                  <BookMarked className="h-4 w-4" />
                  {document.title}
                </div>
                <h3 className="font-heading mt-4 text-3xl leading-tight font-semibold text-(--text-strong)">
                  {bookmark.label}
                </h3>
                <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                  {formatBookmarkLocation(bookmark, locale)}
                </p>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)">
                    Paragraph {bookmark.paragraphIndex + 1}
                  </span>
                  <Link
                    href={`/reader?document=${document.id}&bookmark=${bookmark.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                  >
                    Open bookmark
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div>
          <h2 className="font-heading text-3xl font-semibold text-(--text-strong)">
            Recent documents
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {documents.map((document) => (
              <article
                key={document.id}
                className="editorial-panel hover-lift rounded-[1.75rem] border border-(--border-soft) bg-(--surface-card) p-6 shadow-[0_18px_60px_rgba(20,26,56,0.1)] backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-sm text-(--accent-sky)">
                  <BookOpenText className="h-4 w-4" />
                  {document.sourceKind}
                </div>
                <h3 className="font-heading mt-4 text-3xl leading-tight font-semibold text-(--text-strong)">
                  {document.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                  {document.excerpt}
                </p>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <span className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-3 py-2 text-sm text-(--text-strong)">
                    {document.totalChunks} chunks
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Remove ${document.title} from this device`}
                      disabled={pendingActionKey === `remove:${document.id}`}
                      onClick={() => {
                        void handleRemoveDocument(document);
                      }}
                      className="rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip) disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove document
                    </button>
                    <Link
                      href={`/reader?document=${document.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-(--surface-soft) px-4 py-2 text-sm text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

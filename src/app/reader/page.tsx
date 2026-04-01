import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ReaderWorkspace } from "@/components/reader/reader-workspace";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Reader",
  description:
    "The private Leyendo reading workspace for imported documents and saved reading sessions.",
  path: "/reader",
  index: false,
});

interface ReaderPageProps {
  searchParams?: Promise<{
    document?: string;
    bookmark?: string;
    highlight?: string;
  }>;
}

export default async function ReaderPage({ searchParams }: ReaderPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <AppShell mainClassName="max-w-[90rem] px-4 pt-3 pb-8 sm:px-6 sm:pt-4 lg:px-8">
      <ReaderWorkspace
        documentId={resolvedSearchParams.document}
        bookmarkId={resolvedSearchParams.bookmark}
        highlightId={resolvedSearchParams.highlight}
      />
    </AppShell>
  );
}

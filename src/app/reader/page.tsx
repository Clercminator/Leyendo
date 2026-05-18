import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ReaderWorkspace } from "@/components/reader/workspace/reader-workspace";
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
    <AppShell mainClassName="max-w-none px-2 pt-2 pb-4 sm:px-4 sm:pt-3 sm:pb-6 lg:max-w-[90rem] lg:px-8 lg:pb-8">
      <ReaderWorkspace
        documentId={resolvedSearchParams.document}
        bookmarkId={resolvedSearchParams.bookmark}
        highlightId={resolvedSearchParams.highlight}
      />
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/app-shell";
import { ReaderWorkspace } from "@/components/reader/reader-workspace";

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

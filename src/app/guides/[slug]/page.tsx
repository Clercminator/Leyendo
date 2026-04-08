import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { LocaleProvider } from "@/components/layout/locale-provider";
import {
  createGuidePageMetadata,
  GuideArticlePage,
} from "@/components/guides/guide-article-page";
import { getGuideBySlug, guides } from "@/lib/guides";
import { getLocalizedPublicPath } from "@/lib/public-paths";

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  return createGuidePageMetadata({
    guide,
    path:
      guide.language === "en"
        ? `/guides/${guide.slug}`
        : getLocalizedPublicPath(`/guides/${guide.slug}`, guide.language),
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  if (guide.language !== "en") {
    permanentRedirect(getLocalizedPublicPath(`/guides/${guide.slug}`, guide.language));
  }

  return (
    <LocaleProvider initialLocale="en">
      <GuideArticlePage guide={guide} />
    </LocaleProvider>
  );
}

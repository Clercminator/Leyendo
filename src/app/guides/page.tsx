import type { Metadata } from "next";

import { LocaleProvider } from "@/components/layout/locale-provider";
import { GuidesPageContent } from "@/components/guides/guides-page-content";
import { publicPageMetadataCopy } from "@/lib/public-metadata";
import { createPublicPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPublicPageMetadata({
  ...publicPageMetadataCopy.guides.en,
  path: "/guides",
  locale: "en",
});

export default function GuidesPage() {
  return (
    <LocaleProvider initialLocale="en">
      <GuidesPageContent />
    </LocaleProvider>
  );
}

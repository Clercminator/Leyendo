import type { Metadata } from "next";

import { LocaleProvider } from "@/components/layout/locale-provider";
import { AboutPageContent } from "@/components/about/about-page-content";
import { publicPageMetadataCopy } from "@/lib/public-metadata";
import { createPublicPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPublicPageMetadata({
  ...publicPageMetadataCopy.about.en,
  path: "/about",
  locale: "en",
});

export default function AboutPage() {
  return (
    <LocaleProvider initialLocale="en">
      <AboutPageContent />
    </LocaleProvider>
  );
}

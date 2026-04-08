import type { Metadata } from "next";

import { LocaleProvider } from "@/components/layout/locale-provider";
import { HomePageContent } from "@/components/home/home-page-content";
import { publicPageMetadataCopy } from "@/lib/public-metadata";
import { createPublicPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPublicPageMetadata({
  ...publicPageMetadataCopy.home.en,
  path: "/",
  locale: "en",
});

export default function HomePage() {
  return (
    <LocaleProvider initialLocale="en">
      <HomePageContent />
    </LocaleProvider>
  );
}

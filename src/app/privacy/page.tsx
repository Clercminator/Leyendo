import type { Metadata } from "next";

import { LocaleProvider } from "@/components/layout/locale-provider";
import { PrivacyPageContent } from "@/components/privacy/privacy-page-content";
import { publicPageMetadataCopy } from "@/lib/public-metadata";
import { createPublicPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPublicPageMetadata({
  ...publicPageMetadataCopy.privacy.en,
  path: "/privacy",
  locale: "en",
});

export default function PrivacyPage() {
  return (
    <LocaleProvider initialLocale="en">
      <PrivacyPageContent />
    </LocaleProvider>
  );
}

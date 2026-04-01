import type { Metadata } from "next";

import { PrivacyPageContent } from "@/components/privacy/privacy-page-content";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy",
  description:
    "See how Leyendo keeps reading local-first, avoids hidden guest uploads, and only syncs when you choose a cloud account.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}

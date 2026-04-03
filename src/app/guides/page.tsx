import type { Metadata } from "next";

import { GuidesPageContent } from "@/components/guides/guides-page-content";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Guides",
  description:
    "Browse Leyendo guides for reading real documents with better pace, comprehension, and control.",
  keywords: [
    "reading speed guides",
    "fast reading guides",
    "read real documents faster",
    "reading comprehension guides",
    "document reading workflow",
  ],
  path: "/guides",
});

export default function GuidesPage() {
  return <GuidesPageContent />;
}

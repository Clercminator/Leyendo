import type { Metadata } from "next";

import { GuidesPageContent } from "@/components/guides/guides-page-content";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Guides",
  description:
    "Browse Leyendo guides for reading speed, fast reading, lectura rapida, leer mas rapido, and comprehension on real documents.",
  keywords: [
    "reading speed guides",
    "fast reading guides",
    "lectura rapida",
    "leer mas rapido",
    "velocidad de lectura",
  ],
  path: "/guides",
});

export default function GuidesPage() {
  return <GuidesPageContent />;
}

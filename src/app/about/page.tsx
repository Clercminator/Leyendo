import type { Metadata } from "next";

import { AboutPageContent } from "@/components/about/about-page-content";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description:
    "Learn what Leyendo is, why it exists, and how David Clerc is building a calmer reading speed tool for English and Spanish readers looking for fast reading and lectura rapida that still respects comprehension.",
  keywords: [
    "about Leyendo",
    "David Clerc",
    "reading speed tool",
    "fast reading",
    "lectura rapida",
    "leer mas rapido",
  ],
  path: "/about",
});

export default function AboutPage() {
  return <AboutPageContent />;
}

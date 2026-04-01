import type { Metadata } from "next";

import { HomePageContent } from "@/components/home/home-page-content";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Reading speed for real documents",
  description:
    "Leyendo helps readers searching for reading speed, fast reading, lectura rapida, and leer mas rapido. Read PDFs and dense documents faster with better focus, calmer pacing, and more control.",
  keywords: [
    "reading speed",
    "fast reading",
    "speed reading app",
    "read faster",
    "lectura rapida",
    "leer mas rapido",
    "velocidad de lectura",
    "comprension lectora",
  ],
  path: "/",
});

export default function HomePage() {
  return <HomePageContent />;
}

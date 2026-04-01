import type { Metadata } from "next";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;

const defaultSiteUrl =
  process.env.NODE_ENV === "production"
    ? "https://leyendo.xyz"
    : "http://localhost:3000";

export const siteUrl = (configuredSiteUrl ?? defaultSiteUrl).replace(
  /\/+$/,
  "",
);
export const siteName = "Leyendo";
export const siteTagline = "Calm reading for real documents.";
export const siteDescription =
  "Leyendo is a reading speed and fast reading app for real documents. Improve reading speed, practice lectura rapida with calmer pacing, and read PDFs, DOCX, Markdown, TXT, and pasted text with more control.";
export const siteKeywords = [
  "Leyendo",
  "reading speed",
  "fast reading",
  "read faster",
  "speed reading",
  "document reader",
  "PDF reader",
  "speed reading app",
  "guided reading",
  "focused reading",
  "reading progress sync",
  "local-first reading",
  "lectura rapida",
  "leer mas rapido",
  "velocidad de lectura",
  "comprension lectora",
  "lector de PDF",
  "lectura enfocada",
];
export const founderName = "David Clerc";
export const founderRole = "Founder";
export const founderLinkedInUrl = "https://www.linkedin.com/in/david-clerc";
export const founderGitHubUrl = "https://github.com/Clercminator";
export const founderBio =
  "David Clerc is an entrepreneur and commercial engineer with a master's in finance, broad experience in AI and data science, and a long-standing interest in reading, training, and practical learning systems.";

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteUrl}/`).toString();
}

export function createPageMetadata({
  title,
  description,
  keywords,
  path,
  index = true,
}: {
  title: string;
  description: string;
  keywords?: string[];
  path: string;
  index?: boolean;
}): Metadata {
  const fullTitle = `${title} | ${siteName}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url: path,
      title: fullTitle,
      description,
      siteName,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: index
      ? undefined
      : {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            "max-image-preview": "none",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

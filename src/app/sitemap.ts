import type { MetadataRoute } from "next";

import { guides } from "@/lib/guides";
import { getLocalizedPublicPath } from "@/lib/public-paths";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPagePaths = ["/", "/about", "/guides", "/pricing", "/privacy"];
  const publicLocales = ["en", "es", "pt"] as const;

  return [
    ...publicLocales.flatMap((locale) =>
      publicPagePaths.map((path) => ({
        url: absoluteUrl(getLocalizedPublicPath(path, locale)),
        changeFrequency: path === "/guides" || path === "/" ? "weekly" as const : "monthly" as const,
        priority:
          path === "/"
            ? 1
            : path === "/guides"
              ? 0.85
              : path === "/pricing"
                ? 0.8
                : path === "/about"
                  ? 0.8
                  : 0.7,
      })),
    ),
    ...guides.map((guide) => ({
      url: absoluteUrl(getLocalizedPublicPath(`/guides/${guide.slug}`, guide.language)),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

import "server-only";

import { statSync } from "node:fs";
import path from "node:path";

import type { GuideLanguage } from "@/lib/guides";

const fallbackContentDate = new Date("2026-04-08T00:00:00.000Z");

const guideSourceFileByLanguage: Record<GuideLanguage, string> = {
  en: path.join(process.cwd(), "src", "lib", "guides.ts"),
  es: path.join(process.cwd(), "src", "lib", "guides-es.generated.ts"),
  pt: path.join(process.cwd(), "src", "lib", "guides-pt.generated.ts"),
};

function readModifiedDate(filePath: string) {
  try {
    return statSync(filePath).mtime;
  } catch {
    return fallbackContentDate;
  }
}

export function getGuideContentDates(language: GuideLanguage) {
  const modified = readModifiedDate(guideSourceFileByLanguage[language]);
  const isoDate = modified.toISOString();

  return {
    datePublished: isoDate,
    dateModified: isoDate,
  };
}

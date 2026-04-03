import { describe, expect, it } from "vitest";

import {
  featuredGuides,
  getGuideBySlug,
  getGuideReaderDocumentId,
  getGuidesForLocale,
  getGuidesByCluster,
  getReadingPathGuides,
  getRelatedGuides,
  guides,
  serializeGuideToMarkdown,
} from "@/lib/guides";

describe("guides", () => {
  it("uses unique slugs for every public guide", () => {
    const uniqueSlugs = new Set(guides.map((guide) => guide.slug));

    expect(uniqueSlugs.size).toBe(guides.length);
  });

  it("can resolve a guide by slug", () => {
    expect(getGuideBySlug("reading-speed-for-real-documents")?.title).toBe(
      "Reading Speed for Real Documents",
    );
  });

  it("keeps featured guides inside the public guide set", () => {
    expect(featuredGuides.length).toBeGreaterThan(0);
    expect(featuredGuides.every((guide) => guides.includes(guide))).toBe(true);
  });

  it("assigns stable section ids for guide tables of contents", () => {
    for (const guide of guides) {
      const sectionIds = new Set(guide.sections.map((section) => section.id));

      expect(sectionIds.size).toBe(guide.sections.length);
    }
  });

  it("groups guides by cluster for the hub", () => {
    expect(getGuidesByCluster("reading-speed").length).toBeGreaterThan(0);
    expect(getGuidesByCluster("comprension").length).toBeGreaterThan(0);
  });

  it("returns guides only for the current locale on public surfaces", () => {
    expect(
      getGuidesForLocale("en").every((guide) => guide.language === "en"),
    ).toBe(true);
    expect(
      getGuidesForLocale("es").every((guide) => guide.language === "es"),
    ).toBe(true);
    expect(
      getGuidesForLocale("pt").every((guide) => guide.language === "en"),
    ).toBe(true);
  });

  it("keeps related and reading-path guides inside the same language", () => {
    const englishGuide = getGuideBySlug("reading-speed-for-real-documents");
    const spanishGuide = getGuideBySlug(
      "lectura-rapida-para-documentos-reales",
    );

    expect(englishGuide).toBeDefined();
    expect(spanishGuide).toBeDefined();

    expect(
      getRelatedGuides(englishGuide!).every((guide) => guide.language === "en"),
    ).toBe(true);
    expect(
      getReadingPathGuides(spanishGuide!).every(
        ({ guide }) => guide.language === "es",
      ),
    ).toBe(true);
  });

  it("serializes a guide into stable markdown for the reader handoff", () => {
    const guide = getGuideBySlug("velocidad-de-lectura-y-comprension");

    expect(guide).toBeDefined();
    expect(getGuideReaderDocumentId(guide!.slug)).toBe(
      "guide:velocidad-de-lectura-y-comprension:v1",
    );

    const markdown = serializeGuideToMarkdown(guide!);

    expect(markdown).toContain(`# ${guide!.title}`);
    expect(markdown).toContain("## Preguntas frecuentes");
    expect(markdown).toContain(`### ${guide!.faqs[0]?.question}`);
    expect(markdown).toContain(`## ${guide!.sections[0]?.title}`);
  });
});

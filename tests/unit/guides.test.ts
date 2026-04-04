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
      "Reading Speed for PDFs and Long Documents",
    );
    expect(getGuideBySlug("ler-aumenta-o-qi")?.title).toBe(
      "Ler aumenta o QI? Nao diretamente, mas muda a forma como voce pensa",
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

  it("returns locale-specific guides and keeps locale article counts aligned", () => {
    const englishGuides = getGuidesForLocale("en");
    const spanishGuides = getGuidesForLocale("es");
    const portugueseGuides = getGuidesForLocale("pt");

    expect(englishGuides.every((guide) => guide.language === "en")).toBe(true);
    expect(spanishGuides.every((guide) => guide.language === "es")).toBe(true);
    expect(portugueseGuides.every((guide) => guide.language === "pt")).toBe(
      true,
    );
    expect(englishGuides.length).toBeGreaterThan(0);
    expect(spanishGuides.length).toBe(englishGuides.length);
    expect(portugueseGuides.length).toBe(englishGuides.length);
  });

  it("keeps every guide in the same public article format", () => {
    for (const guide of guides) {
      expect(guide.keyTakeaways).toHaveLength(3);
      expect(guide.keywords).toHaveLength(4);
      expect(guide.sections).toHaveLength(4);
      expect(guide.faqs).toHaveLength(3);
      expect(guide.intro.length).toBeGreaterThan(20);
      expect(guide.audience.length).toBeGreaterThan(20);

      for (const section of guide.sections) {
        expect(section.paragraphs).toHaveLength(2);
        expect(section.title.length).toBeGreaterThan(5);
      }
    }
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

  it("resolves every related and reading-path slug within the same locale", () => {
    for (const guide of guides) {
      expect(getRelatedGuides(guide)).toHaveLength(guide.relatedSlugs.length);
      expect(getReadingPathGuides(guide)).toHaveLength(
        guide.readingPath.length,
      );
    }
  });

  it("serializes a guide into stable markdown for the reader handoff", () => {
    const guide = getGuideBySlug("velocidad-de-lectura-y-comprension");
    const portugueseGuide = getGuideBySlug("ler-aumenta-o-qi");

    expect(guide).toBeDefined();
    expect(portugueseGuide).toBeDefined();
    expect(getGuideReaderDocumentId(guide!.slug)).toBe(
      "guide:velocidad-de-lectura-y-comprension:v1",
    );

    const markdown = serializeGuideToMarkdown(guide!);
    const portugueseMarkdown = serializeGuideToMarkdown(portugueseGuide!);

    expect(markdown).toContain(`# ${guide!.title}`);
    expect(markdown).toContain("## Preguntas frecuentes");
    expect(markdown).toContain(`### ${guide!.faqs[0]?.question}`);
    expect(markdown).toContain(`## ${guide!.sections[0]?.title}`);
    expect(portugueseMarkdown).toContain("## Pontos-chave");
    expect(portugueseMarkdown).toContain("## Perguntas frequentes");
  });
});

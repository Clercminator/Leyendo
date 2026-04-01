import { describe, expect, it } from "vitest";

import {
  featuredGuides,
  getGuideBySlug,
  getGuidesByCluster,
  guides,
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
});

import { describe, expect, it } from "vitest";

import { resolvePreferredLocale } from "@/lib/locale";

describe("resolvePreferredLocale", () => {
  it("uses an exact supported locale when it is present", () => {
    expect(resolvePreferredLocale(["pt", "en-US"])).toBe("pt");
  });

  it("maps browser regional locales to the supported app locale", () => {
    expect(resolvePreferredLocale(["es-ES"])).toBe("es");
    expect(resolvePreferredLocale(["pt-BR"])).toBe("pt");
  });

  it("falls back to the first supported locale in the browser preference list", () => {
    expect(resolvePreferredLocale(["fr-CA", "es-MX", "en-US"])).toBe("es");
  });

  it("falls back to english when no supported browser locale is available", () => {
    expect(resolvePreferredLocale(["fr-FR", "de-DE"])).toBe("en");
    expect(resolvePreferredLocale(undefined)).toBe("en");
  });
});

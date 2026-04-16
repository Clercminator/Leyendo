import { describe, expect, it } from "vitest";

import {
  buildSupabaseAuthRedirectUrl,
  getSafePostAuthRedirectPath,
} from "@/lib/supabase/auth-redirect";

describe("auth redirect helpers", () => {
  it("wraps a same-origin destination in the callback URL", () => {
    const redirectUrl = buildSupabaseAuthRedirectUrl(
      "https://leyendo.vercel.app/pricing?checkout=focus&provider=lemonsqueezy#plans",
      "https://leyendo.vercel.app",
    );

    expect(redirectUrl).toBe(
      "https://leyendo.vercel.app/auth/callback?next=%2Fpricing%3Fcheckout%3Dfocus%26provider%3Dlemonsqueezy%23plans",
    );
  });

  it("defaults to the account page when no destination is provided", () => {
    const redirectUrl = buildSupabaseAuthRedirectUrl(
      undefined,
      "https://leyendo.xyz",
    );

    expect(redirectUrl).toBe(
      "https://leyendo.xyz/auth/callback?next=%2Faccount",
    );
  });

  it("rejects cross-origin redirect targets", () => {
    const nextPath = getSafePostAuthRedirectPath(
      "https://example.com/phishing",
      "https://leyendo.vercel.app",
    );

    expect(nextPath).toBe("/account");
  });

  it("keeps relative post-auth paths intact", () => {
    const nextPath = getSafePostAuthRedirectPath(
      "/pricing?checkout=max&provider=mercadopago",
      "https://leyendo.vercel.app",
    );

    expect(nextPath).toBe("/pricing?checkout=max&provider=mercadopago");
  });
});

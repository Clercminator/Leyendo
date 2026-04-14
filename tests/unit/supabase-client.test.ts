import { afterEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const originalSupabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function importClientModule() {
  vi.resetModules();
  return import("@/lib/supabase/client");
}

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    originalSupabasePublishableKey;
  createClientMock.mockReset();
  vi.restoreAllMocks();
});

describe("Supabase browser client config", () => {
  it("accepts NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY when ANON_KEY is absent", async () => {
    const fakeClient = { auth: {} };

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    createClientMock.mockReturnValue(fakeClient);

    const { getSupabaseBrowserClient, isSupabaseConfigured } =
      await importClientModule();

    expect(isSupabaseConfigured).toBe(true);
    expect(getSupabaseBrowserClient()).toBe(fakeClient);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      },
    );
  });

  it("stays disabled when neither public Supabase key env name is present", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";

    const { getSupabaseBrowserClient, isSupabaseConfigured } =
      await importClientModule();

    expect(isSupabaseConfigured).toBe(false);
    expect(getSupabaseBrowserClient()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "Supabase is not configured. Missing variables:",
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  });
});

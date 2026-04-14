import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function pickFirstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublicKey = pickFirstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

let browserClient: SupabaseClient | null = null;

export const isSupabaseConfigured =
  supabaseUrl.trim().length > 0 && supabasePublicKey.trim().length > 0;

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn("Supabase is not configured. Missing variables:");
  if (!supabaseUrl.trim()) {
    console.warn("- NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!supabasePublicKey.trim()) {
    console.warn(
      "- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabasePublicKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let browserClient: SupabaseClient | null = null;

export const isSupabaseConfigured =
  supabaseUrl.trim().length > 0 && supabaseAnonKey.trim().length > 0;

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn("Supabase is not configured. Missing variables:");
  if (!supabaseUrl.trim()) {
    console.warn("- NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!supabaseAnonKey.trim()) {
    console.warn("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}

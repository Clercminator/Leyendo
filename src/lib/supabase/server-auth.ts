import { createClient, type User } from "@supabase/supabase-js";

import { getProfile, type UserProfile } from "@/lib/supabase/profile";

function pickFirstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

export interface AuthenticatedCheckoutContext {
  profile?: UserProfile;
  user: User;
}

export async function getAuthenticatedCheckoutContext(
  accessToken: string,
): Promise<AuthenticatedCheckoutContext | undefined> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabasePublicKey = pickFirstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!supabaseUrl.trim() || !supabasePublicKey.trim()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = createClient(supabaseUrl, supabasePublicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return undefined;
  }

  const profile = await getProfile(supabase, user.id);
  return { profile, user };
}
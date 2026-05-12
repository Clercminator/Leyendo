import type { SupabaseClient } from "@supabase/supabase-js";

const FEEDBACK_TABLE = "feedback";

export async function submitFeedback(
  supabase: SupabaseClient,
  input: {
    email?: string;
    message: string;
    rating?: number;
    route: string;
    userId?: string;
  },
) {
  const { error } = await supabase.from(FEEDBACK_TABLE).insert({
    email: input.email?.trim() ? input.email.trim() : null,
    message: input.message.trim(),
    rating: input.rating ?? null,
    route: input.route,
    user_id: input.userId ?? null,
  });

  if (error) {
    throw error;
  }
}
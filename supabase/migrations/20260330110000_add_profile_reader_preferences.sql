alter table public.profiles
  add column if not exists reader_preferences jsonb;
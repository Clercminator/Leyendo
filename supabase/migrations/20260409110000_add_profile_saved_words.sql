alter table public.profiles
  add column if not exists saved_words jsonb not null default '[]'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_saved_words_array_check;

alter table public.profiles
  add constraint profiles_saved_words_array_check
  check (jsonb_typeof(saved_words) = 'array');
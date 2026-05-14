alter table public.user_highlights
  add column if not exists source_page_index integer;
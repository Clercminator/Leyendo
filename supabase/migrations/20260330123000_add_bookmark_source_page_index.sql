alter table public.user_bookmarks
  add column if not exists source_page_index integer;
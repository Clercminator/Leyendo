create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create table if not exists public.user_documents (
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null,
  title text not null,
  source_kind text not null,
  excerpt text not null,
  payload jsonb not null,
  total_chunks integer not null,
  total_sections integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, document_id)
);

alter table public.user_documents enable row level security;

create table if not exists public.user_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null,
  current_chunk_index integer not null,
  current_token_index integer not null,
  current_paragraph_index integer not null,
  current_section_index integer not null,
  percent_complete real not null,
  updated_at timestamptz not null,
  primary key (user_id, document_id),
  foreign key (user_id, document_id)
    references public.user_documents (user_id, document_id)
    on delete cascade
);

alter table public.user_sessions enable row level security;

create table if not exists public.user_bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  document_id text not null,
  label text not null,
  note text,
  chunk_index integer not null,
  token_index integer not null,
  paragraph_index integer not null,
  section_index integer not null,
  created_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, document_id)
    references public.user_documents (user_id, document_id)
    on delete cascade
);

alter table public.user_bookmarks enable row level security;

create table if not exists public.user_highlights (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  document_id text not null,
  label text not null,
  quote text not null,
  note text,
  chunk_index integer not null,
  token_index integer not null,
  paragraph_index integer not null,
  section_index integer not null,
  created_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, document_id)
    references public.user_documents (user_id, document_id)
    on delete cascade
);

alter table public.user_highlights enable row level security;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  route text not null,
  message text not null,
  rating integer,
  created_at timestamptz not null default now(),
  constraint feedback_rating_range check (rating is null or (rating >= 1 and rating <= 5))
);

alter table public.feedback enable row level security;

create or replace function public.ensure_profile_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (target_user_id)
  on conflict (user_id) do update
    set updated_at = now();
end;
$$;

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_profile_for_user(auth.uid());
end;
$$;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can upsert own profile" on public.profiles;
create policy "Users can upsert own profile"
on public.profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own documents" on public.user_documents;
create policy "Users manage own documents"
on public.user_documents
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own sessions" on public.user_sessions;
create policy "Users manage own sessions"
on public.user_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own bookmarks" on public.user_bookmarks;
create policy "Users manage own bookmarks"
on public.user_bookmarks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own highlights" on public.user_highlights;
create policy "Users manage own highlights"
on public.user_highlights
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Anyone can insert feedback" on public.feedback;
create policy "Anyone can insert feedback"
on public.feedback
for insert
with check (true);

drop policy if exists "Users can view their feedback" on public.feedback;
create policy "Users can view their feedback"
on public.feedback
for select
using (auth.uid() = user_id);

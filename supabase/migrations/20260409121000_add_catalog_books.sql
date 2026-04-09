create table if not exists public.catalog_books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text,
  description text,
  excerpt text not null default '',
  language text,
  source_kind text not null default 'pdf',
  payload_path text not null,
  payload_bytes integer not null default 0,
  estimated_reading_minutes integer not null default 0,
  total_chunks integer not null default 0,
  total_sections integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.catalog_books
  drop constraint if exists catalog_books_source_kind_check;

alter table public.catalog_books
  add constraint catalog_books_source_kind_check
  check (source_kind in ('pdf', 'docx', 'rtf', 'markdown', 'plain-text'));

alter table public.catalog_books
  drop constraint if exists catalog_books_payload_bytes_check;

alter table public.catalog_books
  add constraint catalog_books_payload_bytes_check
  check (payload_bytes >= 0);

alter table public.catalog_books
  drop constraint if exists catalog_books_estimated_reading_minutes_check;

alter table public.catalog_books
  add constraint catalog_books_estimated_reading_minutes_check
  check (estimated_reading_minutes >= 0);

alter table public.catalog_books
  drop constraint if exists catalog_books_total_chunks_check;

alter table public.catalog_books
  add constraint catalog_books_total_chunks_check
  check (total_chunks >= 0);

alter table public.catalog_books
  drop constraint if exists catalog_books_total_sections_check;

alter table public.catalog_books
  add constraint catalog_books_total_sections_check
  check (total_sections >= 0);

create or replace function public.current_profile_has_plan_access(required_plan text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and (
        required_plan = 'basic'
        or (
          required_plan = 'focus'
          and plan_tier in ('focus', 'max')
        )
        or (
          required_plan = 'max'
          and plan_tier = 'max'
        )
      )
      and (
        required_plan = 'basic'
        or subscription_status is null
        or (
          subscription_status in ('trialing', 'active', 'grace_period')
          and (
            subscription_expires_at is null
            or subscription_expires_at > timezone('utc', now())
            or (
              subscription_grace_until is not null
              and subscription_grace_until > timezone('utc', now())
            )
          )
        )
      )
  );
$$;

alter table public.catalog_books enable row level security;

drop policy if exists "Max readers can view catalog books" on public.catalog_books;
create policy "Max readers can view catalog books"
on public.catalog_books
for select
to authenticated
using (
  is_published = true
  and public.current_profile_has_plan_access('max')
);

insert into storage.buckets (id, name, public)
values ('catalog-payloads', 'catalog-payloads', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Max readers can view catalog payloads" on storage.objects;
create policy "Max readers can view catalog payloads"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'catalog-payloads'
  and public.current_profile_has_plan_access('max')
);
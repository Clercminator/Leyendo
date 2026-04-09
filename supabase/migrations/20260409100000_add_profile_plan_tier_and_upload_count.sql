alter table public.profiles
  add column if not exists plan_tier text not null default 'basic',
  add column if not exists file_upload_count integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_plan_tier_check;

alter table public.profiles
  add constraint profiles_plan_tier_check
  check (plan_tier in ('basic', 'focus', 'max'));

alter table public.profiles
  drop constraint if exists profiles_file_upload_count_check;

alter table public.profiles
  add constraint profiles_file_upload_count_check
  check (file_upload_count >= 0);
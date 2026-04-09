alter table public.profiles
  add column if not exists subscription_status text,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists subscription_grace_until timestamptz;

alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
  check (
    subscription_status is null
    or subscription_status in (
      'inactive',
      'pending',
      'trialing',
      'active',
      'grace_period',
      'past_due',
      'canceled',
      'expired'
    )
  );

update public.profiles
set
  subscription_started_at = coalesce(subscription_started_at, timezone('utc', now())),
  subscription_status = coalesce(subscription_status, 'active')
where plan_tier in ('focus', 'max');
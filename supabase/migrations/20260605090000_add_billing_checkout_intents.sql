create table if not exists public.billing_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  tier text not null,
  status text not null default 'created',
  provider_checkout_id text,
  provider_subscription_id text,
  provider_payment_id text,
  user_email text,
  return_url text,
  checkout_url text,
  support_reference text not null,
  metadata jsonb not null default '{}'::jsonb,
  return_payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkout_intents_provider_check
    check (provider in ('lemonsqueezy', 'mercadopago')),
  constraint billing_checkout_intents_tier_check
    check (tier in ('focus', 'max')),
  constraint billing_checkout_intents_status_check
    check (
      status in (
        'created',
        'checkout_opened',
        'returned',
        'pending_provider_sync',
        'linked',
        'needs_attention',
        'expired'
      )
    ),
  constraint billing_checkout_intents_support_reference_key
    unique (support_reference)
);

alter table public.billing_checkout_intents enable row level security;

drop policy if exists "Users can view own billing checkout intents" on public.billing_checkout_intents;
create policy "Users can view own billing checkout intents"
on public.billing_checkout_intents
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own billing checkout intents" on public.billing_checkout_intents;
create policy "Users can create own billing checkout intents"
on public.billing_checkout_intents
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own billing checkout intents" on public.billing_checkout_intents;
create policy "Users can update own billing checkout intents"
on public.billing_checkout_intents
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_billing_checkout_intents_user_id
  on public.billing_checkout_intents(user_id);

create index if not exists idx_billing_checkout_intents_provider_status
  on public.billing_checkout_intents(provider, status);

create index if not exists idx_billing_checkout_intents_provider_subscription_id
  on public.billing_checkout_intents(provider, provider_subscription_id)
  where provider_subscription_id is not null and provider_subscription_id != '';

create index if not exists idx_billing_checkout_intents_provider_payment_id
  on public.billing_checkout_intents(provider, provider_payment_id)
  where provider_payment_id is not null and provider_payment_id != '';

grant select, insert, update on public.billing_checkout_intents to authenticated;
grant all on public.billing_checkout_intents to service_role;

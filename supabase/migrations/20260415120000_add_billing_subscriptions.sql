create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  provider text not null,
  provider_subscription_id text not null,
  provider_customer_id text,
  tier text not null,
  status text not null,
  status_formatted text,
  billing_interval text not null default 'month',
  product_name text,
  variant_name text,
  user_email text,
  order_id text,
  order_item_id text,
  variant_id text,
  subscription_started_at timestamptz,
  renews_at timestamptz,
  ends_at timestamptz,
  grace_until timestamptz,
  trial_ends_at timestamptz,
  paused boolean not null default false,
  cancel_requested boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_provider_check
    check (provider in ('lemonsqueezy', 'mercadopago')),
  constraint billing_subscriptions_tier_check
    check (tier in ('focus', 'max')),
  constraint billing_subscriptions_status_check
    check (
      status in (
        'inactive',
        'pending',
        'trialing',
        'active',
        'grace_period',
        'past_due',
        'canceled',
        'expired'
      )
    ),
  constraint billing_subscriptions_provider_subscription_key
    unique (provider, provider_subscription_id)
);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "Users can view own billing subscriptions" on public.billing_subscriptions;
create policy "Users can view own billing subscriptions"
on public.billing_subscriptions
for select
using (auth.uid() = user_id);

create index if not exists idx_billing_subscriptions_user_id
  on public.billing_subscriptions(user_id);

create index if not exists idx_billing_subscriptions_user_email
  on public.billing_subscriptions(lower(user_email))
  where user_email is not null;

create index if not exists idx_billing_subscriptions_provider_status
  on public.billing_subscriptions(provider, status);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  amount numeric(12, 2) not null default 0,
  currency text not null,
  status text not null,
  provider text not null,
  provider_payment_id text not null,
  tier text,
  payment_type text not null default 'subscription_invoice',
  billing_interval text,
  billing_reason text,
  provider_subscription_id text,
  provider_customer_id text,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payments_provider_check
    check (provider in ('lemonsqueezy', 'mercadopago')),
  constraint payments_tier_check
    check (tier is null or tier in ('focus', 'max')),
  constraint payments_payment_type_check
    check (payment_type in ('one_time', 'subscription_invoice')),
  constraint payments_provider_payment_key unique (provider, provider_payment_id)
);

alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
on public.payments
for select
using (auth.uid() = user_id);

create index if not exists idx_payments_user_id
  on public.payments(user_id);

create index if not exists idx_payments_user_email
  on public.payments(lower(user_email))
  where user_email is not null;

create index if not exists idx_payments_provider_subscription_id
  on public.payments(provider, provider_subscription_id)
  where provider_subscription_id is not null and provider_subscription_id != '';

grant select on public.billing_subscriptions to authenticated;
grant all on public.billing_subscriptions to service_role;

grant select on public.payments to authenticated;
grant all on public.payments to service_role;

create or replace function public.sync_profile_subscription_from_billing(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_tier text;
  selected_status text;
  selected_started_at timestamptz;
  selected_renews_at timestamptz;
  selected_ends_at timestamptz;
  selected_grace_until timestamptz;
  entitlement_deadline timestamptz;
  resolved_status text;
begin
  perform public.ensure_profile_for_user(target_user_id);

  select
    bs.tier,
    bs.status,
    bs.subscription_started_at,
    bs.renews_at,
    bs.ends_at,
    bs.grace_until,
    coalesce(bs.grace_until, bs.ends_at, bs.renews_at)
  into
    selected_tier,
    selected_status,
    selected_started_at,
    selected_renews_at,
    selected_ends_at,
    selected_grace_until,
    entitlement_deadline
  from public.billing_subscriptions bs
  where bs.user_id = target_user_id
  order by
    case
      when bs.status in ('pending', 'trialing', 'active', 'grace_period', 'past_due') then 2
      when bs.status = 'canceled'
        and coalesce(bs.grace_until, bs.ends_at, bs.renews_at) > now() then 1
      else 0
    end desc,
    case bs.tier when 'max' then 2 when 'focus' then 1 else 0 end desc,
    coalesce(bs.grace_until, bs.ends_at, bs.renews_at, bs.updated_at) desc,
    bs.updated_at desc
  limit 1;

  if selected_tier is null or selected_status is null then
    update public.profiles
    set
      plan_tier = 'basic',
      subscription_status = 'inactive',
      subscription_started_at = null,
      subscription_expires_at = null,
      subscription_grace_until = null,
      updated_at = now()
    where user_id = target_user_id;

    return 'basic';
  end if;

  resolved_status := selected_status;

  if selected_status = 'canceled' then
    if entitlement_deadline is not null and entitlement_deadline > now() then
      resolved_status := 'grace_period';
    else
      resolved_status := 'canceled';
    end if;
  elsif selected_status = 'expired' and entitlement_deadline is not null and entitlement_deadline > now() then
    resolved_status := 'grace_period';
  end if;

  if resolved_status not in ('pending', 'trialing', 'active', 'grace_period', 'past_due') then
    update public.profiles
    set
      plan_tier = 'basic',
      subscription_status = resolved_status,
      subscription_started_at = selected_started_at,
      subscription_expires_at = coalesce(selected_renews_at, selected_ends_at, selected_grace_until),
      subscription_grace_until = selected_grace_until,
      updated_at = now()
    where user_id = target_user_id;

    return 'basic';
  end if;

  update public.profiles
  set
    plan_tier = selected_tier,
    subscription_status = resolved_status,
    subscription_started_at = coalesce(selected_started_at, subscription_started_at, now()),
    subscription_expires_at = coalesce(selected_renews_at, selected_ends_at, selected_grace_until),
    subscription_grace_until = case
      when resolved_status in ('grace_period', 'past_due')
        then coalesce(selected_grace_until, selected_ends_at, selected_renews_at)
      else null
    end,
    updated_at = now()
  where user_id = target_user_id;

  return selected_tier;
end;
$$;

revoke all on function public.sync_profile_subscription_from_billing(uuid) from public;
grant execute on function public.sync_profile_subscription_from_billing(uuid) to authenticated;
grant execute on function public.sync_profile_subscription_from_billing(uuid) to service_role;

create or replace function public.reconcile_my_billing_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  linked_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_profile_for_user(current_user_id);

  if current_email is not null then
    update public.billing_subscriptions
    set
      user_id = current_user_id,
      updated_at = now()
    where user_id is null
      and user_email is not null
      and lower(user_email) = current_email;

    get diagnostics linked_count = row_count;

    update public.payments
    set user_id = current_user_id
    where user_id is null
      and user_email is not null
      and lower(user_email) = current_email;
  end if;

  perform public.sync_profile_subscription_from_billing(current_user_id);

  return linked_count;
end;
$$;

revoke all on function public.reconcile_my_billing_subscriptions() from public;
grant execute on function public.reconcile_my_billing_subscriptions() to authenticated;
grant execute on function public.reconcile_my_billing_subscriptions() to service_role;
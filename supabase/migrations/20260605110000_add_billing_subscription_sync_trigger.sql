create or replace function public.sync_profile_on_billing_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.user_id is not null then
    begin
      perform public.sync_profile_subscription_from_billing(NEW.user_id);
    exception when others then
      raise warning '[billing_subscriptions trigger] sync_profile_subscription_from_billing failed for user %: %',
        NEW.user_id, sqlerrm;
    end;
  end if;
  return NEW;
end;
$$;

revoke all on function public.sync_profile_on_billing_subscription_change() from public;
grant execute on function public.sync_profile_on_billing_subscription_change() to service_role;

drop trigger if exists trg_sync_profile_on_billing_subscription
  on public.billing_subscriptions;

create trigger trg_sync_profile_on_billing_subscription
  after insert or update on public.billing_subscriptions
  for each row
  execute function public.sync_profile_on_billing_subscription_change();

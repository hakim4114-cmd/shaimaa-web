-- Merchant OS — money guardrails, review fixes (1.16.1)
--
-- 1. No money movement dated before the opening date (it would escape the cash count).
-- 2. An expense cannot be edited once recorded (amount, category, date, guard
--    columns): correct it by deleting and adding it again, which passes the guard.
-- 3. Capital counts only money put in from the opening date, like cash.
-- 4. Business value subtracts unpaid obligations (stock bought on credit is not value).
-- 5. COD waiting at the carrier counts net of the carrier fee.
-- 6. Ad budget = the larger of the fixed amount and the share of last month's
--    revenue (a weak month never gives less than the fixed amount); returned
--    orders are no longer revenue.

-- 2. Expenses are insert / delete only for the app's users.
revoke update on public.expenses from authenticated;
grant update (description) on public.expenses to authenticated;

create or replace function app.money_position(p_organization_id uuid)
returns table (
  configured boolean, cash_cents bigint, due_30d_cents bigint, reserve_cents bigint, free_cents bigint,
  capital_cents bigint, stock_value_cents bigint, receivable_cents bigint, business_value_cents bigint,
  floor_pct integer, floor_cents bigint, below_floor boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'Africa/Casablanca';
  v_today date := (now() at time zone tz)::date;
  v_settings public.cash_settings;
  v_entries bigint; v_withdrawn bigint; v_payouts bigint; v_expenses bigint; v_unpaid bigint;
begin
  select * into v_settings from public.cash_settings where organization_id = p_organization_id;
  if not found then
    return query select false, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0, 0::bigint, false;
    return;
  end if;
  select coalesce(sum(amount_cents) filter (where kind <> 'owner_withdrawal'), 0), coalesce(-sum(amount_cents) filter (where kind = 'owner_withdrawal'), 0)
  into v_entries, v_withdrawn
  from public.cash_entries where organization_id = p_organization_id and entry_date >= v_settings.opening_date;
  select coalesce(sum(net_received_cents), 0) into v_payouts
  from public.cod_remittances where organization_id = p_organization_id and received_on >= v_settings.opening_date;
  select coalesce(sum(amount_cents), 0) into v_expenses
  from public.expenses where organization_id = p_organization_id and incurred_on >= v_settings.opening_date;

  configured := true;
  cash_cents := v_entries + v_payouts - v_expenses - v_withdrawn;
  select coalesce(sum(amount_cents) filter (where due_on <= v_today + 30), 0), coalesce(sum(amount_cents), 0)
  into due_30d_cents, v_unpaid
  from public.payables where organization_id = p_organization_id and paid_on is null;
  reserve_cents := v_settings.reserve_floor_cents;
  free_cents := cash_cents - due_30d_cents - reserve_cents;
  select coalesce(sum(amount_cents), 0) into capital_cents
  from public.cash_entries
  where organization_id = p_organization_id and kind in ('opening', 'capital_in') and entry_date >= v_settings.opening_date;
  select coalesce(sum(l.on_hand * v.cost_cents), 0) into stock_value_cents
  from public.inventory_levels l join public.product_variants v on v.id = l.variant_id
  where v.organization_id = p_organization_id and v.cost_cents is not null;
  select coalesce(sum(greatest(o.cod_amount_cents - coalesce(s.fee, 0), 0)), 0) into receivable_cents
  from public.orders o
  left join lateral (
    select sum(sh.shipping_cost_cents) as fee from public.shipments sh where sh.order_id = o.id and sh.status <> 'cancelled'
  ) s on true
  where o.organization_id = p_organization_id and o.payment_status = 'awaiting_remittance';
  business_value_cents := cash_cents + stock_value_cents + receivable_cents - v_unpaid;
  floor_pct := v_settings.capital_floor_pct;
  floor_cents := (capital_cents * v_settings.capital_floor_pct) / 100;
  below_floor := capital_cents > 0 and v_settings.capital_floor_pct > 0 and business_value_cents < floor_cents;
  return next;
end;
$$;

create or replace function app.ad_budget(p_organization_id uuid, p_day date) returns bigint
language sql stable security definer set search_path = '' as $$
  with s as (select * from public.cash_settings where organization_id = p_organization_id),
  prev as (
    select coalesce(sum(o.subtotal_cents - o.discount_cents + o.shipping_fee_cents), 0) as revenue
    from public.orders o
    where o.organization_id = p_organization_id
      and o.status in ('delivered', 'exchange_requested')
      and (o.delivered_at at time zone 'Africa/Casablanca')::date >= (date_trunc('month', p_day) - interval '1 month')::date
      and (o.delivered_at at time zone 'Africa/Casablanca')::date < date_trunc('month', p_day)::date
  )
  select greatest(s.ad_budget_cents, (prev.revenue * s.ad_budget_revenue_pct) / 100) from s, prev;
$$;

-- 1. Expenses dated before the opening date are refused once the shop has set its rules.
create or replace function app.guard_expense() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_flags text[];
begin
  if current_user <> 'authenticated' then
    new.guard_flags := '{}';
    return new;
  end if;
  if app.before_opening(new.organization_id, new.incurred_on) then
    raise exception 'BEFORE_OPENING_DATE' using errcode = 'P0001';
  end if;
  v_flags := app.expense_guard_flags(new.organization_id, new.category, new.amount_cents, new.incurred_on);
  if cardinality(v_flags) > 0 and char_length(btrim(coalesce(new.guard_reason, ''))) < 10 then
    raise exception 'GUARD_REASON_REQUIRED' using errcode = 'P0001', detail = array_to_string(v_flags, ',');
  end if;
  new.guard_flags := v_flags;
  new.guard_reason := case when cardinality(v_flags) > 0 then btrim(new.guard_reason) else '' end;
  return new;
end;
$$;

create function app.before_opening(p_organization_id uuid, p_day date) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p_day < s.opening_date from public.cash_settings s where s.organization_id = p_organization_id), false);
$$;
revoke execute on function app.before_opening(uuid, date) from public, anon;
grant execute on function app.before_opening(uuid, date) to authenticated;

-- Cash entries and withdrawals dated before the opening date are refused too.
create function app.guard_cash_entry() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if app.before_opening(new.organization_id, new.entry_date) then
    raise exception 'BEFORE_OPENING_DATE' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger guard_cash_entry before insert on public.cash_entries for each row execute function app.guard_cash_entry();

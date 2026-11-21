-- Merchant OS — guardrails as general rules, scaled to the capital (1.18.0)
--
-- The fixed defaults (reserve, ad budget 2,000 MAD, loss cap 600 MAD) only
-- suited one amount of capital. Each is now a share of the capital (opening +
-- money put in), so the same rules work for 3,000 or 300,000 MAD:
--   reserve      = the larger of 25 % of the capital and the fixed minimum (if any)
--   ad budget    = 15 % of the capital, unless a fixed amount is set;
--                  30 % of last month's revenue when last month was profitable
--   loss cap     = 10 % of the capital for each test, unless the campaign sets one
-- No capital entered yet → no reserve share, no budget share, no loss cap: the
-- rules start with the money, like the other guardrails.

alter table public.cash_settings
  add column reserve_pct integer not null default 25 check (reserve_pct between 0 and 100),
  add column ad_budget_capital_pct integer not null default 15 check (ad_budget_capital_pct between 0 and 100),
  add column loss_cap_pct integer not null default 10 check (loss_cap_pct between 0 and 100),
  alter column ad_budget_cents drop not null,
  alter column ad_budget_cents set default null;
-- A 2,000 MAD budget was the old default, not a choice.
update public.cash_settings set ad_budget_cents = null where ad_budget_cents = 200000;
grant update (reserve_pct, ad_budget_capital_pct, loss_cap_pct) on public.cash_settings to authenticated;

alter table public.marketing_campaigns alter column loss_cap_cents drop not null, alter column loss_cap_cents set default null;
-- 600 MAD was the old default, not a choice: those campaigns follow the rule.
update public.marketing_campaigns set loss_cap_cents = null where loss_cap_cents = 60000;

-- Money put in from the opening date (opening balance + capital in).
create function app.capital_cents(p_organization_id uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(e.amount_cents), 0)
  from public.cash_entries e join public.cash_settings s on s.organization_id = e.organization_id
  where e.organization_id = p_organization_id and e.kind in ('opening', 'capital_in') and e.entry_date >= s.opening_date;
$$;
revoke execute on function app.capital_cents(uuid) from public, anon, authenticated;

create function app.effective_reserve(p_organization_id uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce((select greatest(s.reserve_floor_cents, (app.capital_cents(p_organization_id) * s.reserve_pct) / 100)
    from public.cash_settings s where s.organization_id = p_organization_id), 0);
$$;
revoke execute on function app.effective_reserve(uuid) from public, anon, authenticated;

create function app.effective_loss_cap(p_organization_id uuid, p_campaign_id uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.loss_cap_cents from public.marketing_campaigns c where c.id = p_campaign_id and c.organization_id = p_organization_id),
    (select (app.capital_cents(p_organization_id) * s.loss_cap_pct) / 100 from public.cash_settings s where s.organization_id = p_organization_id),
    0);
$$;
revoke execute on function app.effective_loss_cap(uuid, uuid) from public, anon, authenticated;

-- Money position: the reserve is the effective one.
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
  capital_cents := app.capital_cents(p_organization_id);
  reserve_cents := greatest(v_settings.reserve_floor_cents, (capital_cents * v_settings.reserve_pct) / 100);
  free_cents := cash_cents - due_30d_cents - reserve_cents;
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

-- Owner pay uses the same effective reserve.
create or replace function public.safe_withdrawal(p_organization_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'Africa/Casablanca';
  v_today date := (now() at time zone tz)::date;
  v_settings public.cash_settings;
  v_entries bigint; v_withdrawn bigint; v_payouts bigint; v_expenses bigint;
  v_balance bigint; v_due bigint; v_earned bigint; v_closed integer;
  v_pay_left bigint; v_free bigint; v_safe bigint; v_reason text; v_reserve bigint;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  select * into v_settings from public.cash_settings where organization_id = p_organization_id;
  if not found then
    return jsonb_build_object('configured', false);
  end if;

  select coalesce(sum(amount_cents) filter (where kind <> 'owner_withdrawal'), 0), coalesce(-sum(amount_cents) filter (where kind = 'owner_withdrawal'), 0)
  into v_entries, v_withdrawn
  from public.cash_entries where organization_id = p_organization_id;
  select coalesce(sum(net_received_cents), 0) into v_payouts
  from public.cod_remittances where organization_id = p_organization_id and received_on >= v_settings.opening_date;
  select coalesce(sum(amount_cents), 0) into v_expenses
  from public.expenses where organization_id = p_organization_id and incurred_on >= v_settings.opening_date;
  v_balance := v_entries + v_payouts - v_expenses - v_withdrawn;

  select coalesce(sum(amount_cents), 0) into v_due
  from public.payables where organization_id = p_organization_id and paid_on is null and due_on <= v_today + 30;

  select count(*), coalesce(sum((a ->> 'cents')::bigint) filter (where lower(btrim(a ->> 'name')) = lower(btrim(v_settings.owner_fund_name)) and v_settings.owner_fund_name <> ''), 0)
  into v_closed, v_earned
  from public.monthly_closes c left join lateral jsonb_array_elements(c.allocations) a on true
  where c.organization_id = p_organization_id;
  select count(*) into v_closed from public.monthly_closes where organization_id = p_organization_id;

  v_reserve := app.effective_reserve(p_organization_id);
  v_pay_left := v_earned - v_withdrawn;
  v_free := v_balance - v_due - v_reserve;
  v_safe := greatest(0, least(v_pay_left, v_free));
  v_reason := case
    when v_settings.owner_fund_name = '' then 'no_owner_fund'
    when v_closed = 0 then 'no_closed_month'
    when v_pay_left <= 0 then 'pay_not_earned'
    when v_free <= 0 then 'cash_tight'
    when v_free < v_pay_left then 'limited_by_cash'
    else 'ok' end;

  return jsonb_build_object(
    'configured', true,
    'safe_cents', v_safe,
    'reason', v_reason,
    'cash_balance_cents', v_balance,
    'obligations_30d_cents', v_due,
    'reserve_floor_cents', v_reserve,
    'free_cash_cents', v_free,
    'pay_earned_cents', v_earned,
    'withdrawn_cents', v_withdrawn,
    'pay_left_cents', v_pay_left,
    'closed_months', v_closed,
    'opening_date', v_settings.opening_date,
    'owner_fund_name', v_settings.owner_fund_name
  );
end;
$$;

-- Readable summary: also the amounts each rule gives today.
create or replace function public.capital_status(p_organization_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v record;
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  select * into v from app.money_position(p_organization_id);
  return jsonb_build_object(
    'configured', v.configured, 'cash_cents', v.cash_cents, 'reserve_cents', v.reserve_cents, 'free_cents', v.free_cents,
    'capital_cents', v.capital_cents, 'stock_value_cents', v.stock_value_cents, 'receivable_cents', v.receivable_cents,
    'business_value_cents', v.business_value_cents, 'floor_pct', v.floor_pct, 'floor_cents', v.floor_cents, 'below_floor', v.below_floor,
    'ad_budget_cents', case when v.configured then app.ad_budget(p_organization_id, v_today) else 0 end,
    'loss_cap_cents', case when v.configured then app.effective_loss_cap(p_organization_id, null) else 0 end
  );
end;
$$;

-- Ad budget: fixed amount if set, else a share of the capital; the revenue share when last month was profitable.
create or replace function app.ad_budget(p_organization_id uuid, p_day date) returns bigint
language sql stable security definer set search_path = '' as $$
  with s as (select * from public.cash_settings where organization_id = p_organization_id),
  bounds as (
    select (date_trunc('month', p_day) - interval '1 month')::date as from_day, date_trunc('month', p_day)::date as to_day
  ),
  delivered as (
    select o.id, o.subtotal_cents - o.discount_cents + o.shipping_fee_cents as revenue
    from public.orders o, bounds b
    where o.organization_id = p_organization_id
      and o.status in ('delivered', 'exchange_requested')
      and (o.delivered_at at time zone 'Africa/Casablanca')::date >= b.from_day
      and (o.delivered_at at time zone 'Africa/Casablanca')::date < b.to_day
  ),
  prev as (
    select
      (select coalesce(sum(revenue), 0) from delivered) as revenue,
      (select coalesce(sum(i.quantity * coalesce(i.unit_cost_cents, 0)), 0) from public.order_items i join delivered d on d.id = i.order_id) as cogs,
      (select coalesce(sum(sh.shipping_cost_cents), 0) from public.shipments sh join delivered d on d.id = sh.order_id where sh.status <> 'cancelled') as carrier,
      (select coalesce(sum(e.amount_cents), 0) from public.expenses e, bounds b
        where e.organization_id = p_organization_id and e.category = 'advertising' and e.incurred_on >= b.from_day and e.incurred_on < b.to_day) as ads
  ),
  base as (
    select coalesce(s.ad_budget_cents, (app.capital_cents(p_organization_id) * s.ad_budget_capital_pct) / 100) as cents from s
  )
  select case
    when prev.revenue - prev.cogs - prev.carrier - prev.ads > 0
      then greatest(base.cents, (prev.revenue * s.ad_budget_revenue_pct) / 100)
    else base.cents
  end
  from s, prev, base;
$$;

drop function public.campaign_loss_status(uuid);
create function public.campaign_loss_status(p_organization_id uuid)
returns table (campaign_id uuid, name text, profit_cents bigint, loss_cap_cents bigint, over_cap boolean, missing_cost_items bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  return query
  select c.id, c.name, p.cents, cap.cents, (cap.cents > 0 and -p.cents >= cap.cents),
    (select count(*) from public.order_items i join public.orders o on o.id = i.order_id
      where o.organization_id = p_organization_id and o.campaign_id = c.id and o.status <> 'cancelled' and i.unit_cost_cents is null)
  from public.marketing_campaigns c
  cross join lateral (select app.campaign_profit(p_organization_id, c.id) as cents) p
  cross join lateral (select app.effective_loss_cap(p_organization_id, c.id) as cents) cap
  where c.organization_id = p_organization_id and (c.ends_on is null or c.ends_on >= (now() at time zone 'Africa/Casablanca')::date - 30)
  order by p.cents;
end;
$$;
revoke execute on function public.campaign_loss_status(uuid) from public, anon;
grant execute on function public.campaign_loss_status(uuid) to authenticated;

create or replace function app.expense_guard_flags(p_organization_id uuid, p_category public.expense_category, p_amount_cents bigint, p_day date, p_campaign_id uuid) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare
  v_flags text[];
  v_cap bigint;
begin
  v_flags := app.expense_guard_flags(p_organization_id, p_category, p_amount_cents, p_day);
  if p_category <> 'advertising' or not app.has_role(p_organization_id, '{owner,admin,finance}') then
    return v_flags;
  end if;
  if p_campaign_id is null then
    if exists (select 1 from public.marketing_campaigns c where c.organization_id = p_organization_id and (c.ends_on is null or c.ends_on >= p_day)) then
      v_flags := v_flags || 'no_campaign'::text;
    end if;
    return v_flags;
  end if;
  v_cap := app.effective_loss_cap(p_organization_id, p_campaign_id);
  if v_cap > 0 and -app.campaign_profit(p_organization_id, p_campaign_id) >= v_cap then
    v_flags := v_flags || 'loss_cap'::text;
  end if;
  return v_flags;
end;
$$;

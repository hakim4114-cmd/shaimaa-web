-- Merchant OS — cumulative loss cap per campaign, ad budget tied to profit (1.17.0)
--
-- 1. Each campaign (one campaign = one product test) has a loss cap, 600 MAD by
--    default. Its result since the start, after ads = delivered revenue − cost
--    of the delivered pieces − carrier cost of delivered and refused parcels −
--    all its ad spend. Once the loss reaches the cap, the bell says "stop this
--    test" and any new ad expense on it needs a written reason ('loss_cap').
-- 2. The ad budget grows with revenue only when last month was profitable after
--    ads; otherwise it stays at the fixed amount.

alter table public.marketing_campaigns
  add column loss_cap_cents bigint not null default 60000 check (loss_cap_cents >= 0);

-- Result of one campaign since its first order or expense, after ads.
create function app.campaign_profit(p_organization_id uuid, p_campaign_id uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  with o as (
    select o.id, o.status, o.subtotal_cents - o.discount_cents + o.shipping_fee_cents as revenue
    from public.orders o
    where o.organization_id = p_organization_id and o.campaign_id = p_campaign_id
  ),
  revenue as (
    select coalesce(sum(revenue) filter (where status in ('delivered', 'exchange_requested')), 0) as cents from o
  ),
  cogs as (
    select coalesce(sum(i.quantity * coalesce(i.unit_cost_cents, 0)), 0) as cents
    from public.order_items i join o on o.id = i.order_id
    where o.status in ('delivered', 'exchange_requested')
  ),
  carrier as (
    select coalesce(sum(s.shipping_cost_cents), 0) as cents
    from public.shipments s join o on o.id = s.order_id
    where s.status <> 'cancelled' and o.status in ('delivered', 'exchange_requested', 'refused', 'returned')
  ),
  ads as (
    select coalesce(sum(e.amount_cents), 0) as cents
    from public.expenses e
    where e.organization_id = p_organization_id and e.campaign_id = p_campaign_id and e.category = 'advertising'
  )
  select revenue.cents - cogs.cents - carrier.cents - ads.cents from revenue, cogs, carrier, ads;
$$;
revoke execute on function app.campaign_profit(uuid, uuid) from public, anon, authenticated;

-- Campaigns and how far each is from its loss cap (marketing page, bell, reports).
create function public.campaign_loss_status(p_organization_id uuid)
returns table (campaign_id uuid, name text, profit_cents bigint, loss_cap_cents bigint, over_cap boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  return query
  select c.id, c.name, p.cents, c.loss_cap_cents, (c.loss_cap_cents > 0 and -p.cents >= c.loss_cap_cents)
  from public.marketing_campaigns c
  cross join lateral (select app.campaign_profit(p_organization_id, c.id) as cents) p
  where c.organization_id = p_organization_id and (c.ends_on is null or c.ends_on >= (now() at time zone 'Africa/Casablanca')::date - 30)
  order by p.cents;
end;
$$;
revoke execute on function public.campaign_loss_status(uuid) from public, anon;
grant execute on function public.campaign_loss_status(uuid) to authenticated;

-- Ad budget: the share of last month's revenue counts only if last month made money after ads.
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
  )
  select case
    when prev.revenue - prev.cogs - prev.carrier - prev.ads > 0
      then greatest(s.ad_budget_cents, (prev.revenue * s.ad_budget_revenue_pct) / 100)
    else s.ad_budget_cents
  end
  from s, prev;
$$;

-- The guard now knows which campaign an ad expense is for.
create function app.expense_guard_flags(p_organization_id uuid, p_category public.expense_category, p_amount_cents bigint, p_day date, p_campaign_id uuid) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare
  v_flags text[];
  v_cap bigint;
begin
  v_flags := app.expense_guard_flags(p_organization_id, p_category, p_amount_cents, p_day);
  if p_category = 'advertising' and p_campaign_id is not null and app.has_role(p_organization_id, '{owner,admin,finance}') then
    select loss_cap_cents into v_cap from public.marketing_campaigns where id = p_campaign_id and organization_id = p_organization_id;
    if v_cap > 0 and -app.campaign_profit(p_organization_id, p_campaign_id) >= v_cap then
      v_flags := v_flags || 'loss_cap'::text;
    end if;
  end if;
  return v_flags;
end;
$$;
revoke execute on function app.expense_guard_flags(uuid, public.expense_category, bigint, date, uuid) from public, anon;
grant execute on function app.expense_guard_flags(uuid, public.expense_category, bigint, date, uuid) to authenticated;

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
  v_flags := app.expense_guard_flags(new.organization_id, new.category, new.amount_cents, new.incurred_on, new.campaign_id);
  if cardinality(v_flags) > 0 and char_length(btrim(coalesce(new.guard_reason, ''))) < 10 then
    raise exception 'GUARD_REASON_REQUIRED' using errcode = 'P0001', detail = array_to_string(v_flags, ',');
  end if;
  new.guard_flags := v_flags;
  new.guard_reason := case when cardinality(v_flags) > 0 then btrim(new.guard_reason) else '' end;
  return new;
end;
$$;

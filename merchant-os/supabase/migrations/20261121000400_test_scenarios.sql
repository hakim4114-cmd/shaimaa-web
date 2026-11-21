-- Merchant OS — scenario review fixes for product tests (1.17.2)
--
-- 1. An ad expense with no campaign escaped the loss cap and the ad cost per
--    product. While the shop runs a campaign, one needs a written reason
--    ('no_campaign').
-- 2. A returned or refused piece that comes back damaged or missing is a loss
--    of its cost: it now counts in the test's result.
-- 3. A piece sold without a cost counted as free, so the test looked better
--    than it was: the status now says how many pieces have no cost.

create or replace function app.campaign_profit(p_organization_id uuid, p_campaign_id uuid) returns bigint
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
  lost as (
    select coalesce(sum(ri.quantity * coalesce(i.unit_cost_cents, 0)), 0) as cents
    from public.return_items ri
    join public.order_items i on i.id = ri.order_item_id
    join o on o.id = i.order_id
    where ri.condition in ('damaged', 'missing')
  ),
  ads as (
    select coalesce(sum(e.amount_cents), 0) as cents
    from public.expenses e
    where e.organization_id = p_organization_id and e.campaign_id = p_campaign_id and e.category = 'advertising'
  )
  select revenue.cents - cogs.cents - carrier.cents - lost.cents - ads.cents from revenue, cogs, carrier, lost, ads;
$$;

drop function public.campaign_loss_status(uuid);
create function public.campaign_loss_status(p_organization_id uuid)
returns table (campaign_id uuid, name text, profit_cents bigint, loss_cap_cents bigint, over_cap boolean, missing_cost_items bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  return query
  select c.id, c.name, p.cents, c.loss_cap_cents, (c.loss_cap_cents > 0 and -p.cents >= c.loss_cap_cents),
    (select count(*) from public.order_items i join public.orders o on o.id = i.order_id
      where o.organization_id = p_organization_id and o.campaign_id = c.id and o.status <> 'cancelled' and i.unit_cost_cents is null)
  from public.marketing_campaigns c
  cross join lateral (select app.campaign_profit(p_organization_id, c.id) as cents) p
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
    -- Only once the shop tracks campaigns: before that there is nothing to attribute to.
    if exists (select 1 from public.marketing_campaigns c where c.organization_id = p_organization_id and (c.ends_on is null or c.ends_on >= p_day)) then
      v_flags := v_flags || 'no_campaign'::text;
    end if;
    return v_flags;
  end if;
  select loss_cap_cents into v_cap from public.marketing_campaigns where id = p_campaign_id and organization_id = p_organization_id;
  if v_cap > 0 and -app.campaign_profit(p_organization_id, p_campaign_id) >= v_cap then
    v_flags := v_flags || 'loss_cap'::text;
  end if;
  return v_flags;
end;
$$;

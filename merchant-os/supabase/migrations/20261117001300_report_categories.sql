-- Merchant OS — operating expenses = every category except stock purchases,
-- production (both enter profit through the cost of goods sold) and debt
-- repayment (cash out, not a cost). Covers the categories added in 1.3.1.

create or replace function public.report_summary(p_organization_id uuid, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'Africa/Casablanca';
  v jsonb;
  v_created integer; v_cancelled integer; v_confirmed integer; v_booked bigint;
  v_shipped integer; v_delivered integer; v_refused integer; v_returned integer;
  v_revenue bigint; v_refunds bigint; v_cogs bigint; v_cost_missing integer; v_restocked_cost bigint;
  v_ship_cost bigint; v_return_fees bigint; v_opex bigint; v_ads bigint; v_cash bigint; v_receivable bigint; v_cash_out bigint;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'INVALID_RANGE' using errcode = 'P0001';
  end if;

  -- Demand (orders created in the range)
  select count(*), count(*) filter (where o.status = 'cancelled'),
         count(*) filter (where o.confirmed_at is not null),
         coalesce(sum(o.total_cents) filter (where o.status <> 'cancelled'), 0)
  into v_created, v_cancelled, v_confirmed, v_booked
  from public.orders o
  where o.organization_id = p_organization_id and (o.created_at at time zone tz)::date between p_from and p_to;

  -- Outcomes by event date
  select count(*) filter (where (o.shipped_at at time zone tz)::date between p_from and p_to),
         count(*) filter (where (o.delivered_at at time zone tz)::date between p_from and p_to),
         coalesce(sum(o.subtotal_cents - o.discount_cents + o.shipping_fee_cents) filter (where (o.delivered_at at time zone tz)::date between p_from and p_to), 0)
  into v_shipped, v_delivered, v_revenue
  from public.orders o where o.organization_id = p_organization_id;

  select count(*) filter (where r.kind = 'refusal'), count(*) filter (where r.kind = 'return')
  into v_refused, v_returned
  from public.returns r where r.organization_id = p_organization_id and (r.created_at at time zone tz)::date between p_from and p_to;

  select coalesce(sum(r.refund_amount_cents), 0) into v_refunds
  from public.returns r where r.organization_id = p_organization_id and (r.refunded_at at time zone tz)::date between p_from and p_to;

  select coalesce(sum(i.quantity * i.unit_cost_cents) filter (where i.unit_cost_cents is not null), 0),
         count(*) filter (where i.unit_cost_cents is null)
  into v_cogs, v_cost_missing
  from public.order_items i join public.orders o on o.id = i.order_id
  where o.organization_id = p_organization_id and (o.delivered_at at time zone tz)::date between p_from and p_to;

  -- Units of delivered orders that came back resellable are back in stock.
  select coalesce(sum(ri.quantity * oi.unit_cost_cents), 0) into v_restocked_cost
  from public.return_items ri
  join public.order_items oi on oi.id = ri.order_item_id
  join public.orders o on o.id = oi.order_id
  where ri.organization_id = p_organization_id and ri.condition = 'resellable' and oi.unit_cost_cents is not null
    and o.delivered_at is not null and (ri.decided_at at time zone tz)::date between p_from and p_to;

  select coalesce(sum(s.shipping_cost_cents), 0) into v_ship_cost
  from public.shipments s
  where s.organization_id = p_organization_id and s.status in ('delivered', 'returned_to_sender')
    and (coalesce(s.shipped_at, s.created_at) at time zone tz)::date between p_from and p_to;
  select coalesce(sum(r.return_shipping_fee_cents), 0) into v_return_fees
  from public.returns r where r.organization_id = p_organization_id and (r.received_at at time zone tz)::date between p_from and p_to;

  select coalesce(sum(e.amount_cents) filter (where e.category not in ('inventory_purchase', 'production', 'debt_repayment')), 0),
         coalesce(sum(e.amount_cents) filter (where e.category = 'advertising'), 0),
         coalesce(sum(e.amount_cents), 0)
  into v_opex, v_ads, v_cash_out
  from public.expenses e where e.organization_id = p_organization_id and e.incurred_on between p_from and p_to;

  select coalesce(sum(r.net_received_cents), 0) into v_cash
  from public.cod_remittances r where r.organization_id = p_organization_id and r.received_on between p_from and p_to;
  select coalesce(sum(o.cod_amount_cents), 0) into v_receivable
  from public.orders o where o.organization_id = p_organization_id and o.payment_status = 'awaiting_remittance';

  v := jsonb_build_object(
    'orders_created', v_created,
    'orders_cancelled', v_cancelled,
    'orders_confirmed', v_confirmed,
    'booked_value_cents', v_booked,
    'orders_shipped', v_shipped,
    'orders_delivered', v_delivered,
    'orders_refused', v_refused,
    'orders_returned', v_returned,
    'delivered_revenue_cents', v_revenue,
    'refunds_cents', v_refunds,
    'net_revenue_cents', v_revenue - v_refunds,
    'cogs_cents', v_cogs - v_restocked_cost,
    'cost_missing_lines', v_cost_missing,
    'shipping_cost_cents', v_ship_cost + v_return_fees,
    'operating_expenses_cents', v_opex,
    'advertising_cents', v_ads,
    'net_profit_cents', (v_revenue - v_refunds) - (v_cogs - v_restocked_cost) - (v_ship_cost + v_return_fees) - v_opex,
    'cash_collected_cents', v_cash,
    'cod_receivable_cents', v_receivable,
    'cash_out_cents', v_cash_out + v_refunds,
    'confirmation_rate', case when v_created > 0 then round(v_confirmed::numeric / v_created, 4) end,
    'return_rate', case when v_shipped > 0 then round((v_refused + v_returned)::numeric / v_shipped, 4) end,
    'cost_per_delivered_cents', case when v_delivered > 0 then round(v_ads::numeric / v_delivered) end
  );
  return v;
end;
$$;

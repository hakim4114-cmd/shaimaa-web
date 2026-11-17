-- Merchant OS — cash, reporting and marketing (0.7.0)
-- Carrier invoices (COD payouts) with exact reconciliation, the financial
-- report (docs/BUSINESS_RULES.md → Financial definitions) and the campaign
-- report. Dates are Moroccan calendar days.

-- ---------------------------------------------------------------------------
-- Carrier invoices: besides the COD of delivered parcels, an invoice carries
-- other lines (refusal fees, pickup fees, credits). They are kept as one
-- signed amount so that net received always equals the money that arrived.
-- ---------------------------------------------------------------------------
alter table public.cod_remittances add column other_charges_cents bigint not null default 0;
alter table public.cod_remittances drop constraint cod_remittances_check;
alter table public.cod_remittances add constraint cod_remittances_net_check
  check (net_received_cents = gross_collected_cents - fees_cents - other_charges_cents);
create unique index cod_remittances_reference_uq on public.cod_remittances (organization_id, provider_id, reference)
  where reference <> '';

-- p_items: [{"tracking_number", "collected_cents", "fee_cents"}] — delivered parcels only.
-- p_invoice_amount_cents: what the carrier pays. The difference with the
-- delivered COD minus their fees is recorded as other charges; the caller
-- shows the invoice lines that explain it.
create function public.record_carrier_invoice(
  p_organization_id uuid,
  p_provider_id uuid,
  p_reference text,
  p_received_on date,
  p_items jsonb,
  p_invoice_amount_cents bigint,
  p_note text default ''
) returns public.cod_remittances
language plpgsql security definer set search_path = '' as $$
declare
  v_remittance public.cod_remittances;
  v_item jsonb;
  v_order public.orders;
  v_collected bigint;
  v_fee bigint;
  v_gross bigint := 0;
  v_fees bigint := 0;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  if coalesce(btrim(p_reference), '') = '' then
    raise exception 'REFERENCE_REQUIRED' using errcode = 'P0001';
  end if;
  if p_received_on is null or p_received_on > (now() at time zone 'Africa/Casablanca')::date then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'REMITTANCE_ITEMS_REQUIRED' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.shipping_providers p where p.id = p_provider_id and p.organization_id = p_organization_id) then
    raise exception 'PROVIDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.cod_remittances r where r.organization_id = p_organization_id and r.provider_id = p_provider_id and r.reference = btrim(p_reference)) then
    raise exception 'INVOICE_ALREADY_RECORDED' using errcode = 'P0001';
  end if;

  insert into public.cod_remittances (organization_id, provider_id, reference, received_on, gross_collected_cents, fees_cents, other_charges_cents, net_received_cents, note, created_by)
  values (p_organization_id, p_provider_id, btrim(p_reference), p_received_on, 0, 0, 0, 0, coalesce(p_note, ''), auth.uid())
  returning * into v_remittance;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select o.* into v_order
    from public.shipments s
    join public.orders o on o.id = s.order_id
    where s.organization_id = p_organization_id and s.provider_id = p_provider_id
      and s.tracking_number = btrim(v_item ->> 'tracking_number') and s.status <> 'cancelled'
    for update of o;
    if not found then
      raise exception 'PARCEL_NOT_FOUND' using errcode = 'P0002', detail = v_item ->> 'tracking_number';
    end if;
    if v_order.payment_status <> 'awaiting_remittance' then
      raise exception 'ORDER_NOT_AWAITING_REMITTANCE' using errcode = 'P0001', detail = v_order.order_number;
    end if;
    v_collected := (v_item ->> 'collected_cents')::bigint;
    v_fee := coalesce((v_item ->> 'fee_cents')::bigint, 0);
    if v_collected is distinct from v_order.cod_amount_cents then
      raise exception 'COD_AMOUNT_MISMATCH' using errcode = 'P0001', detail = v_order.order_number;
    end if;
    if v_fee < 0 or v_fee > v_collected then
      raise exception 'INVALID_FEE' using errcode = 'P0001', detail = v_order.order_number;
    end if;

    insert into public.cod_remittance_items (organization_id, remittance_id, order_id, collected_cents, fee_cents)
    values (p_organization_id, v_remittance.id, v_order.id, v_collected, v_fee);
    update public.orders set payment_status = 'settled' where id = v_order.id returning * into v_order;
    perform app.add_order_event(v_order, 'payment', null, null, 'COD settled: ' || v_remittance.reference);
    v_gross := v_gross + v_collected;
    v_fees := v_fees + v_fee;
  end loop;

  if p_invoice_amount_cents is null then
    raise exception 'INVOICE_AMOUNT_REQUIRED' using errcode = 'P0001';
  end if;

  update public.cod_remittances
  set gross_collected_cents = v_gross, fees_cents = v_fees,
      other_charges_cents = v_gross - v_fees - p_invoice_amount_cents,
      net_received_cents = p_invoice_amount_cents
  where id = v_remittance.id
  returning * into v_remittance;
  return v_remittance;
end;
$$;

-- ---------------------------------------------------------------------------
-- Financial report for a range of Moroccan calendar days (inclusive).
-- One source for the dashboard, exports and the assistant.
-- ---------------------------------------------------------------------------
create function public.report_summary(p_organization_id uuid, p_from date, p_to date) returns jsonb
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

  select coalesce(sum(e.amount_cents) filter (where e.category in ('packaging', 'shipping', 'advertising', 'salaries', 'rent', 'software', 'other')), 0),
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

-- ---------------------------------------------------------------------------
-- Campaign report: orders attributed to a campaign (created in the range),
-- what they became, and the ad spend recorded for the campaign in the range.
-- campaign_id NULL row = orders without a campaign and spend not tied to one.
-- ---------------------------------------------------------------------------
create function public.campaign_report(p_organization_id uuid, p_from date, p_to date)
returns table (
  campaign_id uuid, name text, platform public.marketing_platform,
  spend_cents bigint, orders integer, confirmed integer, delivered integer, refused integer,
  delivered_revenue_cents bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'Africa/Casablanca';
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'INVALID_RANGE' using errcode = 'P0001';
  end if;
  return query
  with spend as (
    select e.campaign_id as cid, sum(e.amount_cents)::bigint as total
    from public.expenses e
    where e.organization_id = p_organization_id and e.category = 'advertising' and e.incurred_on between p_from and p_to
    group by e.campaign_id
  ), ords as (
    select o.campaign_id as cid,
           count(*)::integer as n,
           (count(*) filter (where o.confirmed_at is not null))::integer as c,
           (count(*) filter (where o.status in ('delivered', 'returned', 'exchange_requested')))::integer as d,
           (count(*) filter (where o.status = 'refused'))::integer as r,
           coalesce(sum(o.subtotal_cents - o.discount_cents + o.shipping_fee_cents) filter (where o.status in ('delivered', 'returned', 'exchange_requested')), 0)::bigint as rev
    from public.orders o
    where o.organization_id = p_organization_id and (o.created_at at time zone tz)::date between p_from and p_to
    group by o.campaign_id
  ), ids as (
    select cid from spend union select cid from ords
    union select c.id from public.marketing_campaigns c
      where c.organization_id = p_organization_id and (c.ends_on is null or c.ends_on >= p_from) and (c.starts_on is null or c.starts_on <= p_to)
  )
  select ids.cid, c.name, c.platform,
         coalesce(spend.total, 0), coalesce(ords.n, 0), coalesce(ords.c, 0), coalesce(ords.d, 0), coalesce(ords.r, 0), coalesce(ords.rev, 0)
  from ids
  left join public.marketing_campaigns c on c.id = ids.cid
  left join spend on spend.cid is not distinct from ids.cid
  left join ords on ords.cid is not distinct from ids.cid
  order by ids.cid is null, coalesce(spend.total, 0) desc, c.name;
end;
$$;

revoke execute on function public.record_carrier_invoice(uuid, uuid, text, date, jsonb, bigint, text),
  public.report_summary(uuid, date, date), public.campaign_report(uuid, date, date) from public, anon;
grant execute on function public.record_carrier_invoice(uuid, uuid, text, date, jsonb, bigint, text),
  public.report_summary(uuid, date, date), public.campaign_report(uuid, date, date) to authenticated;

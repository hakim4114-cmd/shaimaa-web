-- Money and marketing (0.7.0): carrier invoices, financial report, campaign report. Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create function tests.expect_error(p_sql text, p_expected text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm not like '%' || p_expected || '%' then
      raise exception 'Expected error "%" but got "%" for: %', p_expected, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'Expected error "%" but statement succeeded: %', p_expected, p_sql;
end; $$;
create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok - %', p_label;
end; $$;
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

create function tests.new_confirmed_order(p_org uuid, p_variant uuid, p_phone text) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  v_id := (public.create_order(p_org, jsonb_build_object(
    'customer', jsonb_build_object('full_name', 'Client Test', 'phone', p_phone, 'address', 'Hay Test'),
    'items', jsonb_build_array(jsonb_build_object('variant_id', p_variant, 'quantity', 1)),
    'shipping_fee_cents', 3500))).id;
  perform public.log_call_attempt(v_id, 'confirmed');
  return v_id;
end; $$;
grant execute on function tests.new_confirmed_order(uuid, uuid, text) to authenticated;

\set owner    '30000000-0000-0000-0000-00000000000a'
\set viewer   '30000000-0000-0000-0000-00000000000e'
insert into auth.users (id) values (:'owner'), (:'viewer');

set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Money Test', 'money-test') \gset
select id as loc from public.inventory_locations where organization_id = :'org' \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'viewer', 'viewer');
insert into public.products (organization_id, name, status) values (:'org', 'Folder', 'active') returning id as product \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents)
  values (:'org', :'product', 'FLD', 40000, 16000) returning id as v1 \gset
select public.adjust_inventory(:'v1', :'loc', 'receipt', 10, 'stock');
insert into public.shipping_providers (organization_id, name, kind, adapter_key) values (:'org', 'Sendit', 'api', 'sendit') returning id as sendit \gset
insert into public.marketing_campaigns (organization_id, platform, name) values (:'org', 'meta', 'Folder — Nov') returning id as camp \gset

-- Three orders from the campaign: one delivered, one refused, one cancelled.
select (public.create_order(:'org', jsonb_build_object('customer', jsonb_build_object('full_name', 'A Client', 'phone', '+212611000011'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v1', 'quantity', 1)), 'shipping_fee_cents', 3500, 'campaign_id', :'camp'))).id as o1 \gset
select (public.create_order(:'org', jsonb_build_object('customer', jsonb_build_object('full_name', 'B Client', 'phone', '+212611000012'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v1', 'quantity', 1)), 'shipping_fee_cents', 3500, 'campaign_id', :'camp'))).id as o2 \gset
select (public.create_order(:'org', jsonb_build_object('customer', jsonb_build_object('full_name', 'C Client', 'phone', '+212611000013'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v1', 'quantity', 1)), 'shipping_fee_cents', 3500, 'campaign_id', :'camp'))).id as o3 \gset
select public.log_call_attempt(:'o1', 'confirmed');
select public.log_call_attempt(:'o2', 'confirmed');
select public.log_call_attempt(:'o3', 'cancelled', 'Changed mind');
select public.register_carrier_shipment(:'o1', :'sendit', 'DHM001', 3000);
select public.register_carrier_shipment(:'o2', :'sendit', 'DHM002', 3000);

reset role;
set local role service_role;
select public.apply_carrier_event(:'sendit', 'DHM001', 'PICKEDUP', 'picked_up', '{"lastActionAt": "1"}');
select public.apply_carrier_event(:'sendit', 'DHM001', 'DELIVERED', 'delivered', '{"lastActionAt": "2"}');
select public.apply_carrier_event(:'sendit', 'DHM002', 'PICKEDUP', 'picked_up', '{"lastActionAt": "3"}');
select public.apply_carrier_event(:'sendit', 'DHM002', 'REJECTED', 'returned_to_sender', '{"lastActionAt": "4"}');
reset role;
set local role authenticated;
select tests.login(:'owner');

-- Expenses: ad spend on the campaign, packaging, and a stock purchase (cash out, not P&L).
insert into public.expenses (organization_id, category, amount_cents, incurred_on, campaign_id) values (:'org', 'advertising', 20000, current_date, :'camp');
insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (:'org', 'packaging', 1000, current_date);
insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (:'org', 'inventory_purchase', 160000, current_date);

-- Report ----------------------------------------------------------------------
select public.report_summary(:'org', current_date - 1, current_date + 1) as r \gset
select tests.eq((:'r'::jsonb ->> 'orders_created')::int, 3, 'orders created counted');
select tests.eq((:'r'::jsonb ->> 'orders_confirmed')::int, 2, 'confirmed orders counted');
select tests.eq((:'r'::jsonb ->> 'orders_delivered')::int, 1, 'delivered orders counted');
select tests.eq((:'r'::jsonb ->> 'orders_refused')::int, 1, 'refusals counted');
select tests.eq((:'r'::jsonb ->> 'delivered_revenue_cents')::bigint, 43500::bigint, 'revenue = delivered order value incl. shipping fee charged');
select tests.eq((:'r'::jsonb ->> 'cogs_cents')::bigint, 16000::bigint, 'COGS from delivered lines only');
select tests.eq((:'r'::jsonb ->> 'shipping_cost_cents')::bigint, 6000::bigint, 'shipping cost counts delivered and refused parcels');
select tests.eq((:'r'::jsonb ->> 'operating_expenses_cents')::bigint, 21000::bigint, 'stock purchases are not operating expenses');
select tests.eq((:'r'::jsonb ->> 'net_profit_cents')::bigint, 500::bigint, 'net profit = 43500 - 16000 - 6000 - 21000');
select tests.eq((:'r'::jsonb ->> 'cash_out_cents')::bigint, 181000::bigint, 'cash out includes stock purchases');
select tests.eq((:'r'::jsonb ->> 'cod_receivable_cents')::bigint, 43500::bigint, 'delivered COD is receivable until the payout');
select tests.eq((:'r'::jsonb ->> 'return_rate')::numeric, 0.5, 'return rate = refused / shipped');
select tests.eq((:'r'::jsonb ->> 'cost_per_delivered_cents')::numeric, 20000::numeric, 'ad cost per delivered order');

select tests.login(:'viewer');
select tests.expect_error(format($$select public.report_summary(%L, current_date, current_date)$$, :'org'), 'FORBIDDEN');
select tests.login(:'owner');
select tests.expect_error(format($$select public.report_summary(%L, current_date, current_date - 1)$$, :'org'), 'INVALID_RANGE');

-- Campaign report ---------------------------------------------------------------
select tests.eq((select row(spend_cents, orders, confirmed, delivered, refused, delivered_revenue_cents)::text from public.campaign_report(:'org', current_date - 1, current_date) where campaign_id = :'camp'),
  row(20000::bigint, 3, 2, 1, 1, 43500::bigint)::text, 'campaign: spend, orders, confirmations, deliveries, refusals, revenue');

-- Carrier invoice -------------------------------------------------------------------
select tests.expect_error(format($$select public.record_carrier_invoice(%L, %L, 'FH1', current_date, '[{"tracking_number": "DHM001", "collected_cents": 40000, "fee_cents": 3000}]', 37000)$$, :'org', :'sendit'), 'COD_AMOUNT_MISMATCH');
select tests.expect_error(format($$select public.record_carrier_invoice(%L, %L, 'FH1', current_date, '[{"tracking_number": "DHNOPE", "collected_cents": 43500, "fee_cents": 3000}]', 40500)$$, :'org', :'sendit'), 'PARCEL_NOT_FOUND');
-- Delivered 435 - fee 30 - refusal fee 30 = 375 paid.
select id as inv from public.record_carrier_invoice(:'org', :'sendit', 'FH1', current_date, '[{"tracking_number": "DHM001", "collected_cents": 43500, "fee_cents": 3000}]', 37500) \gset
select tests.eq((select row(gross_collected_cents, fees_cents, other_charges_cents, net_received_cents)::text from public.cod_remittances where id = :'inv'),
  row(43500::bigint, 3000::bigint, 3000::bigint, 37500::bigint)::text, 'invoice: net equals the money paid, other charges explain the rest');
select tests.eq((select payment_status::text from public.orders where id = :'o1'), 'settled', 'paid order is settled');
select tests.expect_error(format($$select public.record_carrier_invoice(%L, %L, 'FH1', current_date, '[]', 0)$$, :'org', :'sendit'), 'INVOICE_ALREADY_RECORDED');
select tests.eq((public.report_summary(:'org', current_date, current_date) ->> 'cash_collected_cents')::bigint, 37500::bigint, 'cash collected = invoice amount');
select tests.eq((public.report_summary(:'org', current_date, current_date) ->> 'cod_receivable_cents')::bigint, 0::bigint, 'nothing left to collect');

select tests.login(:'viewer');
select tests.expect_error(format($$select public.record_carrier_invoice(%L, %L, 'FH2', current_date, '[]', 0)$$, :'org', :'sendit'), 'FORBIDDEN');

rollback;

-- Merchant OS — database behaviour tests.
-- Run with scripts/db-test.sh (fresh database, stub + migrations + this file).
-- Everything runs in one transaction and is rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.expect_error(p_sql text, p_expected text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm not like '%' || p_expected || '%' then
      raise exception 'Expected error "%" but got "%" for: %', p_expected, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'Expected error "%" but statement succeeded: %', p_expected, p_sql;
end;
$$;

create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void
language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok - %', p_label;
end;
$$;

create function tests.login(p_user uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema tests to anon, authenticated;

\set owner    '00000000-0000-0000-0000-00000000000a'
\set operator '00000000-0000-0000-0000-00000000000b'
\set warehouse '00000000-0000-0000-0000-00000000000c'
\set finance  '00000000-0000-0000-0000-00000000000d'
\set viewer   '00000000-0000-0000-0000-00000000000e'
\set outsider '00000000-0000-0000-0000-00000000000f'

insert into auth.users (id) values (:'owner'), (:'operator'), (:'warehouse'), (:'finance'), (:'viewer'), (:'outsider');

-- ---------------------------------------------------------------------------
-- Tenancy & membership
-- ---------------------------------------------------------------------------
set local role authenticated;
select tests.login(:'owner');
select id as org_a from public.create_organization('Maison Test', 'maison-test') \gset
select id as loc_a from public.inventory_locations where organization_id = :'org_a' \gset
insert into public.organization_members (organization_id, user_id, role) values
  (:'org_a', :'operator', 'operator'), (:'org_a', :'warehouse', 'warehouse'),
  (:'org_a', :'finance', 'finance'), (:'org_a', :'viewer', 'viewer');

select tests.expect_error(format(
  $$update public.organization_members set role = 'admin' where user_id = %L$$, :'owner'), 'LAST_OWNER');

select tests.login(:'outsider');
select id as org_b from public.create_organization('Other Shop', 'other-shop') \gset
select tests.eq((select count(*) from public.organizations), 1::bigint, 'outsider sees only own organization');

select tests.login(:'operator');
select tests.expect_error(format(
  $$insert into public.organization_members (organization_id, user_id, role) values (%L, %L, 'owner')$$,
  :'org_a', :'viewer'), 'row-level security');

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
select tests.login(:'owner');
insert into public.products (organization_id, name, status) values (:'org_a', 'Amina Djellaba', 'active')
  returning id as product_a \gset
insert into public.product_variants (organization_id, product_id, sku, title, option_values, price_cents, cost_cents, min_stock_level)
  values (:'org_a', :'product_a', 'AMN-IV-M', 'Ivory / M', '{"color":"Ivory","size":"M"}', 89000, 35000, 2)
  returning id as variant_a \gset
insert into public.shipping_providers (organization_id, name) values (:'org_a', 'Manual courier')
  returning id as provider_a \gset

select tests.eq((select created_by from public.products where id = :'product_a'), :'owner'::uuid, 'created_by stamped from auth.uid()');
select tests.expect_error(format(
  $$insert into public.product_variants (organization_id, product_id, sku, price_cents) values (%L, %L, 'AMN-IV-M', 1)$$,
  :'org_a', :'product_a'), 'duplicate key');

select tests.login(:'outsider');
select tests.expect_error(format(
  $$insert into public.products (organization_id, name) values (%L, 'Injected')$$, :'org_a'), 'row-level security');
-- Cross-tenant reference via composite FK is impossible even for an owner of B.
select tests.expect_error(format(
  $$insert into public.product_variants (organization_id, product_id, sku, price_cents) values (%L, %L, 'X1', 1)$$,
  :'org_b', :'product_a'), 'foreign key');

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
select tests.login(:'operator');
select tests.expect_error(format(
  $$select public.adjust_inventory(%L, %L, 'receipt', 5, null)$$, :'variant_a', :'loc_a'), 'FORBIDDEN');

select tests.login(:'warehouse');
select public.adjust_inventory(:'variant_a', :'loc_a', 'receipt', 5, 'Initial stock');
select tests.eq((select available from public.inventory_levels where variant_id = :'variant_a'), 5, 'receipt adds available stock');
select tests.expect_error(format(
  $$select public.adjust_inventory(%L, %L, 'adjustment', -1, '')$$, :'variant_a', :'loc_a'), 'NOTE_REQUIRED');
select tests.expect_error(format(
  $$select public.adjust_inventory(%L, %L, 'adjustment', -9, 'count')$$, :'variant_a', :'loc_a'), 'INSUFFICIENT_STOCK');
select tests.expect_error(format(
  $$update public.inventory_levels set on_hand = 999 where variant_id = %L$$, :'variant_a'), 'permission denied');
select tests.expect_error(format(
  $$insert into public.inventory_movements (organization_id, variant_id, location_id, movement_type, delta_on_hand) values (%L, %L, %L, 'receipt', 1)$$,
  :'org_a', :'variant_a', :'loc_a'), 'permission denied');

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
select tests.login(:'operator');
select id as order1, order_number as order1_number, total_cents as order1_total from public.create_order(:'org_a', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Salma Bennani', 'phone', '+212612345678', 'city', 'Casablanca', 'address', 'Rue 12, Maarif'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'variant_a', 'quantity', 3)),
  'shipping_fee_cents', 3000, 'source', 'whatsapp')) \gset

select tests.eq(:'order1_number'::text, 'ORD-000001', 'order number allocated per organization');
select tests.eq(:'order1_total'::bigint, 270000::bigint, 'total = 3 x 890 MAD + 30 MAD shipping, from catalog price');
select tests.eq((select cod_amount_cents from public.orders where id = :'order1'), 270000::bigint, 'COD defaults to total');
select tests.eq((select unit_cost_cents from public.order_items where order_id = :'order1'), 35000::bigint, 'cost snapshot stored');
select tests.eq((select count(*) from public.order_events where order_id = :'order1'), 1::bigint, 'created event logged');

select id as order2 from public.create_order(:'org_a', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Salma Bennani', 'phone', '+212612345678', 'city', 'Casablanca'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'variant_a', 'quantity', 3)))) \gset
select tests.eq((select count(*) from public.customers where organization_id = :'org_a'), 1::bigint, 'same phone reuses customer');

select tests.expect_error(format($$select public.create_order(%L, %L::jsonb)$$, :'org_a',
  json_build_object('customer', json_build_object('full_name', 'X Y', 'phone', '0612345678'),
    'items', json_build_array(json_build_object('variant_id', :'variant_a', 'quantity', 1)))), 'customers_phone_check');
select tests.expect_error(format($$select public.create_order(%L, %L::jsonb)$$, :'org_a',
  json_build_object('customer', json_build_object('full_name', 'X Y', 'phone', '+212612345679'),
    'items', json_build_array(json_build_object('variant_id', :'variant_a', 'quantity', 1)), 'discount_cents', 999999)), 'INVALID_DISCOUNT');
select tests.expect_error(format($$select public.create_order(%L, '{"items":[]}'::jsonb)$$, :'org_a'), 'ORDER_ITEMS_REQUIRED');

-- State machine
select tests.expect_error(format($$select public.transition_order(%L, 'shipped')$$, :'order1'), 'INVALID_TRANSITION');
select public.transition_order(:'order1', 'confirmed', 'Confirmed by phone');
select tests.eq((select row(on_hand, reserved, available)::text from public.inventory_levels where variant_id = :'variant_a'),
  '(5,3,2)', 'confirmation reserves stock');

-- Overselling: only 2 available, order2 wants 3.
select tests.expect_error(format($$select public.transition_order(%L, 'confirmed')$$, :'order2'), 'INSUFFICIENT_STOCK');
select tests.eq((select status::text from public.orders where id = :'order2'), 'new', 'failed confirmation leaves order unchanged');
select tests.eq((select reserved from public.inventory_levels where variant_id = :'variant_a'), 3, 'failed confirmation reserves nothing');
select tests.expect_error(format($$select public.transition_order(%L, 'cancelled')$$, :'order2'), 'NOTE_REQUIRED');
select public.transition_order(:'order2', 'cancelled', 'Out of stock, customer informed');

-- Direct edits of money/status are not possible.
select tests.expect_error(format($$update public.orders set total_cents = 1 where id = %L$$, :'order1'), 'permission denied');
select tests.expect_error(format($$update public.orders set status = 'delivered' where id = %L$$, :'order1'), 'permission denied');
update public.orders set internal_notes = 'VIP' where id = :'order1';

select tests.login(:'warehouse');
select tests.expect_error(format($$select public.transition_order(%L, 'cancelled', 'x')$$, :'order1'), 'FORBIDDEN');
select public.transition_order(:'order1', 'preparing');
select public.transition_order(:'order1', 'ready_to_ship');
select id as shipment1 from public.create_shipment(:'order1', :'provider_a', 'TRK-0001', 2500) \gset

-- Carrier pickup ships the order (stock leaves), delivery delivers it.
select public.update_shipment_status(:'shipment1', 'picked_up');
select tests.eq((select status::text from public.orders where id = :'order1'), 'shipped', 'carrier pickup ships order');
select tests.eq((select row(on_hand, reserved, available)::text from public.inventory_levels where variant_id = :'variant_a'),
  '(2,0,2)', 'shipping consumes reservation and on-hand');
select public.update_shipment_status(:'shipment1', 'delivered');
select tests.eq((select row(status, payment_status)::text from public.orders where id = :'order1'),
  '(delivered,awaiting_remittance)', 'carrier delivery delivers order; COD becomes receivable');
select tests.expect_error(format($$select public.update_shipment_status(%L, 'in_transit')$$, :'shipment1'), 'SHIPMENT_CLOSED');

-- ---------------------------------------------------------------------------
-- COD reconciliation
-- ---------------------------------------------------------------------------
select tests.expect_error(format($$select public.record_cod_remittance(%L, %L, 'R1', current_date, %L::jsonb)$$,
  :'org_a', :'provider_a', json_build_array(json_build_object('order_id', :'order1', 'collected_cents', 270000))), 'FORBIDDEN');

select tests.login(:'finance');
select tests.expect_error(format($$select public.record_cod_remittance(%L, %L, 'R1', current_date, %L::jsonb)$$,
  :'org_a', :'provider_a', json_build_array(json_build_object('order_id', :'order1', 'collected_cents', 260000))), 'COD_AMOUNT_MISMATCH');
select tests.expect_error(format($$select public.record_cod_remittance(%L, %L, 'R1', current_date, %L::jsonb)$$,
  :'org_a', :'provider_a', json_build_array(json_build_object('order_id', :'order2', 'collected_cents', 0))), 'ORDER_NOT_AWAITING_REMITTANCE');
select net_received_cents as net1 from public.record_cod_remittance(:'org_a', :'provider_a', 'R1', current_date,
  jsonb_build_array(jsonb_build_object('order_id', :'order1', 'collected_cents', 270000, 'fee_cents', 2500))) \gset
select tests.eq(:'net1'::bigint, 267500::bigint, 'net remittance = collected - carrier fees');
select tests.eq((select payment_status::text from public.orders where id = :'order1'), 'settled', 'order settled after remittance');
select tests.expect_error(format($$select public.record_cod_remittance(%L, %L, 'R2', current_date, %L::jsonb)$$,
  :'org_a', :'provider_a', json_build_array(json_build_object('order_id', :'order1', 'collected_cents', 270000))), 'ORDER_NOT_AWAITING_REMITTANCE');
insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (:'org_a', 'advertising', 50000, current_date);
select tests.eq((select count(*) from public.customers), 0::bigint, 'finance cannot read customer PII');

-- ---------------------------------------------------------------------------
-- Refusal -> return inspection
-- ---------------------------------------------------------------------------
select tests.login(:'operator');
select id as order3 from public.create_order(:'org_a', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Youssef Alaoui', 'phone', '+212698765432', 'city', 'Rabat'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'variant_a', 'quantity', 2)))) \gset
select public.transition_order(:'order3', 'confirmed');
select public.transition_order(:'order3', 'preparing');
select public.transition_order(:'order3', 'ready_to_ship');
select public.transition_order(:'order3', 'shipped');
select public.transition_order(:'order3', 'refused', 'Customer refused at door');
select id as return3 from public.returns where order_id = :'order3' \gset
select tests.eq((select row(kind, status)::text from public.returns where id = :'return3'), '(refusal,awaiting_receipt)', 'refusal opens a return');
select tests.eq((select on_hand from public.inventory_levels where variant_id = :'variant_a'), 0, 'refused goods are not back in stock yet');

select tests.login(:'warehouse');
select public.receive_return(:'return3', 2000);
select tests.eq((select row(on_hand, inspection)::text from public.inventory_levels where variant_id = :'variant_a'),
  '(0,2)', 'received return goes to inspection, not sellable stock');
select id as return_item3 from public.return_items where return_id = :'return3' \gset
select public.inspect_return_item(:'return_item3', 'damaged');
select tests.eq((select row(on_hand, damaged, inspection)::text from public.inventory_levels where variant_id = :'variant_a'),
  '(0,2,0)', 'damaged return quarantined');
select tests.eq((select status::text from public.returns where id = :'return3'), 'inspected', 'return inspected when all items decided');

-- Customer return after delivery, restocked as resellable.
select tests.login(:'operator');
select public.transition_order(:'order1', 'returned', 'Wrong size');
select id as return1 from public.returns where order_id = :'order1' \gset
select tests.login(:'warehouse');
select public.receive_return(:'return1');
select id as return_item1 from public.return_items where return_id = :'return1' \gset
select public.inspect_return_item(:'return_item1', 'resellable');
select tests.eq((select row(on_hand, available)::text from public.inventory_levels where variant_id = :'variant_a'),
  '(3,3)', 'resellable return restocked after inspection');
select tests.login(:'finance');
select public.record_refund(:'return1', 267000);
select tests.login(:'operator');
select public.close_return(:'return1');

-- ---------------------------------------------------------------------------
-- Visibility
-- ---------------------------------------------------------------------------
select tests.login(:'viewer');
select tests.eq((select count(*) from public.orders), 3::bigint, 'viewer sees orders');
select tests.eq((select count(*) from public.customers), 0::bigint, 'viewer cannot read customers');
select tests.eq((select count(*) from public.order_contacts), 0::bigint, 'viewer cannot read order contacts');
select tests.eq((select count(*) from public.expenses), 0::bigint, 'viewer cannot read expenses');
select tests.eq((select count(*) from public.audit_logs), 0::bigint, 'viewer cannot read audit log');

select tests.login(:'outsider');
select tests.eq((select count(*) from public.orders), 0::bigint, 'other tenant sees no orders');
select tests.eq((select count(*) from public.inventory_movements), 0::bigint, 'other tenant sees no movements');
select tests.expect_error(format($$select public.transition_order(%L, 'cancelled', 'x')$$, :'order2'), 'FORBIDDEN');
select tests.expect_error(format($$select public.create_order(%L, '{}'::jsonb)$$, :'org_a'), 'FORBIDDEN');

select tests.login(:'owner');
select tests.expect_error(format($$update public.products set organization_id = %L where id = %L$$, :'org_b', :'product_a'), 'TENANT_IMMUTABLE');
select tests.eq((select count(*) > 0 from public.audit_logs where table_name = 'products'), true, 'owner reads audit trail');

reset role;
set local role anon;
select tests.expect_error('select count(*) from public.orders', 'permission denied');
select tests.expect_error(format($$select public.create_organization('x', 'xyz')$$), 'permission denied');
reset role;

-- ---------------------------------------------------------------------------
-- Ledger invariants (as superuser)
-- ---------------------------------------------------------------------------
select tests.eq((
  select count(*) from public.inventory_levels l
  left join lateral (
    select coalesce(sum(m.delta_on_hand), 0)::integer as on_hand, coalesce(sum(m.delta_reserved), 0)::integer as reserved,
           coalesce(sum(m.delta_damaged), 0)::integer as damaged, coalesce(sum(m.delta_inspection), 0)::integer as inspection
    from public.inventory_movements m where m.variant_id = l.variant_id and m.location_id = l.location_id
  ) s on true
  where (l.on_hand, l.reserved, l.damaged, l.inspection) is distinct from (s.on_hand, s.reserved, s.damaged, s.inspection)
), 0::bigint, 'stock levels equal the sum of their movements');

select tests.expect_error('update public.inventory_movements set note = $$x$$', 'IMMUTABLE_RECORD');
select tests.expect_error('delete from public.order_events', 'IMMUTABLE_RECORD');
select tests.eq((select count(*) from public.order_events where order_id = :'order1' and event_type = 'status_changed'), 6::bigint,
  'every status change on order1 is in the timeline');

select app.delete_organization(:'org_b');
select tests.eq((select count(*) from public.organizations where id = :'org_b'), 0::bigint, 'organization deletion cascades past owner guard');
select app.delete_organization(:'org_a');
select tests.eq((select count(*) from public.inventory_movements), 0::bigint, 'full tenant deletion removes ledgers too');

\echo 'ALL DATABASE TESTS PASSED'
rollback;

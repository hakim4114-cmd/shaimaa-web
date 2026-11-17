-- Owner routines (1.0.0): decisions, fund plan, monthly close, stock health. Rolled back.
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

\set owner    '50000000-0000-0000-0000-00000000000a'
\set viewer   '50000000-0000-0000-0000-00000000000e'
insert into auth.users (id) values (:'owner'), (:'viewer');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Routine Test', 'routine-test') \gset
select id as loc from public.inventory_locations where organization_id = :'org' \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'viewer', 'viewer');
insert into public.products (organization_id, name, status) values (:'org', 'Stand', 'active') returning id as product \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents) values (:'org', :'product', 'STD', 29900, 12000) returning id as v1 \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents) values (:'org', :'product', 'STD-NOCOST', 29900) returning id as v2 \gset
select public.adjust_inventory(:'v1', :'loc', 'receipt', 7, 'stock');
select public.adjust_inventory(:'v2', :'loc', 'receipt', 2, 'stock');

select tests.eq((select value_cents from public.stock_health(:'org') where variant_id = :'v1'), 84000::bigint, 'stock value at cost');
select tests.eq((select value_cents from public.stock_health(:'org') where variant_id = :'v2'), null::bigint, 'unknown cost stays unknown, not zero');
select tests.eq((select last_outbound_at from public.stock_health(:'org') where variant_id = :'v1'), null::timestamptz, 'never sold: no outbound movement');

insert into public.owner_decisions (organization_id, week_start, decision, reason, metric)
  values (:'org', date_trunc('week', current_date)::date, 'Stop the TikTok campaign', 'Cost per delivered too high', 'cost per delivered');
select tests.expect_error(format($$insert into public.owner_decisions (organization_id, week_start, decision) values (%L, date_trunc('week', current_date)::date + 2, 'x decision')$$, :'org'), 'owner_decisions_week_start_check');
update public.owner_decisions set outcome = 'worked' where organization_id = :'org';
select tests.eq((select outcome from public.owner_decisions where organization_id = :'org'), 'worked', 'decision outcome recorded later');

insert into public.fund_plan (organization_id, name, percent, position) values (:'org', 'Restock', 50, 1), (:'org', 'Reserve', 20, 2), (:'org', 'Owner pay', 30, 3);
insert into public.monthly_closes (organization_id, month, net_profit_cents, allocations)
  values (:'org', date_trunc('month', current_date)::date, 100000, '[{"name": "Restock", "cents": 50000}]');
select tests.expect_error(format($$insert into public.monthly_closes (organization_id, month, net_profit_cents) values (%L, date_trunc('month', current_date)::date, 1)$$, :'org'), 'monthly_closes_organization_id_month_key');
select tests.expect_error($$update public.monthly_closes set note = 'changed'$$, 'permission denied');

select tests.login(:'viewer');
select tests.eq((select count(*)::int from public.owner_decisions), 0, 'viewer cannot read decisions');
select tests.expect_error(format($$select * from public.stock_health(%L)$$, :'org'), 'FORBIDDEN');

rollback;

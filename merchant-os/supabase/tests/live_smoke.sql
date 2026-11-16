-- Live smoke test for a real Supabase project. Runs inside one transaction and
-- ends with ROLLBACK: it leaves no data behind. Run with scripts/supabase-sql.sh.
begin;
create function pg_temp.login(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true) $$;
create function pg_temp.v(k text) returns uuid language sql as $$ select current_setting('smoke.' || k)::uuid $$;
create function pg_temp.keep(k text, val uuid) returns void language sql as $$ select set_config('smoke.' || k, val::text, true) $$;
create function pg_temp.fails(p_sql text, p_expected text) returns text language plpgsql as $$
begin
  begin execute p_sql; exception when others then
    if sqlerrm like '%' || p_expected || '%' then return 'ok'; end if;
    return 'WRONG ERROR: ' || sqlerrm;
  end;
  return 'DID NOT FAIL';
end $$;
grant execute on all functions in schema pg_temp to authenticated;
create temp table results (n serial, check_name text, outcome text);
grant insert, select on results to authenticated;
grant usage on sequence results_n_seq to authenticated;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'smoke-owner@example.invalid', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'smoke-viewer@example.invalid', 'authenticated', 'authenticated'),
  ('33333333-3333-4333-8333-333333333333', 'smoke-outsider@example.invalid', 'authenticated', 'authenticated');

set local role authenticated;
select pg_temp.login('11111111-1111-4111-8111-111111111111');
select pg_temp.keep('org', (select id from public.create_organization('Smoke Test', 'smoke-test-rollback')));
select pg_temp.keep('loc', (select id from public.inventory_locations where organization_id = pg_temp.v('org')));
insert into public.organization_members (organization_id, user_id, role) values (pg_temp.v('org'), '22222222-2222-4222-8222-222222222222', 'viewer');
insert into public.products (organization_id, name, status) values (pg_temp.v('org'), 'Smoke Djellaba', 'active');
select pg_temp.keep('prod', (select id from public.products where organization_id = pg_temp.v('org')));
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents)
  values (pg_temp.v('org'), pg_temp.v('prod'), 'SMOKE-1', 89000, 35000);
select pg_temp.keep('var', (select id from public.product_variants where sku = 'SMOKE-1'));
select public.adjust_inventory(pg_temp.v('var'), pg_temp.v('loc'), 'receipt', 1, 'smoke');
select pg_temp.keep('o1', (select id from public.create_order(pg_temp.v('org'), jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Smoke Client', 'phone', '+212612345678', 'city', 'Rabat'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', pg_temp.v('var'), 'quantity', 1)), 'shipping_fee_cents', 3000))));
select pg_temp.keep('o2', (select id from public.create_order(pg_temp.v('org'), jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Smoke Client', 'phone', '+212612345678'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', pg_temp.v('var'), 'quantity', 1))))));
insert into results (check_name, outcome) select 'auth.uid() + create_organization (owner)',
  case when exists (select 1 from public.organization_members where user_id = '11111111-1111-4111-8111-111111111111' and role = 'owner') then 'ok' else 'FAIL' end;
insert into results (check_name, outcome) select 'order total from catalog price',
  case when (select total_cents from public.orders where id = pg_temp.v('o1')) = 92000 then 'ok' else 'FAIL' end;
select public.transition_order(pg_temp.v('o1'), 'confirmed');
insert into results (check_name, outcome) select 'overselling blocked', pg_temp.fails(format('select public.transition_order(%L, %L)', pg_temp.v('o2'), 'confirmed'), 'INSUFFICIENT_STOCK');
insert into results (check_name, outcome) select 'invalid transition blocked', pg_temp.fails(format('select public.transition_order(%L, %L)', pg_temp.v('o2'), 'delivered'), 'INVALID_TRANSITION');
insert into results (check_name, outcome) select 'direct money edit blocked', pg_temp.fails(format('update public.orders set total_cents = 1 where id = %L', pg_temp.v('o1')), 'permission denied');
insert into results (check_name, outcome) select 'direct stock edit blocked', pg_temp.fails('update public.inventory_levels set on_hand = 99', 'permission denied');
insert into results (check_name, outcome) select 'stock reserved', case when (select reserved from public.inventory_levels where variant_id = pg_temp.v('var')) = 1 then 'ok' else 'FAIL' end;

-- 0.3.0 order workflow
insert into public.shipping_rates (organization_id, city_id, customer_fee_cents)
  select pg_temp.v('org'), id, 2500 from public.cities where name_fr = 'Casablanca' and organization_id is null;
select pg_temp.keep('o3', (select id from public.create_order(pg_temp.v('org'), jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Smoke Three', 'phone', '+212612345677'),
  'city_id', (select id from public.cities where name_fr = 'Casablanca' and organization_id is null),
  'items', jsonb_build_array(jsonb_build_object('variant_id', pg_temp.v('var'), 'quantity', 1))))));
insert into results (check_name, outcome) select 'shipping fee from city rate',
  case when (select shipping_fee_cents from public.orders where id = pg_temp.v('o3')) = 2500 then 'ok' else 'FAIL' end;
select public.log_call_attempt(pg_temp.v('o3'), 'no_answer');
insert into results (check_name, outcome) select 'call attempt moves order to confirmation pending',
  case when (select status::text from public.orders where id = pg_temp.v('o3')) = 'confirmation_pending' then 'ok' else 'FAIL' end;
insert into results (check_name, outcome) select 'customer history available',
  case when (select orders_total from public.customer_history(pg_temp.v('org'), '+212612345677')) = 1 then 'ok' else 'FAIL' end;

select pg_temp.login('22222222-2222-4222-8222-222222222222');
insert into results (check_name, outcome) select 'viewer sees orders', case when (select count(*) from public.orders) = 3 then 'ok' else 'FAIL' end;
insert into results (check_name, outcome) select 'viewer cannot read customer PII', case when (select count(*) from public.customers) = 0 then 'ok' else 'FAIL' end;
insert into results (check_name, outcome) select 'viewer cannot confirm', pg_temp.fails(format('select public.transition_order(%L, %L, %L)', pg_temp.v('o2'), 'cancelled', 'x'), 'FORBIDDEN');

select pg_temp.login('33333333-3333-4333-8333-333333333333');
insert into results (check_name, outcome) select 'other user sees no orders', case when (select count(*) from public.orders) = 0 then 'ok' else 'FAIL' end;
insert into results (check_name, outcome) select 'other user cannot write into tenant', pg_temp.fails(format('insert into public.products (organization_id, name) values (%L, %L)', pg_temp.v('org'), 'x'), 'row-level security');

reset role;
select check_name, outcome from results order by n;
rollback;

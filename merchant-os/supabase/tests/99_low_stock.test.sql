-- Low stock count (1.9.0). Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual; end if;
  raise notice 'ok - %', p_label;
end; $$;
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;
\set owner '20000000-0000-0000-0000-0000000000e1'
\set other '20000000-0000-0000-0000-0000000000e2'
insert into auth.users (id) values (:'owner'), (:'other');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Low', 'low-stock-test') \gset
select id as loc1 from public.inventory_locations where organization_id = :'org' \gset
insert into public.inventory_locations (organization_id, name) values (:'org', 'Second') returning id as loc2 \gset
insert into public.products (organization_id, name, status) values (:'org', 'P', 'active') returning id as p \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, min_stock_level) values
  (:'org', :'p', 'SPLIT', 1000, 5) returning id as split \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, min_stock_level) values
  (:'org', :'p', 'LOW', 1000, 5) returning id as low \gset
select public.adjust_inventory(:'split', :'loc1', 'receipt', 3, 'a');
select public.adjust_inventory(:'split', :'loc2', 'receipt', 4, 'b');
select public.adjust_inventory(:'low', :'loc1', 'receipt', 2, 'c');
select tests.eq(public.low_stock_count(:'org'), 1, 'stock split across locations is summed per variant (3+4 > 5 is not low)');
select tests.login(:'other');
select tests.eq(public.low_stock_count(:'org'), 0, 'non-members get 0');
rollback;

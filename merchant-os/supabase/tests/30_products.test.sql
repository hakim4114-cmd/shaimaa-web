-- Saving products with variants (0.4.0). Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

create schema tests;
grant usage on schema tests to anon, authenticated;
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
grant execute on all functions in schema tests to anon, authenticated;

\set owner   '20000000-0000-0000-0000-00000000000a'
\set viewer  '20000000-0000-0000-0000-00000000000e'
insert into auth.users (id) values (:'owner'), (:'viewer');

set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Catalog Test', 'catalog-test') \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'viewer', 'viewer');

select public.save_product(:'org', jsonb_build_object(
  'name', 'Djellaba Amina', 'status', 'active', 'category', 'Djellabas',
  'options', jsonb_build_array(jsonb_build_object('name', 'Size', 'values', jsonb_build_array('S', 'M'))),
  'variants', jsonb_build_array(
    jsonb_build_object('sku', 'AMN-S', 'option_values', jsonb_build_object('Size', 'S'), 'price_cents', 89000, 'cost_cents', 35000, 'min_stock_level', 2),
    jsonb_build_object('sku', 'AMN-M', 'option_values', jsonb_build_object('Size', 'M'), 'price_cents', 89000, 'cost_cents', null)
  ))) as product \gset

select tests.eq((select count(*) from public.product_variants where product_id = :'product'), 2::bigint, 'product saved with its variants');
select tests.eq((select title from public.product_variants where sku = 'AMN-S'), 'S', 'variant title generated from options');
select tests.eq((select cost_cents is null from public.product_variants where sku = 'AMN-M'), true, 'unknown cost stays NULL');
select tests.eq((select c.name from public.products p join public.product_categories c on c.id = p.category_id where p.id = :'product'), 'Djellabas', 'category created on the fly');
select tests.eq((select jsonb_array_length(options) from public.products where id = :'product'), 1, 'options stored on the product');

-- Same category name in another case reuses it.
select public.save_product(:'org', jsonb_build_object('name', 'Kaftan', 'category', 'djellabas',
  'variants', jsonb_build_array(jsonb_build_object('sku', 'KFT-1', 'price_cents', 120000)))) as product2 \gset
select tests.eq((select count(*) from public.product_categories where organization_id = :'org'), 1::bigint, 'category matched case-insensitively');
select tests.eq((select status::text from public.products where id = :'product2'), 'draft', 'new products default to draft');

-- Edit: change price, drop variant M (archived, not deleted), add L.
select id as v_s from public.product_variants where sku = 'AMN-S' \gset
select public.save_product(:'org', jsonb_build_object('id', :'product', 'name', 'Djellaba Amina', 'status', 'active',
  'variants', jsonb_build_array(
    jsonb_build_object('id', :'v_s', 'sku', 'AMN-S', 'option_values', jsonb_build_object('Size', 'S'), 'price_cents', 95000, 'cost_cents', 35000),
    jsonb_build_object('sku', 'AMN-L', 'option_values', jsonb_build_object('Size', 'L'), 'price_cents', 95000)
  )));
select tests.eq((select price_cents from public.product_variants where id = :'v_s'), 95000::bigint, 'existing variant updated in place');
select tests.eq((select status::text from public.product_variants where sku = 'AMN-M'), 'archived', 'removed variant archived, not deleted');
select tests.eq((select count(*) from public.product_variants where product_id = :'product' and status = 'active'), 2::bigint, 'new variant added');

-- Errors
select tests.expect_error(format($$select public.save_product(%L, %L::jsonb)$$, :'org',
  json_build_object('name', 'X', 'variants', json_build_array(json_build_object('sku', 'AMN-S', 'price_cents', 1)))), 'product_variants_organization_id_sku_key');
select tests.expect_error(format($$select public.save_product(%L, '{"name":"X","variants":[]}'::jsonb)$$, :'org'), 'VARIANTS_REQUIRED');
select tests.expect_error(format($$select public.save_product(%L, %L::jsonb)$$, :'org',
  json_build_object('name', 'X', 'variants', json_build_array(json_build_object('sku', 'X-1', 'price_cents', 1, 'status', 'archived')))), 'ACTIVE_VARIANT_REQUIRED');
select tests.expect_error(format($$select public.save_product(%L, %L::jsonb)$$, :'org',
  json_build_object('name', 'X', 'variants', json_build_array(json_build_object('sku', 'bad sku!', 'price_cents', 1)))), 'product_variants_sku_check');
select tests.expect_error(format($$select public.save_product(%L, %L::jsonb)$$, :'org',
  json_build_object('name', '', 'variants', json_build_array(json_build_object('sku', 'X-2', 'price_cents', 1)))), 'products_name_check');
select tests.eq((select count(*) from public.products where organization_id = :'org'), 2::bigint, 'failed saves leave nothing behind');

select tests.login(:'viewer');
select tests.expect_error(format($$select public.save_product(%L, %L::jsonb)$$, :'org',
  json_build_object('name', 'X', 'variants', json_build_array(json_build_object('sku', 'X-3', 'price_cents', 1)))), 'FORBIDDEN');
reset role;

\echo 'PRODUCT TESTS PASSED'
rollback;
